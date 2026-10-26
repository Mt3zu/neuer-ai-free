import type { ChatMessage, ModelInfo, ProviderConfig, ProviderId } from "./types";
import { DEFAULT_PROVIDER_URLS } from "./types";

export const providerMeta: Record<ProviderId, { name: string; mode: "local" | "cloud"; docs: string; note: string }> = {
  ollama: {
    name: "Ollama",
    mode: "local",
    docs: "https://docs.ollama.com/api",
    note: "استدلال محلي على جهازك. لا يغادر النص جهازك عند نجاح الاتصال المحلي.",
  },
  openrouter: {
    name: "OpenRouter",
    mode: "cloud",
    docs: "https://openrouter.ai/docs/quickstart",
    note: "مسار سحابي اختياري. لا تظهر النماذج المجانية إلا بعد جلبها من API.",
  },
  groq: {
    name: "Groq",
    mode: "cloud",
    docs: "https://console.groq.com/docs",
    note: "خطة مجانية بحدود وحصص متغيرة؛ لا يوجد انتقال تلقائي إلى نموذج مدفوع.",
  },
};

export function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: init?.signal });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) throw new Error("المفتاح غير صالح أو غير مصرح لهذا المسار.");
    if (response.status === 429) throw new Error("تم بلوغ حصة المزوّد. أوقفنا الطلب ولم ننتقل إلى مسار مدفوع.");
    throw new Error(`استجاب المزوّد بالرمز ${response.status}${text ? `: ${text.slice(0, 160)}` : ""}`);
  }
  return response;
}

function toOpenAIMessage(message: ChatMessage) {
  return { role: message.role, content: message.content };
}

export async function discoverModels(config: ProviderConfig): Promise<ModelInfo[]> {
  const baseUrl = normalizeBaseUrl(config.baseUrl || DEFAULT_PROVIDER_URLS[config.id]);
  if (config.id === "ollama") {
    const response = await request(`${baseUrl}/api/tags`);
    const body = (await response.json()) as { models?: Array<{ name: string; size?: number }> };
    return (body.models ?? []).map((model) => ({
      id: model.name,
      name: model.name,
      provider: "ollama",
      free: true,
      source: "live",
      capabilities: ["محادثة", "محلي"],
    }));
  }

  const response = await request(`${baseUrl}/models`, {
    headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined,
  });
  const body = (await response.json()) as { data?: Array<{ id: string; name?: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }> };
  const models = body.data ?? [];
  if (config.id === "openrouter") {
    return models
      .filter((model) => Number(model.pricing?.prompt ?? "1") === 0 && Number(model.pricing?.completion ?? "1") === 0)
      .map((model) => ({
        id: model.id,
        name: model.name || model.id,
        provider: config.id,
        context: model.context_length,
        free: true,
        source: "live",
        capabilities: ["محادثة", "مجاني ضمن شروط المزوّد"],
      }));
  }
  return models.map((model) => ({
    id: model.id,
    name: model.name || model.id,
    provider: config.id,
    context: model.context_length,
    free: true,
    source: "live",
    capabilities: ["محادثة", "مجاني ضمن الحصة"],
  }));
}

export async function chatWithProvider(
  config: ProviderConfig,
  model: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  signal: AbortSignal,
) {
  const baseUrl = normalizeBaseUrl(config.baseUrl || DEFAULT_PROVIDER_URLS[config.id]);
  if (config.id === "ollama") {
    const response = await request(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: messages.map(toOpenAIMessage), stream: true }),
      signal,
    });
    if (!response.body) throw new Error("لم يُرجع Ollama بثًا قابلًا للقراءة.");
    await readNdjson(response.body, (item) => {
      const text = (item as { message?: { content?: string } }).message?.content;
      if (text) onChunk(text);
    });
    return;
  }

  const response = await request(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey ?? ""}` },
    body: JSON.stringify({ model, messages: messages.map(toOpenAIMessage), stream: true }),
    signal,
  });
  if (!response.body) throw new Error("لم يُرجع المزوّد بثًا قابلًا للقراءة.");
  await readSse(response.body, (item) => {
    const text = (item as { choices?: Array<{ delta?: { content?: string } }> }).choices?.[0]?.delta?.content;
    if (text) onChunk(text);
  });
}

async function readNdjson(body: ReadableStream<Uint8Array>, onItem: (item: unknown) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try { onItem(JSON.parse(line)); } catch { /* ignore incomplete provider line */ }
    }
    if (done) break;
  }
  if (buffer.trim()) {
    try { onItem(JSON.parse(buffer)); } catch { /* ignore trailing provider line */ }
  }
}

async function readSse(body: ReadableStream<Uint8Array>, onItem: (item: unknown) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const data = event.split("\n").find((line) => line.startsWith("data:"))?.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try { onItem(JSON.parse(data)); } catch { /* ignore malformed event */ }
    }
    if (done) break;
  }
}

export async function checkProvider(config: ProviderConfig) {
  const models = await discoverModels(config);
  return { models, message: `${models.length} نموذج متاح حاليًا` };
}
