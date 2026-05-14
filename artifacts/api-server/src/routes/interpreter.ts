import { Router } from "express";
import multer from "multer";
import { toFile } from "openai";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// Memory-only multer — audio blobs are small (<2 MB per utterance)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

interface Exchange {
  speaker: "A" | "B";
  original: string;
  translated: string;
  targetLang: string;
  timestamp: number;
}

// POST /interpreter/transcribe — Whisper auto-detect language + transcribe
router.post(
  "/interpreter/transcribe",
  upload.single("audio"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No audio file provided" });
      return;
    }
    try {
      const ext = req.file.mimetype.includes("mp4") ? "audio.mp4"
        : req.file.mimetype.includes("ogg") ? "audio.ogg"
        : "audio.webm";
      const file = await toFile(req.file.buffer, ext, { type: req.file.mimetype });
      const response = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        response_format: "verbose_json",
      });
      res.json({ text: response.text?.trim() ?? "", language: response.language ?? "" });
    } catch (err) {
      req.log.error({ err }, "Whisper transcription failed");
      res.status(500).json({ error: "Transcription failed" });
    }
  },
);

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
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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

export default router;
