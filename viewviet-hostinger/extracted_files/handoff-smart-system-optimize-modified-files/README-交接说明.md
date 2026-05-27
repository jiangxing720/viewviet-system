# Smart-System-Optimize 修改文件交接说明

这个包只包含本次修改过、需要交给 Antigravity 合并的文件，目录结构保持和原项目一致。

## 覆盖文件

- `artifacts/api-server/src/routes/interpreter.ts`
  - 修复口译语言识别映射。
  - 翻译模型改为 `AI_TEXT_MODEL` 可配置。
  - 语音识别模型改为 `AI_SPEECH_MODEL` 可配置。
  - AI 未配置时返回明确错误。

- `artifacts/viewviet/src/hooks/use-interpreter.ts`
  - 增加浏览器实时语音识别字幕。
  - 修复上传音频格式判断。
  - 同步当前说话人状态。

- `artifacts/viewviet/src/pages/interpreter.tsx`
  - 增加实时同声传译状态提示。
  - 增加自动播报开关。
  - 支持点击译文重播。

- `artifacts/api-server/src/routes/legal.ts`
  - 法律文章搜索扩展到标题、英文/越文标题、摘要、正文。
  - 法律文档搜索扩展到多语言标题、文号、正文。
  - 新增 `/api/admin/legal-articles/import-text`，用于公众号复制全文一键生成。
  - 新增 `/api/admin/ai/status`。
  - AI 模型改为 `AI_TEXT_MODEL` 可配置。

- `artifacts/viewviet/src/pages/admin/legal.tsx`
  - 后台法律文章页增加“公众号复制全文导入”输入框和一键生成按钮。

- `artifacts/api-server/src/routes/cards.ts`
  - 小红书分享图 AI 文案和图片模型可配置。
  - 图片接口兼容 URL 和 base64 返回。

- `artifacts/viewviet/src/components/ShareCardGenerator.tsx`
  - 支持直接渲染 base64 图片，不再强制走图片代理。

- `artifacts/api-server/src/routes/words.ts`
  - 单词搜索扩展到发音、越文释义、例句、例句翻译。

- `package.json`
  - 修复本机 macOS 构建需要的平台二进制依赖。

- `pnpm-lock.yaml`
  - 与 `package.json` 对应的 lockfile 更新。

## 环境变量建议

后端至少确认这些变量存在：

```env
DATABASE_URL=...
SESSION_SECRET=...
AI_INTEGRATIONS_OPENAI_API_KEY=...
AI_INTEGRATIONS_OPENAI_BASE_URL=...
AI_TEXT_MODEL=gpt-4.1
AI_IMAGE_MODEL=gpt-image-1
AI_SPEECH_MODEL=whisper-1
```

如果使用 OpenAI 官方接口，`AI_INTEGRATIONS_OPENAI_BASE_URL` 可以不填。

## 已验证命令

```bash
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/viewviet typecheck
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/viewviet build
```

## 部署提醒

这次同时改了前端和后端源码。线上要生效，需要：

1. 重新部署后端。
2. 重新构建并替换前端静态文件。
3. 确认后端环境变量已配置 AI Key、数据库连接和 Session Secret。

