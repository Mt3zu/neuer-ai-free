import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export async function extractLocalFileText(file: File) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdf = await getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    return pages.join("\n\n").trim();
  }
  return (await file.text()).slice(0, 250_000).trim();
}

export interface WikiResult {
  title: string;
  snippet: string;
  url: string;
}

export async function searchWikipedia(query: string, locale = "ar"): Promise<WikiResult[]> {
  const language = locale === "en" ? "en" : "ar";
  const params = new URLSearchParams({ action: "query", list: "search", srsearch: query, srlimit: "6", format: "json", origin: "*" });
  const response = await fetch(`https://${language}.wikipedia.org/w/api.php?${params.toString()}`);
  if (!response.ok) throw new Error(`تعذر البحث في ويكيبيديا (${response.status}).`);
  const body = (await response.json()) as { query?: { search?: Array<{ title: string; snippet: string }> } };
  return (body.query?.search ?? []).map((item) => ({
    title: item.title,
    snippet: item.snippet.replace(/<[^>]+>/g, ""),
    url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(item.title.replaceAll(" ", "_"))}`,
  }));
}

export function speakText(text: string, locale = "ar-SA") {
  if (!("speechSynthesis" in window)) throw new Error("تحويل النص إلى كلام غير مدعوم في هذا المتصفح.");
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function startSpeechRecognition(locale = "ar-SA", onText: (text: string) => void, onEnd: () => void) {
  const Recognition = (window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition
    ?? (window as Window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
  if (!Recognition) throw new Error("التعرف على الكلام غير مدعوم في هذا المتصفح.");
  const recognition = new Recognition();
  recognition.lang = locale;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onresult = (event: any) => {
    const text = Array.from(event.results as ArrayLike<{ 0: { transcript: string } }>).map((result: any) => result[0].transcript).join("");
    onText(text);
  };
  recognition.onerror = () => onEnd();
  recognition.onend = () => onEnd();
  recognition.start();
  return recognition as { stop: () => void };
}
