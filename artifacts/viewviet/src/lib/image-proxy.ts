const BASE = (import.meta.env.VITE_API_URL as string) || "";

/**
 * Wraps any external image URL with the server-side image proxy endpoint.
 * This bypasses CORS / hotlink protection from WeChat CDN and other platforms.
 * Local paths, data URIs, and blob URLs are returned unchanged.
 */
export function proxyImage(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return url;
  return `${BASE}/api/proxy-image?url=${encodeURIComponent(url)}`;
}
