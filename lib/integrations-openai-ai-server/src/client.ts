import OpenAI from "openai";

const rawKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const isGeminiKey = rawKey?.startsWith("AIza");

export const openai = rawKey
  ? new OpenAI({
      apiKey: rawKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 
               (isGeminiKey ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined),
    })
  : null;

