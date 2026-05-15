const IMG_PROXY = "/api/proxy-image?url=";

export function parseMarkdown(md: string): string {
  if (!md || !md.trim()) return "";

  // Step 1: Extract images BEFORE HTML escaping so URLs stay intact
  const imgStore: string[] = [];
  let processed = md.replace(/!\[([^\]]*)\]\(([^)\s]+(?:[^)])*)\)/g, (_, alt, src) => {
    const trimSrc = src.trim();
    const proxied = trimSrc.startsWith("http") ? `${IMG_PROXY}${encodeURIComponent(trimSrc)}` : trimSrc;
    const safeAlt = alt.replace(/"/g, "&quot;");
    imgStore.push(`<img src="${proxied}" alt="${safeAlt}" class="max-w-full h-auto rounded-lg my-4 block mx-auto" />`);
    return `\x00IMG${imgStore.length - 1}\x00`;
  });

  // Step 2: HTML escape
  let html = processed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Step 3: Restore image tags
  html = html.replace(/\x00IMG(\d+)\x00/g, (_, i) => imgStore[parseInt(i, 10)]);

  // Step 4: Block-level markdown
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-base font-bold mt-4 mb-1">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-5 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-7 mb-3">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>');
  html = html.replace(/^---+$/gm, '<hr class="my-6 border-border" />');

  // Step 5: Inline markdown
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-sm font-mono">$1</code>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary underline hover:opacity-80" target="_blank" rel="noopener">$1</a>');

  // Step 6: Line-by-line: lists and paragraphs
  const lines = html.split("\n");
  const result: string[] = [];
  let inUl = false;
  let inOl = false;
  let paraBuffer: string[] = [];

  const flushPara = () => {
    if (paraBuffer.length > 0) {
      const text = paraBuffer.join("<br>");
      if (text.trim()) {
        result.push(`<p class="mb-4 leading-relaxed">${text}</p>`);
      }
      paraBuffer = [];
    }
  };

  for (const line of lines) {
    const ulMatch = line.match(/^[-*] (.+)$/);
    const olMatch = line.match(/^\d+\. (.+)$/);
    // Block-level tags: headings, hr, and restored img/block tags
    const isBlock = /^<(h[1-6]|hr|img)/.test(line);

    if (isBlock) {
      flushPara();
      if (inUl) { result.push("</ul>"); inUl = false; }
      if (inOl) { result.push("</ol>"); inOl = false; }
      result.push(line);
    } else if (ulMatch) {
      flushPara();
      if (inOl) { result.push("</ol>"); inOl = false; }
      if (!inUl) { result.push('<ul class="list-disc pl-6 mb-4 space-y-1">'); inUl = true; }
      result.push(`<li class="leading-relaxed">${ulMatch[1]}</li>`);
    } else if (olMatch) {
      flushPara();
      if (inUl) { result.push("</ul>"); inUl = false; }
      if (!inOl) { result.push('<ol class="list-decimal pl-6 mb-4 space-y-1">'); inOl = true; }
      result.push(`<li class="leading-relaxed">${olMatch[1]}</li>`);
    } else {
      if (inUl) { result.push("</ul>"); inUl = false; }
      if (inOl) { result.push("</ol>"); inOl = false; }
      if (line.trim() === "") {
        flushPara();
      } else {
        paraBuffer.push(line);
      }
    }
  }

  if (inUl) result.push("</ul>");
  if (inOl) result.push("</ol>");
  flushPara();

  return result.join("\n");
}
