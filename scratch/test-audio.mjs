import fs from "fs";
import { resolve } from "path";

const envFile = fs.readFileSync("/Users/zhangxing/Downloads/Smart-System-Optimize 2/.env.local", "utf-8");
envFile.split("\n").forEach(line => {
  if (line.trim() && !line.startsWith("#")) {
    const [key, ...value] = line.split("=");
    if (key && value) process.env[key.trim()] = value.join("=").trim().replace(/['"]/g, '');
  }
});

async function run() {
  const OpenAI = (await import("openai")).default;
  const { toFile } = await import("openai");
  const client = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  // Create a dummy 1-second silence WAV file
  const wavHeader = Buffer.from("524946462400000057415645666d7420100000000100010044ac000088580100020010006461746100000000", "hex");
  const file = await toFile(wavHeader, "test.wav");

  console.log("Calling transcriptions.create...");
  try {
    const res = await client.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
      response_format: "verbose_json"
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Failed with gpt-4o-mini-transcribe:", err.message);
    console.log("Trying with whisper-1...");
    try {
      const res2 = await client.audio.transcriptions.create({
        file,
        model: "whisper-1",
        response_format: "verbose_json"
      });
      console.log("Success with whisper-1:", res2);
    } catch (err2) {
      console.error("Failed with whisper-1:", err2.message);
    }
  }
}
run();
