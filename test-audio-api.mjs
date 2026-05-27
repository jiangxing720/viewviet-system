import fs from 'fs';

async function test() {
  const base64 = fs.readFileSync('test.aiff').toString('base64');

  console.log("Sending JSON request to Local...");
  const res = await fetch('http://localhost:3000/api/interpreter/audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64: base64,
      format: 'audio/webm;codecs=opus',
      langA: 'zh',
      langB: 'vi'
    }),
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}
test().catch(console.error);
