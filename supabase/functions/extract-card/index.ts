// Edge function: extract-card
// Receives a base64 image and returns structured card fields using Lovable AI (Gemini Vision)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    if (!image || typeof image !== "string") {
      return json({ error: "image (base64 data URL) is required" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    const systemPrompt = `أنت محرك استخراج بيانات متخصص في قراءة "كارتات تشغيل معدات مؤجرة" خاصة بجهاز مستقبل مصر للتنمية المستدامة - قسم الميكنة الزراعية. هذه الكارتات مكتوبة باللغة العربية بخط اليد على نموذج مطبوع.

استخرج البيانات التالية بدقة عالية واستخدم استدعاء الأداة (function calling) لإرجاعها:

1. receiptNumber: رقم الإيصال - الرقم المطبوع باللون الأحمر أعلى الكارت (أرقام إنجليزية فقط، مثل "018203"). إذا لم يظهر، أعد سلسلة فارغة.

2. date: التاريخ المكتوب بخط اليد بجانب كلمة "التاريخ" بصيغة DD/MM/YYYY. إذا كانت السنة مكونة من رقمين أو غير مكتملة افترضها 2026. إذا غير موجود أعد فارغ.

3. crop: نوع المحصول - يجب أن تكون إحدى القيمتين فقط: "بنجر" أو "قمح". الحرف "ح" أو "قمح" = قمح. الحرف "ب" أو "بنجر" = بنجر. إذا غير واضح أعد فارغ.

4. coordinates: إحداثيات الجهاز بصيغة "رقم-رقم-رقمين" مثل "8-9-27" أو "4-1-40". احتفظ بالشرطات.

5. areaNumeric: المساحة الرقمية فقط (بدون وحدات) من خانة "إجمالي المستحق" المكتوبة بشكل حسابي رقمي. مثال: "70".

6. areaText: قيمة المساحة المكتوبة بشكل **نصي / كلمات** في خانة "صافي المستحق" (مثل "سبعون" أو "خمسة وأربعون"). أعد النص كما هو من الكارت بدون تحويل.

كن دقيقاً جداً مع خط اليد العربي. لا تخترع بيانات. إذا لم تتمكن من قراءة حقل بثقة، أعده فارغاً.`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "استخرج بيانات هذه الكارتة." },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_card_data",
            description: "Return the extracted card fields.",
            parameters: {
              type: "object",
              properties: {
                receiptNumber: { type: "string", description: "English digits only, e.g. 018203" },
                date: { type: "string", description: "DD/MM/YYYY" },
                crop: { type: "string", enum: ["قمح", "بنجر", ""] },
                coordinates: { type: "string", description: "e.g. 8-9-27" },
                areaNumeric: { type: "string", description: "Numeric area from إجمالي المستحق, e.g. 70" },
                areaText: { type: "string", description: "Textual (words) area from صافي المستحق, e.g. سبعون" },
              },
              required: ["receiptNumber", "date", "crop", "coordinates", "areaNumeric", "areaText"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_card_data" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return json({ error: "تم تجاوز الحد المسموح، حاول لاحقاً." }, 429);
      }
      if (resp.status === 402) {
        return json({ error: "الرصيد غير كافٍ، يرجى إضافة رصيد لـ Lovable AI." }, 402);
      }
      const text = await resp.text();
      console.error("Gateway error:", resp.status, text);
      return json({ error: "AI gateway error" }, 500);
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call returned:", JSON.stringify(data));
      return json({ error: "لم يتمكن النموذج من استخراج البيانات." }, 422);
    }

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Bad JSON arguments:", toolCall.function.arguments);
      return json({ error: "صيغة استخراج غير صالحة." }, 500);
    }

    const areaNumeric = cleanArea(parsed.areaNumeric);
    const areaText = (parsed.areaText || "").trim();
    const areaWarning = validateAreaMatch(areaNumeric, areaText);

    const result = {
      receiptNumber: cleanDigits(parsed.receiptNumber),
      date: normalizeDate(parsed.date),
      crop: normalizeCrop(parsed.crop),
      coordinates: (parsed.coordinates || "").trim(),
      area: areaNumeric,
    };

    return json({ success: true, data: result, areaWarning });
  } catch (e) {
    console.error("extract-card error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanDigits(v: string | undefined) {
  if (!v) return "";
  // Convert Arabic digits → English, strip non-digits
  const map: Record<string, string> = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9" };
  return v.replace(/[٠-٩]/g, (d) => map[d]).replace(/[^\d]/g, "");
}

function cleanArea(v: string | undefined) {
  if (!v) return "";
  const map: Record<string, string> = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9" };
  const s = v.replace(/[٠-٩]/g, (d) => map[d]);
  const m = s.match(/[\d.]+/);
  return m ? m[0] : "";
}

function normalizeCrop(v: string | undefined) {
  if (!v) return "";
  const s = v.trim();
  if (s.includes("قم") || s === "ح") return "قمح";
  if (s.includes("بن") || s === "ب") return "بنجر";
  if (s === "قمح" || s === "بنجر") return s;
  return "";
}

function normalizeDate(v: string | undefined) {
  if (!v) return "";
  const map: Record<string, string> = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9" };
  let s = v.replace(/[٠-٩]/g, (d) => map[d]).trim();
  s = s.replace(/[.\-\\]/g, "/");
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) return s;
  let [d, m, y] = parts;
  if (!y) y = "2026";
  if (y.length === 2) y = "20" + y;
  if (y.length === 1) y = "202" + y;
  d = d.padStart(2, "0");
  m = m.padStart(2, "0");
  return `${d}/${m}/${y}`;
}
