import type { AppSettings, Conversation } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const DB_NAME = "neuer-ai-local";
const DB_VERSION = 1;
const CONVERSATIONS = "conversations";
const SETTINGS = "settings";
const SETTINGS_KEY = "app";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONVERSATIONS)) {
        db.createObjectStore(CONVERSATIONS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SETTINGS)) {
        db.createObjectStore(SETTINGS);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable"));
  });
}

function localFallback<T>(key: string, value?: T): T | undefined {
  try {
    if (value !== undefined) localStorage.setItem(key, JSON.stringify(value));
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export async function loadConversations(): Promise<Conversation[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(CONVERSATIONS, "readonly").objectStore(CONVERSATIONS).getAll();
      req.onsuccess = () => resolve((req.result as Conversation[]).sort((a, b) => b.updatedAt - a.updatedAt));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return localFallback<Conversation[]>("neuer-ai-conversations") ?? [];
  }
}

export async function saveConversation(conversation: Conversation) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(CONVERSATIONS, "readwrite").objectStore(CONVERSATIONS).put(conversation);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const current = localFallback<Conversation[]>("neuer-ai-conversations") ?? [];
    const next = current.filter((item) => item.id !== conversation.id).concat(conversation);
    localFallback("neuer-ai-conversations", next);
  }
}

export async function saveConversations(conversations: Conversation[]) {
  await Promise.all(conversations.map(saveConversation));
}

export async function deleteConversation(id: string) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(CONVERSATIONS, "readwrite").objectStore(CONVERSATIONS).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const current = localFallback<Conversation[]>("neuer-ai-conversations") ?? [];
    localFallback("neuer-ai-conversations", current.filter((item) => item.id !== id));
  }
}

export async function clearLocalData() {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([CONVERSATIONS, SETTINGS], "readwrite");
      tx.objectStore(CONVERSATIONS).clear();
      tx.objectStore(SETTINGS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    try {
      localStorage.removeItem("neuer-ai-conversations");
      localStorage.removeItem("neuer-ai-settings");
    } catch {
      // Storage may be disabled by the browser.
    }
  }
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const db = await openDb();
    const stored = await new Promise<AppSettings | undefined>((resolve, reject) => {
      const req = db.transaction(SETTINGS, "readonly").objectStore(SETTINGS).get(SETTINGS_KEY);
      req.onsuccess = () => resolve(req.result as AppSettings | undefined);
      req.onerror = () => reject(req.error);
    });
    return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  } catch {
    return { ...DEFAULT_SETTINGS, ...(localFallback<Partial<AppSettings>>("neuer-ai-settings") ?? {}) };
  }
}

export async function saveSettings(settings: AppSettings) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(SETTINGS, "readwrite").objectStore(SETTINGS).put(settings, SETTINGS_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    localFallback("neuer-ai-settings", settings);
  }
}
