import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import OpenAI from "openai";
import { toFile } from "openai";
import { Buffer } from "node:buffer";

const router = Router();

const whisperClient = process.env.WHISPER_API_KEY 
  ? new OpenAI({ apiKey: process.env.WHISPER_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL }) 
  : openai;

const LANG_NAMES: Record<string, string> = {
  zh: "Chinese (Simplified)",
  en: "English",
  vi: "Vietnamese",
  ko: "Korean",
};

const WHISPER_LANG_ALIASES: Record<string, string> = {
  zh: "zh",
  zho: "zh",
  chi: "zh",
  chinese: "zh",
  mandarin: "zh",
  "中文": "zh",
  "汉语": "zh",
  en: "en",
  eng: "en",
  english: "en",
  vi: "vi",
  vie: "vi",
  vietnamese: "vi",
  "tiếng việt": "vi",
  ko: "ko",
  kor: "ko",
  korean: "ko",
};

function normalizeLang(value?: string): string {
  const key = (value ?? "").trim().toLowerCase();
  return WHISPER_LANG_ALIASES[key] ?? key.slice(0, 2);
}

async function translateText(text: string, from: string, to: string): Promise<string> {
  if (!openai) throw new Error("AI translation is not configured");
  if (from === to) return text;

  const response = await openai.chat.completions.create({
    model: process.env.AI_TEXT_MODEL || "gpt-4.1-nano",
    max_completion_tokens: 512,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: [
          "You are a professional live interpreter.",
          `Translate from ${LANG_NAMES[from] ?? from} to ${LANG_NAMES[to] ?? to}.`,
          "Preserve the speaker's meaning, tone, names, numbers, and legal/business terms.",
          "Return only the translated text. Do not add explanations, quotes, labels, or markdown.",
        ].join(" "),
      },
      { role: "user", content: text },
    ],
  });

  return response.choices[0]?.message?.content?.trim() || text;
}

interface Exchange {
  speaker: "A" | "B";
  original: string;
  translated: string;
  targetLang: string;
  timestamp: number;
}

router.post("/interpreter/translate", async (req, res): Promise<void> => {
  const { text, from, to } = req.body as { text: string; from: string; to: string };

  if (!text?.trim() || !from || !to) {
    res.status(400).json({ error: "Missing text, from, or to" });
    return;
  }

  if (from === to) {
    res.json({ translated: text });
    return;
  }

  try {
    const translated = await translateText(text, normalizeLang(from), normalizeLang(to));
    res.json({ translated });
  } catch (err) {
    req.log.error({ err }, "OpenAI translate failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Translation failed" });
  }
});

router.post("/interpreter/summary", async (req, res): Promise<void> => {
  const { exchanges, langA, langB } = req.body as {
    exchanges: Exchange[];
    langA: string;
    langB: string;
  };

  if (!Array.isArray(exchanges) || exchanges.length === 0) {
    res.status(400).json({ error: "No exchanges provided" });
    return;
  }

  const transcript = exchanges
    .map((e) => `[${e.speaker}] ${e.original} → ${e.translated}`)
    .join("\n");

  const systemPrompt = `You are a professional interpreter assistant. Summarize the following bilingual conversation between two people (Person A speaks ${langA}, Person B speaks ${langB}).

Write a concise summary in BOTH ${langA} AND ${langB}. Structure your response as:

**${langA} 摘要 / Summary:**
(summary in ${langA})

**${langB} Tóm tắt / Summary:**
(summary in ${langB})

Keep it factual, neutral, and under 150 words per language. Highlight key topics discussed.`;

  try {
    const response = await openai!.chat.completions.create({
      model: "gpt-4.1-nano",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Conversation transcript:\n${transcript}` },
      ],
    });

    const summary = response.choices[0]?.message?.content ?? "";
    res.json({ summary });
  } catch (err) {
    req.log.error({ err }, "OpenAI summary failed");
    res.status(500).json({ error: "Summary generation failed" });
  }
});

router.post("/interpreter/audio", async (req, res): Promise<void> => {
  const { audioBase64, format, langA, langB } = req.body as {
    audioBase64: string; format: string; langA: string; langB: string;
  };

  if (!audioBase64 || !format || !langA || !langB) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const LANG_NAMES: Record<string, string> = {
    zh: "Chinese", en: "English", vi: "Vietnamese", ko: "Korean",
  };

  try {
    if (!openai || !whisperClient) {
      res.status(503).json({ error: "AI interpreter is not configured" });
      return;
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const file = await toFile(audioBuffer, `audio.${format}`);

    const response = (await whisperClient!.audio.transcriptions.create({
      file,
      model: process.env.AI_SPEECH_MODEL || "whisper-1",
      response_format: "verbose_json",
    })) as any;

    const detectedLang = normalizeLang(response.language || "");
    const text = response.text || "";

    if (!text.trim()) {
      res.json({ empty: true });
      return;
    }

    let speaker: "A" | "B" = "A";
    let sourceLang = langA;
    let targetLang = langB;

    const normalizedLangA = normalizeLang(langA);
    const normalizedLangB = normalizeLang(langB);

    if (detectedLang && detectedLang === normalizedLangB) {
      speaker = "B";
      sourceLang = normalizedLangB;
      targetLang = normalizedLangA;
    } else if (detectedLang && detectedLang === normalizedLangA) {
      speaker = "A";
      sourceLang = normalizedLangA;
      targetLang = normalizedLangB;
    }

    const translated = await translateText(text, sourceLang, targetLang);

    res.json({
      empty: false,
      speaker,
      original: text,
      translated,
      detectedLang,
      targetLang
    });
  } catch (err) {
    req.log.error({ err }, "Interpreter audio failed");
    res.status(500).json({ error: "Audio processing failed" });
  }
});

export default router;
