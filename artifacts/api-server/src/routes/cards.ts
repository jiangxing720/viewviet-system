import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/admin/generate-share-cards", async (req, res): Promise<void> => {
  const { title, content } = req.body as { title?: string; content?: string };
  if (!title || !content) {
    res.status(400).json({ error: "title and content are required" });
    return;
  }

  const contentLen = content.length;
  const targetCards = contentLen < 1500 ? 4 : contentLen < 3500 ? 6 : contentLen < 6000 ? 8 : 10;

  const systemPrompt = `你是一名专业的小红书内容策划师，擅长将长文章拆解为多张竖版分享卡片（9:16比例）。

任务：将文章内容拆解为 ${targetCards} 张分享卡片，每张卡片展示一个核心知识点或亮点。

要求：
1. 每张卡片的 text 必须是自成完整的内容，读者不需要看其他卡片也能理解（2-4句话，约80-150字）
2. text 内容语言生动，适合小红书传播，可适当加粗关键词（但不用Markdown，直接写文字）
3. imagePrompt 必须是英文，描述一张真实感强的竖版摄影风格背景图，内容与卡片主题相关
4. imagePrompt 格式：[主体描述], [场景/环境], cinematic lighting, photorealistic, vertical composition, 8K

返回 JSON（不加代码块）：
{
  "cards": [
    {
      "cardTitle": "卡片小标题（4-10字，概括该卡片核心，可与文章标题不同）",
      "text": "该卡片的详细内容（2-4句话）",
      "imagePrompt": "English DALL-E prompt for background photo"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `文章标题：${title}\n\n文章内容：\n${content.slice(0, 12000)}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      res.status(500).json({ error: "AI 未返回有效 JSON" });
      return;
    }
    const data = JSON.parse(match[0]);
    res.json({ title, cards: data.cards ?? [] });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

router.post("/admin/generate-card-image", async (req, res): Promise<void> => {
  const { prompt } = req.body as { prompt?: string };
  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `${prompt}, NO text, NO letters, NO watermark, NO overlay`,
      size: "1024x1792",
      quality: "standard",
      n: 1,
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      res.status(500).json({ error: "No image URL returned" });
      return;
    }
    res.json({ imageUrl });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

export default router;
