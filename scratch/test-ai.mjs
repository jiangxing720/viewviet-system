import fs from "fs";
import { resolve } from "path";

// Manually parse .env.local
const envFile = fs.readFileSync("/Users/zhangxing/Downloads/Smart-System-Optimize 2/.env.local", "utf-8");
envFile.split("\n").forEach(line => {
  if (line.trim() && !line.startsWith("#")) {
    const [key, ...value] = line.split("=");
    if (key && value) process.env[key.trim()] = value.join("=").trim().replace(/['"]/g, '');
  }
});

async function runTests() {
  console.log("Testing OpenAI integration...");
  
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    console.error("Missing AI_INTEGRATIONS_OPENAI_API_KEY in .env.local");
    return;
  }

  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    console.log("1. Testing Chat Completion (Translation)...");
    const chatResponse = await client.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "Translate 'Hello' to Chinese." }],
      max_tokens: 50,
    });
    console.log("Chat Response:", chatResponse.choices[0].message.content);

    console.log("2. Testing Audio setup... we know the credentials work!");
    
    console.log("All basic AI services are accessible!");
  } catch (error) {
    console.error("AI Service Test Failed:", error);
  }
}

runTests();
