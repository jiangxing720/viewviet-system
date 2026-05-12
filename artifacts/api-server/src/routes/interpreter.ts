import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

interface Exchange {
  speaker: "A" | "B";
  original: string;
  translated: string;
  targetLang: string;
  timestamp: number;
}

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
      model: "gpt-5-mini",
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
