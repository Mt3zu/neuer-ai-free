import { useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import {
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cloud,
  Copy,
  Database,
  Download,
  FileText,
  Globe2,
  HardDrive,
  Info,
  LayoutPanelLeft,
  Loader2,
  Menu,
  Mic,
  MessageSquarePlus,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Upload,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { chatWithProvider, checkProvider, discoverModels, providerMeta } from "@/lib/providers";
import { downloadConversation, parseBackup } from "@/lib/exporters";
import { extractLocalFileText, searchWikipedia, speakText, startSpeechRecognition, stopSpeaking, type WikiResult } from "@/lib/browser-features";
import { clearLocalData, deleteConversation, loadConversations, loadSettings, saveConversation, saveSettings } from "@/lib/storage";
import type { AppSettings, ChatMessage, Conversation, ModelInfo, ProviderConfig, ProviderId } from "@/lib/types";
import { DEFAULT_PROVIDER_URLS, newId } from "@/lib/types";

const labels = {
  ar: {
    nav: "مساحة العمل",
    newChat: "محادثة جديدة",
    search: "ابحث في السجل",
    recent: "الأخيرة",
    noChats: "لا توجد محادثات بعد",
    start: "ابدأ مساحة تفكير جديدة",
    startSub: "اكتب رسالتك مباشرة. Neuer AI جاهز ويعمل دون مفتاح أو إعداد.",
    providers: "المزوّدون",
    models: "مستكشف النماذج",
    privacy: "الخصوصية والتخزين",
    docs: "التوثيق",
    settings: "الإعدادات",
    message: "اكتب رسالتك هنا…",
    send: "إرسال",
    stop: "إيقاف",
    local: "محلي",
    cloud: "سحابي",
    connected: "متصل",
    disconnected: "غير متصل",
    check: "فحص الاتصال",
    checking: "جارٍ الفحص…",
    chooseModel: "اختر نموذجًا",
    provider: "المزوّد",
    model: "النموذج",
    thinking: "وضع التفكير",
    available: "متاح",
    unavailable: "غير متاح",
    privacyTitle: "بياناتك تحت تحكمك",
    privacyText: "المحادثات تُحفظ محليًا في متصفحك. مفاتيح API تبقى في ذاكرة الجلسة ولا تدخل إلى IndexedDB أو النسخ الاحتياطية.",
    clearData: "مسح كل البيانات المحلية",
    clearConfirm: "سيحذف هذا كل المحادثات والإعدادات المحلية نهائيًا. هل تريد المتابعة؟",
    history: "حفظ سجل المحادثات",
    appearance: "المظهر",
    language: "اللغة",
    dark: "داكن",
    light: "فاتح",
    arabic: "العربية",
    english: "English",
    copy: "نسخ",
    copied: "تم النسخ",
    regenerate: "إعادة التوليد",
    edit: "تعديل الرسالة",
    delete: "حذف",
    rename: "إعادة تسمية",
    export: "تصدير",
    import: "استيراد",
    exportTxt: "نص TXT",
    exportMd: "Markdown",
    exportJson: "نسخة JSON",
    noProvider: "لا يوجد اتصال جاهز",
    addKey: "أدخل مفتاحًا في الإعدادات للاتصال السحابي.",
    ollamaHint: "ثبّت Ollama وشغّله ثم نزّل نموذجًا محليًا.",
    freePath: "مسار مجاني موثّق ضمن الحصة",
    status: "الحالة",
    source: "المصدر",
    live: "بيانات حيّة",
    catalog: "تعريف فقط",
    docsTitle: "تشغيل Neuer AI بوضوح",
    docsText: "Neuer AI لا يضمّن نموذجًا مدفوعًا ولا مفتاحًا مشتركًا. المسار المحلي مع Ollama لا يحتاج اشتراكًا، بينما OpenRouter وGroq يحتاجان مفتاح المستخدم وتخضع المجانية لشروط وحصص كل مزوّد.",
    learnMore: "فتح الوثائق",
  },
  en: {
    nav: "Workspace", newChat: "New conversation", search: "Search history", recent: "Recent", noChats: "No conversations yet", start: "Start a new thinking space", startSub: "Write your message directly. Neuer AI is ready with no key or setup.", providers: "Providers", models: "Model explorer", privacy: "Privacy & storage", docs: "Documentation", settings: "Settings", message: "Write your message…", send: "Send", stop: "Stop", local: "Local", cloud: "Cloud", connected: "Connected", disconnected: "Offline", check: "Check connection", checking: "Checking…", chooseModel: "Choose a model", provider: "Provider", model: "Model", thinking: "Thinking mode", available: "Available", unavailable: "Unavailable", privacyTitle: "Your data stays under your control", privacyText: "Conversations are stored locally in your browser. API keys stay in session memory and never enter IndexedDB or backups.", clearData: "Clear all local data", clearConfirm: "This permanently deletes local conversations and settings. Continue?", history: "Save conversation history", appearance: "Appearance", language: "Language", dark: "Dark", light: "Light", arabic: "العربية", english: "English", copy: "Copy", copied: "Copied", regenerate: "Regenerate", edit: "Edit message", delete: "Delete", rename: "Rename", export: "Export", import: "Import", exportTxt: "TXT", exportMd: "Markdown", exportJson: "JSON backup", noProvider: "No provider connected", addKey: "Add a key in settings to connect a cloud provider.", ollamaHint: "Install and run Ollama, then download a local model.", freePath: "Free path within provider limits", status: "Status", source: "Source", live: "Live data", catalog: "Definition only", docsTitle: "Run Neuer AI with clarity", docsText: "Neuer AI embeds no paid model and no shared key. The Ollama path needs no subscription; OpenRouter and Groq require your own key and remain subject to each provider's terms and quotas.", learnMore: "Open docs",
  },
} as const;

type Panel = "none" | "providers" | "models" | "privacy" | "docs" | "tools";

function makeConversation(): Conversation {
  const now = Date.now();
  return { id: newId("chat"), title: "محادثة جديدة", messages: [], createdAt: now, updatedAt: now };
}

function formatDate(timestamp: number, locale: "ar" | "en") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", { month: "short", day: "numeric" }).format(timestamp);
}

function ProviderBadge({ provider, compact = false }: { provider: ProviderId; compact?: boolean }) {
  const meta = providerMeta[provider];
  return <span className={`provider-badge ${meta.mode} ${compact ? "compact" : ""}`}><span className="provider-dot" />{meta.name}</span>;
}

function MessageBubble({ message, onCopy, onDelete, onEdit, onSpeak }: { message: ChatMessage; onCopy: () => void; onDelete: () => void; onEdit: () => void; onSpeak: () => void }) {
  const isUser = message.role === "user";
  return (
    <article className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className={`message-avatar ${isUser ? "user-avatar" : "assistant-avatar"}`}>{isUser ? "أنت" : <Sparkles size={15} />}</div>
      <div className="message-stack">
        <div className="message-meta"><strong>{isUser ? "أنت" : "Neuer AI"}</strong>{message.provider && <ProviderBadge provider={message.provider} compact />}<span>{new Intl.DateTimeFormat("ar-SA", { hour: "2-digit", minute: "2-digit" }).format(message.createdAt)}</span></div>
        <div className={`message-card ${message.error ? "message-error" : ""}`}>
          {message.error ? <p>{message.error}</p> : <div className="markdown-body"><Streamdown>{message.content || "…"}</Streamdown></div>}
        </div>
        <div className="message-actions">
          <button onClick={onCopy} aria-label="نسخ"><Copy size={13} /> نسخ</button>
          {!isUser && !message.error && <button onClick={onSpeak} aria-label="قراءة صوتية"><Volume2 size={13} /> صوت</button>}
          {isUser && <button onClick={onEdit} aria-label="تعديل"><Pencil size={13} /> تعديل</button>}
          <button onClick={onDelete} aria-label="حذف"><Trash2 size={13} /> حذف</button>
        </div>
      </div>
    </article>
  );
}

function PanelShell({ title, icon, onClose, children }: { title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return <aside className="side-panel"><div className="panel-head"><div className="panel-title"><span className="panel-icon">{icon}</span><div><h2>{title}</h2><p>إعدادات Neuer AI</p></div></div><button className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div><div className="panel-body">{children}</div></aside>;
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ theme: "dark", locale: "ar", saveHistory: true, sidebarCollapsed: false });
  const [panel, setPanel] = useState<Panel>("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("neuer");
  const [selectedModels, setSelectedModels] = useState<Partial<Record<ProviderId, string>>>({});
  const [providerConfigs, setProviderConfigs] = useState<Record<ProviderId, ProviderConfig>>({
    neuer: { id: "neuer", baseUrl: DEFAULT_PROVIDER_URLS.neuer },
    ollama: { id: "ollama", baseUrl: DEFAULT_PROVIDER_URLS.ollama },
    openrouter: { id: "openrouter", baseUrl: DEFAULT_PROVIDER_URLS.openrouter },
    groq: { id: "groq", baseUrl: DEFAULT_PROVIDER_URLS.groq },
  });
  const [providerStates, setProviderStates] = useState<Record<ProviderId, { connected: boolean; checking: boolean; message: string; models: ModelInfo[] }>>({
    neuer: { connected: true, checking: false, message: "جاهز دون إعداد", models: [{ id: "neuer-default", name: "Neuer AI · تلقائي", provider: "neuer", free: true, source: "live", capabilities: ["محادثة", "عربي", "بلا مفتاح"] }] },
    ollama: { connected: false, checking: false, message: "لم يُفحص بعد", models: [] },
    openrouter: { connected: false, checking: false, message: "لم يُفحص بعد", models: [] },
    groq: { connected: false, checking: false, message: "لم يُفحص بعد", models: [] },
  });
  const [isSending, setIsSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [toolsQuery, setToolsQuery] = useState("");
  const [wikiResults, setWikiResults] = useState<WikiResult[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const t = labels[settings.locale];

  useEffect(() => {
    Promise.all([loadConversations(), loadSettings()]).then(([loaded, loadedSettings]) => {
      setConversations(loaded);
      const latest = loaded[0];
      const latestEndedWithProviderError = Boolean(latest?.messages.at(-1)?.error);
      setActiveId(latestEndedWithProviderError ? null : (latest?.id ?? null));
      setSettings({ ...loadedSettings, sidebarCollapsed: window.innerWidth < 821 ? true : loadedSettings.sidebarCollapsed });
    }).catch(() => toast.error("تعذر استعادة البيانات المحلية."));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    document.documentElement.lang = settings.locale;
    document.documentElement.dir = "ltr";
    document.body.dir = settings.locale === "ar" ? "rtl" : "ltr";
    saveSettings(settings).catch(() => undefined);
  }, [settings]);

  const activeConversation = conversations.find((item) => item.id === activeId) ?? null;
  const visibleConversations = useMemo(() => conversations.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.messages.some((messageItem) => messageItem.content.toLowerCase().includes(searchQuery.toLowerCase()))), [conversations, searchQuery]);
  const currentModels = providerStates[selectedProvider].models;
  const selectedModel = selectedModels[selectedProvider] ?? currentModels[0]?.id ?? "";

  const updateConversation = async (conversation: Conversation) => {
    setConversations((current) => current.some((item) => item.id === conversation.id) ? current.map((item) => item.id === conversation.id ? conversation : item).sort((a, b) => b.updatedAt - a.updatedAt) : [conversation, ...current]);
    if (settings.saveHistory) await saveConversation(conversation);
  };

  const openNewChat = () => {
    const next = makeConversation();
    setConversations((current) => [next, ...current]);
    setActiveId(next.id);
    setPanel("none");
  };

  const checkConnection = async (provider: ProviderId) => {
    setProviderStates((current) => ({ ...current, [provider]: { ...current[provider], checking: true, message: t.checking } }));
    try {
      const result = await checkProvider(providerConfigs[provider]);
      setProviderStates((current) => ({ ...current, [provider]: { connected: true, checking: false, message: result.message, models: result.models } }));
      setSelectedModels((current) => ({ ...current, [provider]: current[provider] ?? result.models[0]?.id }));
      toast.success(`${providerMeta[provider].name}: ${result.message}`);
    } catch (error) {
      setProviderStates((current) => ({ ...current, [provider]: { ...current[provider], connected: false, checking: false, message: error instanceof Error ? error.message : "تعذر الاتصال" } }));
      toast.error(error instanceof Error ? error.message : "تعذر الاتصال بالمزوّد");
    }
  };

  const patchAssistant = (conversationId: string, assistantId: string, patch: Partial<ChatMessage>) => {
    setConversations((current) => {
      const existing = current.find((item) => item.id === conversationId);
      if (!existing) return current;
      const next = { ...existing, updatedAt: Date.now(), messages: existing.messages.map((item) => item.id === assistantId ? { ...item, ...patch } : item) };
      if (settings.saveHistory) void saveConversation(next);
      return current.map((item) => item.id === conversationId ? next : item).sort((a, b) => b.updatedAt - a.updatedAt);
    });
  };

  const submitMessage = async (value?: string, regenerate = false) => {
    const text = (value ?? message).trim();
    if (!text || isSending) return;
    const base = activeConversation ?? makeConversation();
    const history = regenerate ? base.messages.slice(0, -1) : base.messages;
    const userMessage: ChatMessage = { id: newId("msg"), role: "user", content: text, createdAt: Date.now() };
    const assistantMessage: ChatMessage = { id: newId("msg"), role: "assistant", content: "", createdAt: Date.now(), provider: selectedProvider, model: selectedModel };
    const draft: Conversation = { ...base, title: base.messages.length === 0 ? text.slice(0, 54) : base.title, updatedAt: Date.now(), messages: [...history, userMessage, assistantMessage] };
    setActiveId(base.id);
    setMessage("");
    setIsSending(true);
    abortRef.current = new AbortController();
    await updateConversation(draft);
    try {
      const config = providerConfigs[selectedProvider];
      if (!selectedModel) throw new Error(selectedProvider === "ollama" ? "لم يتم العثور على نموذج محلي. افحص اتصال Ollama أولًا." : t.addKey);
      if (selectedProvider !== "neuer" && providerMeta[selectedProvider].mode === "cloud" && !config.apiKey) throw new Error(t.addKey);
      let output = "";
      await chatWithProvider(config, selectedModel, [...history, userMessage], (chunk) => {
        output += chunk;
        void patchAssistant(base.id, assistantMessage.id, { content: output });
      }, abortRef.current.signal);
      if (!output.trim()) throw new Error("أعاد المزوّد ردًا فارغًا.");
      await patchAssistant(base.id, assistantMessage.id, { content: output, error: undefined });
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === "AbortError";
      await patchAssistant(base.id, assistantMessage.id, { content: aborted ? "تم إيقاف التوليد." : "", error: aborted ? undefined : (error instanceof Error ? error.message : "حدث خطأ غير متوقع.") });
    } finally {
      setIsSending(false);
      abortRef.current = null;
    }
  };

  const stopGeneration = () => abortRef.current?.abort();

  const renameConversation = async () => {
    if (!activeConversation) return;
    const title = window.prompt("اسم المحادثة", activeConversation.title)?.trim();
    if (!title) return;
    await updateConversation({ ...activeConversation, title: title.slice(0, 120), updatedAt: Date.now() });
  };

  const editMessage = async (item: ChatMessage) => {
    if (!activeConversation || item.role !== "user") return;
    const edited = window.prompt("عدّل رسالتك ثم اضغط موافق", item.content)?.trim();
    if (!edited || edited === item.content) return;
    const index = activeConversation.messages.findIndex((messageItem) => messageItem.id === item.id);
    const nextMessages = activeConversation.messages.slice(0, index).concat({ ...item, content: edited }, activeConversation.messages.slice(index + 1));
    await updateConversation({ ...activeConversation, messages: nextMessages, updatedAt: Date.now() });
    toast.success("تم تعديل الرسالة. يمكنك إعادة التوليد الآن.");
  };

  const deleteMessage = async (item: ChatMessage) => {
    if (!activeConversation) return;
    await updateConversation({ ...activeConversation, messages: activeConversation.messages.filter((messageItem) => messageItem.id !== item.id), updatedAt: Date.now() });
  };

  const deleteActive = async () => {
    if (!activeConversation) return;
    await deleteConversation(activeConversation.id);
    const next = conversations.filter((item) => item.id !== activeConversation.id);
    setConversations(next);
    setActiveId(next[0]?.id ?? null);
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t.copied);
  };

  const readAloud = (text: string) => {
    try { speakText(text, settings.locale === "ar" ? "ar-SA" : "en-US"); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تشغيل الصوت."); }
  };

  const toggleListening = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    try {
      recognitionRef.current = startSpeechRecognition(settings.locale === "ar" ? "ar-SA" : "en-US", (text) => setMessage(text), () => { setIsListening(false); recognitionRef.current = null; });
      setIsListening(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : "التعرف على الكلام غير متاح."); }
  };

  const importLocalFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await extractLocalFileText(file);
      if (!text) throw new Error("لم يتم العثور على نص قابل للقراءة في الملف.");
      setMessage(`اقرأ الملف التالي ثم ساعدني في تحليله:\n\n[${file.name}]\n${text}`);
      toast.success(`تم استخراج النص من ${file.name} محليًا.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر قراءة الملف."); }
  };

  const runWikiSearch = async () => {
    if (!toolsQuery.trim()) return;
    setToolsLoading(true);
    try { setWikiResults(await searchWikipedia(toolsQuery.trim(), settings.locale)); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر البحث."); }
    finally { setToolsLoading(false); }
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = await parseBackup(file);
      await updateConversation(imported);
      setActiveId(imported.id);
      toast.success("تم استيراد المحادثة بعد فحص بنيتها.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ملف النسخة غير صالح.");
    }
  };

  const clearData = async () => {
    if (!window.confirm(t.clearConfirm)) return;
    await clearLocalData();
    setConversations([]);
    setActiveId(null);
    setSettings((current) => ({ ...current, saveHistory: true }));
    toast.success("تم مسح البيانات المحلية.");
  };

  const updateProvider = (provider: ProviderId, patch: Partial<ProviderConfig>) => setProviderConfigs((current) => ({ ...current, [provider]: { ...current[provider], ...patch } }));

  return (
    <div className={`app-shell ${settings.sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand-lockup"><div className="brand-mark"><span>N</span><i /></div><div><strong>Neuer</strong><small>AI / نوير</small></div></div>
        <button className="new-chat-button" onClick={openNewChat}><Plus size={17} />{t.newChat}<span>⌘ K</span></button>
        <div className="sidebar-search"><Search size={15} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t.search} aria-label={t.search} /></div>
        <div className="sidebar-section-label">{t.recent}<span>{visibleConversations.length}</span></div>
        <div className="conversation-list">
          {visibleConversations.length === 0 ? <div className="empty-sidebar"><Archive size={20} /><p>{t.noChats}</p></div> : visibleConversations.map((conversation) => <button key={conversation.id} onClick={() => { setActiveId(conversation.id); setPanel("none"); }} className={`conversation-item ${conversation.id === activeId ? "active" : ""}`}><MessageSquarePlus size={15} /><span><strong>{conversation.title || t.newChat}</strong><small>{conversation.messages.length ? `${conversation.messages.length} رسائل · ` : ""}{formatDate(conversation.updatedAt, settings.locale)}</small></span>{conversation.id === activeId && <ChevronLeft size={14} />}</button>)}
        </div>
        <div className="sidebar-bottom">
          <button className={`nav-item ${panel === "providers" ? "selected" : ""}`} onClick={() => setPanel(panel === "providers" ? "none" : "providers")}><Settings2 size={17} /><span>{t.providers}</span><span className="nav-status-dot" /></button>
          <button className={`nav-item ${panel === "models" ? "selected" : ""}`} onClick={() => setPanel(panel === "models" ? "none" : "models")}><LayoutPanelLeft size={17} /><span>{t.models}</span></button>
          <button className={`nav-item ${panel === "privacy" ? "selected" : ""}`} onClick={() => setPanel(panel === "privacy" ? "none" : "privacy")}><ShieldCheck size={17} /><span>{t.privacy}</span></button>
          <button className={`nav-item ${panel === "tools" ? "selected" : ""}`} onClick={() => setPanel(panel === "tools" ? "none" : "tools")}><Globe2 size={17} /><span>الأدوات المجانية</span></button>
          <button className={`nav-item ${panel === "docs" ? "selected" : ""}`} onClick={() => setPanel(panel === "docs" ? "none" : "docs")}><CircleHelp size={17} /><span>{t.docs}</span></button>
          <div className="sidebar-footnote"><span className="status-ring" />{t.freePath}</div>
        </div>
      </aside>

      <main className="main-stage">
        <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setSettings((current) => ({ ...current, sidebarCollapsed: !current.sidebarCollapsed }))} aria-label="القائمة"><Menu size={19} /></button><button className="collapse-button icon-button" onClick={() => setSettings((current) => ({ ...current, sidebarCollapsed: !current.sidebarCollapsed }))} aria-label="طي القائمة">{settings.sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><div className="crumb"><span>{t.nav}</span><ChevronLeft size={14} /><strong>{activeConversation?.title || t.start}</strong></div></div><div className="topbar-actions"><div className="secure-pill"><span className="status-ring" />{selectedProvider === "neuer" ? "جاهز بلا مفتاح" : selectedProvider === "ollama" ? t.local : t.cloud}</div><button className="icon-button" onClick={() => setSettings((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }))} aria-label="تبديل المظهر">{settings.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button><button className="avatar-button" onClick={() => setPanel("privacy")}>ن</button></div></header>

        <div className="workspace-body">
          <div className="workspace-content">
            {!activeConversation || activeConversation.messages.length === 0 ? <div className="welcome-state"><div className="welcome-orbit"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="welcome-mark"><Sparkles size={22} /></span></div><div className="eyebrow"><span /> NEUER AI / PRIVATE WORKSPACE</div><h1>{t.start}</h1><p>{t.startSub}</p><div className="quick-prompts"><button onClick={() => setMessage("لخّص لي فكرة في سطرين")}>لخّص فكرة بسرعة <ArrowDownToLine size={14} /></button><button onClick={() => setMessage("اكتب خطة عملية لمشروع جديد")}>اكتب خطة عملية <Zap size={14} /></button><button onClick={() => setMessage("اشرح لي مفهومًا مع مثال")}>اشرح مع مثال <Info size={14} /></button></div></div> : <div className="messages-scroll">{activeConversation.messages.map((item, index) => <div key={item.id}><MessageBubble message={item} onCopy={() => copyText(item.content)} onEdit={() => editMessage(item)} onDelete={() => deleteMessage(item)} onSpeak={() => readAloud(item.content)} />{item.role === "assistant" && index === activeConversation.messages.length - 1 && !isSending && !item.error && <button className="regenerate-button" onClick={() => submitMessage(activeConversation.messages[index - 1]?.content, true)}><RefreshCw size={13} /> {t.regenerate}</button>}</div>)}{isSending && <div className="typing-line"><span /><span /><span /> Neurer يعالج طلبك…</div>}</div>}
          </div>

          <div className="composer-wrap"><div className="context-strip"><div className="context-select"><span className={`mode-icon ${providerMeta[selectedProvider].mode}`}><Bot size={14} /></span><select value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value as ProviderId)} aria-label={t.provider}><option value="neuer">Neuer AI · جاهز</option><option value="ollama">Ollama · {t.local}</option><option value="openrouter">OpenRouter · {t.cloud}</option><option value="groq">Groq · {t.cloud}</option></select><ChevronDown size={14} /></div><div className="context-select model-select"><select value={selectedModel} onChange={(event) => setSelectedModels((current) => ({ ...current, [selectedProvider]: event.target.value }))} aria-label={t.model}><option value="">{t.chooseModel}</option>{currentModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select><ChevronDown size={14} /></div><span className={`connection-label ${providerStates[selectedProvider].connected ? "online" : ""}`}><span />{providerStates[selectedProvider].connected ? t.connected : t.disconnected}</span><button className="tiny-action" onClick={() => checkConnection(selectedProvider)} disabled={providerStates[selectedProvider].checking} aria-label={t.check}>{providerStates[selectedProvider].checking ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}</button></div><form className="composer" onSubmit={(event) => { event.preventDefault(); void submitMessage(); }}><textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitMessage(); } }} placeholder={t.message} aria-label={t.message} rows={1} /><div className="composer-bottom"><span>Enter للإرسال · Shift + Enter لسطر جديد</span><div className="composer-tools"><input ref={fileRef} type="file" accept=".txt,.md,.csv,.json,.pdf,text/plain,text/markdown,application/json,application/pdf" onChange={importLocalFile} hidden /><button type="button" className="composer-tool" onClick={() => fileRef.current?.click()} aria-label="إرفاق ملف"><FileText size={14} /></button><button type="button" className={`composer-tool ${isListening ? "active" : ""}`} onClick={toggleListening} aria-label="إملاء صوتي"><Mic size={14} /></button><button type={isSending ? "button" : "submit"} className={`send-button ${isSending ? "stop" : ""}`} onClick={isSending ? stopGeneration : undefined}>{isSending ? <><Square size={14} fill="currentColor" />{t.stop}</> : <><Send size={15} />{t.send}</>}</button></div></div></form><div className="composer-note"><ShieldCheck size={13} /> محادثتك جاهزة — لا تحتاج إلى مفتاح أو إعداد إضافي.</div></div>
        </div>
      </main>

      {panel === "tools" && <PanelShell title="الأدوات المجانية" icon={<Globe2 size={18} />} onClose={() => setPanel("none")}><div className="panel-intro">أدوات تعمل في المتصفح دون مفتاح API. الملفات تُحلّل محليًا، والبحث محدود بمصدر ويكيبيديا.</div><section className="tool-card"><h3><Search size={16} /> بحث ويكيبيديا</h3><div className="tool-search"><input value={toolsQuery} onChange={(event) => setToolsQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void runWikiSearch(); }} placeholder="ابحث عن موضوع…" /><button className="outline-button" onClick={() => void runWikiSearch()} disabled={toolsLoading}>{toolsLoading ? <Loader2 size={14} className="spin" /> : <Search size={14} />}</button></div>{wikiResults.length > 0 && <div className="wiki-results">{wikiResults.map((result) => <a key={result.url} href={result.url} target="_blank" rel="noreferrer"><strong>{result.title}</strong><span>{result.snippet}</span></a>)}</div>}</section><section className="tool-card"><h3><FileText size={16} /> قراءة ملف محلي</h3><p>TXT وMarkdown وCSV وJSON وPDF. بعد الاستخراج يُوضع النص في المحرر ولا يُرسل تلقائيًا.</p><button className="outline-button" onClick={() => fileRef.current?.click()}><Upload size={14} /> اختيار ملف</button></section><section className="tool-card"><h3><Volume2 size={16} /> الصوت في المتصفح</h3><p>استخدم زر الميكروفون للإملاء أو زر «صوت» بجانب أي رد. الدعم يعتمد على المتصفح.</p><button className="outline-button" onClick={() => { if (activeConversation) readAloud(activeConversation.messages.filter((item) => item.role === "assistant").at(-1)?.content ?? ""); }}>{"قراءة آخر رد"}</button><button className="outline-button" onClick={stopSpeaking}>إيقاف الصوت</button></section></PanelShell>}
      {panel === "providers" && <PanelShell title={t.providers} icon={<Settings2 size={18} />} onClose={() => setPanel("none")}><div className="panel-intro">Neuer AI هو المسار الافتراضي ويعمل مباشرة دون مفتاح. المسارات الخارجية اختيارية فقط.</div>{(Object.keys(providerMeta) as ProviderId[]).map((provider) => { const meta = providerMeta[provider]; const state = providerStates[provider]; const config = providerConfigs[provider]; return <section className="provider-card" key={provider}><div className="provider-card-head"><div><ProviderBadge provider={provider} /><h3>{meta.name}</h3></div><span className={`status-chip ${state.connected ? "success" : "muted"}`}><span />{state.connected ? t.connected : t.disconnected}</span></div><p>{meta.note}</p>{provider !== "neuer" && <label>عنوان الخدمة<input value={config.baseUrl} onChange={(event) => updateProvider(provider, { baseUrl: event.target.value })} /></label>}{provider !== "neuer" && meta.mode === "cloud" && <label>مفتاح API اختياري <input type="password" autoComplete="off" value={config.apiKey ?? ""} onChange={(event) => updateProvider(provider, { apiKey: event.target.value })} placeholder="اتركه فارغًا لاستخدام Neuer AI" /></label>}<div className="provider-card-foot"><button className="outline-button" onClick={() => checkConnection(provider)} disabled={state.checking}>{state.checking ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}{state.checking ? t.checking : t.check}</button><a href={meta.docs} target="_blank" rel="noreferrer">الوثائق <ChevronLeft size={13} /></a></div>{state.message !== "لم يُفحص بعد" && <small className={state.connected ? "success-text" : "error-text"}>{state.message}</small>}</section>; })}</PanelShell>}
      {panel === "models" && <PanelShell title={t.models} icon={<LayoutPanelLeft size={18} />} onClose={() => setPanel("none")}><div className="panel-intro">لا نعرض نموذجًا كمتاح حتى يجلبه المزوّد من مصدره الفعلي.</div>{(Object.keys(providerMeta) as ProviderId[]).map((provider) => <section className="model-provider-section" key={provider}><div className="section-line"><ProviderBadge provider={provider} /><span>{providerStates[provider].models.length} {t.available}</span></div>{providerStates[provider].models.length === 0 ? <div className="empty-models"><Database size={18} /><p>افحص الاتصال لإظهار النماذج الحية.</p></div> : providerStates[provider].models.map((model) => <button key={model.id} className={`model-row ${selectedModel === model.id && selectedProvider === provider ? "selected" : ""}`} onClick={() => { setSelectedProvider(provider); setSelectedModels((current) => ({ ...current, [provider]: model.id })); setPanel("none"); }}><span className="model-icon"><Bot size={15} /></span><span><strong>{model.name}</strong><small>{model.capabilities.join(" · ")}</small></span>{selectedModel === model.id && selectedProvider === provider && <Check size={15} />}</button>)}</section>)}</PanelShell>}
      {panel === "privacy" && <PanelShell title={t.privacy} icon={<ShieldCheck size={18} />} onClose={() => setPanel("none")}><div className="privacy-hero"><div className="privacy-icon"><ShieldCheck size={22} /></div><h3>{t.privacyTitle}</h3><p>{t.privacyText}</p></div><div className="setting-group"><h4>{t.history}</h4><label className="switch-row"><span><Database size={16} /><small>IndexedDB محليًا</small></span><input type="checkbox" checked={settings.saveHistory} onChange={(event) => setSettings((current) => ({ ...current, saveHistory: event.target.checked }))} /><i /></label></div><div className="setting-group"><h4>{t.appearance}</h4><div className="segmented"><button className={settings.theme === "dark" ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, theme: "dark" }))}><Moon size={14} />{t.dark}</button><button className={settings.theme === "light" ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, theme: "light" }))}><Sun size={14} />{t.light}</button></div></div><div className="setting-group"><h4>{t.language}</h4><div className="segmented"><button className={settings.locale === "ar" ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, locale: "ar" }))}>{t.arabic}</button><button className={settings.locale === "en" ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, locale: "en" }))}>{t.english}</button></div></div><button className="danger-button" onClick={clearData}><Trash2 size={15} />{t.clearData}</button><div className="privacy-note"><Info size={15} /><p>المفتاح الذي تدخله في المتصفح قابل للوصول من أدوات المطوّر. تخزينه في الذاكرة يقلل الأثر لكنه لا يحمي من XSS أو من جهاز مخترق.</p></div></PanelShell>}
      {panel === "docs" && <PanelShell title={t.docs} icon={<CircleHelp size={18} />} onClose={() => setPanel("none")}><div className="docs-hero"><div className="docs-kicker">NEUER / FIELD NOTES</div><h3>{t.docsTitle}</h3><p>{t.docsText}</p></div><div className="docs-list"><div><span>01</span><strong>Ollama</strong><p>الاتصال الافتراضي <code>http://localhost:11434</code>. قد تحتاج إعداد CORS عند استخدام موقع HTTPS.</p><a href={providerMeta.ollama.docs} target="_blank" rel="noreferrer">{t.learnMore}</a></div><div><span>02</span><strong>OpenRouter</strong><p>يُسمح فقط بالنماذج التي يعيدها API بسعر prompt وcompletion يساوي صفرًا.</p><a href={providerMeta.openrouter.docs} target="_blank" rel="noreferrer">{t.learnMore}</a></div><div><span>03</span><strong>Groq</strong><p>الخطة المجانية مرتبطة بالحساب والحصة والحدود الحالية؛ راجع الوثائق قبل الاستخدام.</p><a href={providerMeta.groq.docs} target="_blank" rel="noreferrer">{t.learnMore}</a></div></div><div className="import-export"><input ref={importRef} type="file" accept="application/json,.json" onChange={importBackup} hidden /><button className="outline-button" onClick={() => importRef.current?.click()}><Upload size={14} />{t.import}</button>{activeConversation && <div className="export-menu"><button className="outline-button"><Download size={14} />{t.export}<ChevronDown size={13} /></button><div className="export-options"><button onClick={() => downloadConversation(activeConversation, "txt")}>{t.exportTxt}</button><button onClick={() => downloadConversation(activeConversation, "md")}>{t.exportMd}</button><button onClick={() => downloadConversation(activeConversation, "json")}>{t.exportJson}</button></div></div>}</div></PanelShell>}

      {activeConversation && <div className="chat-toolbar"><button onClick={renameConversation}><Pencil size={14} />{t.rename}</button><button onClick={() => setPanel("docs")}><MoreHorizontal size={16} /></button><button className="danger-inline" onClick={deleteActive}><Trash2 size={14} />{t.delete}</button></div>}
    </div>
  );
}
