# Neuer AI — التوثيق التقني

## البنية
Neuer AI تطبيق React + TypeScript + Vite يعمل كواجهة ثابتة. لا يحتاج إلى خادم دائم أو قاعدة بيانات سحابية للوظائف الأساسية. طبقة `client/src/lib/providers.ts` تفصل محرك المحادثة عن مزوّد Ollama المحلي وواجهتي OpenRouter وGroq المتوافقتين مع OpenAI. طبقة `client/src/lib/storage.ts` تحفظ المحادثات والإعدادات في IndexedDB مع بديل محدود عبر LocalStorage إذا عطّل المتصفح IndexedDB.

## الخصوصية
مفاتيح API اختيارية وتبقى داخل حالة React وذاكرة الصفحة. لا تُكتب في IndexedDB، ولا تدخل إلى ملفات JSON أو سجلات التطبيق. هذا لا يجعلها سرية عن صاحب الجهاز؛ أي مفتاح يكتبه المستخدم في المتصفح يمكن قراءته من أدوات المطور، كما أن حماية XSS تعتمد على سلامة الاستضافة والمتصفح.

## Ollama
العنوان الافتراضي هو `http://localhost:11434`. يستعمل التطبيق `GET /api/tags` لاكتشاف النماذج و`POST /api/chat` للبث بصيغة NDJSON. الاتصال لا يُعلن ناجحًا قبل نجاح الطلب الفعلي. عند نشر الموقع عبر HTTPS قد يمنع المتصفح طلب HTTP المحلي بسبب Mixed Content أو CORS؛ لا يلتف التطبيق على هذه السياسات.

## المسارات السحابية
OpenRouter يُستعمل عبر `GET /models` و`POST /chat/completions`. لا يعرض التطبيق إلا النماذج التي يعيدها API بسعر prompt وcompletion يساوي صفرًا. Groq يُستعمل عبر واجهة OpenAI-compatible، وتظهر النماذج بعد الاتصال فقط مع تنبيه أنها مجانية ضمن حصة الحساب وشروط المزوّد. لا توجد آلية fallback تلقائي إلى نموذج مدفوع.

## الاختبارات
شغّل `pnpm check` لفحص TypeScript، و`pnpm test` لاختبارات Vitest، و`pnpm build:static` لبناء النسخة الثابتة. يجب فحص `.env*` وأي ملفات نسخ احتياطية قبل الرفع. اختبار الاتصال السحابي الحقيقي يحتاج مفتاحًا يضيفه المستخدم في واجهة المزوّدين؛ غياب المفتاح يُعامل كحالة فشل مفهومة لا كاتصال تجريبي.

## التشغيل
```bash
pnpm install --frozen-lockfile
pnpm dev:static
```

لإضافة اتصال سحابي، افتح «المزوّدون»، أدخل العنوان والمفتاح في الجلسة، ثم نفّذ «فحص الاتصال». لا تضع المفتاح في `.env` للنسخة المنشورة ولا في Git.

## المصادر الرسمية التي راجعتها
- Ollama API: https://docs.ollama.com/api/introduction
- Ollama Chat: https://docs.ollama.com/api/chat
- OpenRouter Quickstart: https://openrouter.ai/docs/quickstart
- OpenRouter Free Models: https://openrouter.ai/openrouter/free
- Groq API Reference: https://console.groq.com/docs/api-reference
- Groq Rate Limits: https://console.groq.com/docs/rate-limits

تمت مراجعة الروابط في 2026-10-26. الأسعار والحصص وشروط الاستخدام متغيرة، لذلك يعيد التطبيق التحقق من النماذج الحية بدل الاعتماد على قائمة ثابتة.
