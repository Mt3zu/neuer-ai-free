export type Locale = "ar" | "en";
export type Theme = "dark" | "light";
export type ProviderId = "ollama" | "openrouter" | "groq";
export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  provider?: ProviderId;
  model?: string;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  theme: Theme;
  locale: Locale;
  saveHistory: boolean;
  sidebarCollapsed: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderId;
  context?: number;
  free: boolean;
  capabilities: string[];
  source: "live" | "catalog";
}

export interface ProviderConfig {
  id: ProviderId;
  baseUrl: string;
  apiKey?: string;
}

export interface ProviderState {
  connected: boolean;
  checking: boolean;
  message: string;
  models: ModelInfo[];
  lastChecked?: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  locale: "ar",
  saveHistory: true,
  sidebarCollapsed: false,
};

export const DEFAULT_PROVIDER_URLS: Record<ProviderId, string> = {
  ollama: "http://localhost:11434",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
};

export function newId(prefix = "id") {
  return `${prefix}_${crypto.randomUUID()}`;
}
