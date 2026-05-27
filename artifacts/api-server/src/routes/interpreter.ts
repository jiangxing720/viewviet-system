import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { toFile } from "openai";
import { Buffer } from "node:buffer";

const router = Router();

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

  const LANG_NAMES: Record<string, string> = {
    zh: "Chinese (Simplified)", en: "English", vi: "Vietnamese", ko: "Korean",
  };

  try {
    const response = await openai!.chat.completions.create({
      model: "gemini-2.5-flash",
      max_completion_tokens: 512,
      messages: [
        {
          role: "system",
          content: `You are a professional interpreter. Translate the following text from ${LANG_NAMES[from] ?? from} to ${LANG_NAMES[to] ?? to}. Return ONLY the translation with no extra commentary, punctuation changes, or quotation marks.`,
        },
        { role: "user", content: text },
      ],
    });

    const translated = response.choices[0]?.message?.content?.trim() ?? text;
    res.json({ translated });
  } catch (err) {
    req.log.error({ err }, "OpenAI translate failed");
    res.status(500).json({ error: "Translation failed" });
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
      model: "gemini-2.5-flash",
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
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const file = await toFile(audioBuffer, `audio.${format}`);

    const response = (await openai!.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
    })) as any;

    const detectedLang = response.language || "";
    const text = response.text || "";

    if (!text.trim()) {
      res.json({ empty: true });
      return;
    }

    let speaker: "A" | "B" = "A";
    let sourceLang = langA;
    let targetLang = langB;

    if (detectedLang && langB.startsWith(detectedLang.toLowerCase())) {
      speaker = "B";
      sourceLang = langB;
      targetLang = langA;
    } else if (detectedLang && langA.startsWith(detectedLang.toLowerCase())) {
      speaker = "A";
      sourceLang = langA;
      targetLang = langB;
    }

    const translateResponse = await openai!.chat.completions.create({
      model: "gemini-2.5-flash",
      max_completion_tokens: 512,
      messages: [
        {
          role: "system",
          content: `You are a professional interpreter. Translate the following text from ${LANG_NAMES[sourceLang] ?? sourceLang} to ${LANG_NAMES[targetLang] ?? targetLang}. Return ONLY the translation with no extra commentary, punctuation changes, or quotation marks.`,
        },
        { role: "user", content: text },
      ],
    });

    const translated = translateResponse.choices[0]?.message?.content?.trim() ?? text;

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
