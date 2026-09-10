/**
 * Vercel 适配器 —— 部署后可用 /api/ai-search
 *
 * 用 Edge Runtime：冷启动快，且签名与 Cloudflare 一致（都是标准 Request/Response），
 * 所以两个平台能共用 _core.js 里的同一份逻辑。
 */
import { handleSearch } from "./_core.js";

export const config = { runtime: "edge" };

export default function handler(request) {
  return handleSearch(request, process.env);
}
