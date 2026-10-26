import { describe, expect, it, vi } from "vitest";
import { discoverModels } from "./providers";

describe("provider model discovery", () => {
  it("keeps only zero-price OpenRouter models", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [
      { id: "free/model", name: "Free", pricing: { prompt: "0", completion: "0" } },
      { id: "paid/model", name: "Paid", pricing: { prompt: "0.1", completion: "0.2" } },
    ] }), { status: 200, headers: { "content-type": "application/json" } })));
    const models = await discoverModels({ id: "openrouter", baseUrl: "https://openrouter.ai/api/v1", apiKey: "session-only" });
    expect(models.map((model) => model.id)).toEqual(["free/model"]);
  });

  it("turns provider quota failures into a clear error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("quota", { status: 429 })));
    await expect(discoverModels({ id: "groq", baseUrl: "https://api.groq.com/openai/v1", apiKey: "session-only" })).rejects.toThrow("حصة");
  });
});
