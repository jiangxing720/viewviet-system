import { exec } from 'child_process';
const proc = exec('node ./dist/index.mjs', { cwd: 'artifacts/api-server', env: { ...process.env, PORT: 3000, AI_INTEGRATIONS_OPENAI_API_KEY: "sk-8ii3TSugE5IMLZr0luilMjoncLEQQg7DQC64PJdNllI5WsPj", AI_INTEGRATIONS_OPENAI_BASE_URL: "https://api.ssopen.top/v1", DATABASE_URL: "postgres://..." } });
proc.stdout.pipe(process.stdout);
proc.stderr.pipe(process.stderr);
setTimeout(() => proc.kill(), 10000);
