import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { invokeLLM, type Message } from "./llm";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const messages: unknown[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
      if (messages.length === 0 || messages.length > 40) {
        return res.status(400).json({ error: "أرسل رسالة واحدة على الأقل." });
      }
      const safeMessages: Message[] = messages
        .filter((item: unknown): item is { role: Message["role"]; content: string } => Boolean(item && typeof item === "object" && "content" in item && typeof (item as { content?: unknown }).content === "string"))
        .map((item) => ({ role: item.role, content: item.content.slice(0, 30_000) }));
      const result = await invokeLLM({
        messages: [
          { role: "system", content: "أنت Neuer AI، مساعد عربي واضح وعملي. أجب بلغة المستخدم، وكن مفيدًا ومختصرًا دون طلب أي مفتاح API أو إعداد من المستخدم." },
          ...safeMessages,
        ],
        maxTokens: 1400,
      });
      const content = result.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) return res.status(502).json({ error: "لم يصل رد صالح من المساعد. أعد المحاولة." });
      return res.json({ content });
    } catch (error) {
      console.error("Built-in AI error", error);
      return res.status(503).json({ error: "المساعد المدمج غير متاح مؤقتًا. أعد المحاولة بعد لحظات." });
    }
  });
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
