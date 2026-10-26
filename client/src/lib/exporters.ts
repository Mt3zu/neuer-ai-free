import type { Conversation } from "./types";

export function safeConversation(conversation: Conversation) {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages.map(({ id, role, content, createdAt, provider, model, error }) => ({ id, role, content, createdAt, provider, model, error })),
  };
}

export function downloadConversation(conversation: Conversation, format: "txt" | "md" | "json") {
  const safe = safeConversation(conversation);
  let body = "";
  let mime = "text/plain";
  let extension = format;
  if (format === "json") {
    body = JSON.stringify(safe, null, 2);
    mime = "application/json";
  } else if (format === "md") {
    body = `# ${safe.title}\n\n${safe.messages.map((message) => `## ${message.role === "user" ? "المستخدم" : "Neuer AI"}\n\n${message.content}`).join("\n\n")}`;
    mime = "text/markdown";
  } else {
    body = `${safe.title}\n\n${safe.messages.map((message) => `${message.role === "user" ? "المستخدم" : "Neuer AI"}:\n${message.content}`).join("\n\n")}`;
  }
  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `neuer-${safe.title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 48) || "conversation"}.${extension}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function parseBackup(file: File): Promise<Conversation> {
  if (file.size > 5 * 1024 * 1024) throw new Error("النسخة أكبر من الحد المسموح به وهو 5MB.");
  const parsed: unknown = JSON.parse(await file.text());
  if (!parsed || typeof parsed !== "object") throw new Error("بنية النسخة غير صالحة.");
  const value = parsed as Partial<Conversation>;
  if (typeof value.title !== "string" || !Array.isArray(value.messages)) throw new Error("ملف النسخة لا يحتوي على محادثة صالحة.");
  const messages = value.messages.filter((message): message is Conversation["messages"][number] => {
    return Boolean(message && typeof message === "object" && "role" in message && "content" in message && typeof (message as { content?: unknown }).content === "string");
  });
  if (messages.length !== value.messages.length) throw new Error("تحتوي النسخة على رسائل غير صالحة.");
  return {
    id: typeof value.id === "string" ? value.id : `imported_${crypto.randomUUID()}`,
    title: value.title.slice(0, 120),
    messages,
    createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
  };
}
