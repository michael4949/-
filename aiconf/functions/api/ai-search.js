/**
 * Cloudflare Pages Functions 适配器 —— 部署后可用 /api/ai-search
 *
 * Cloudflare 把环境变量放在 context.env 而不是 process.env，
 * 除此之外与 Vercel 版走的是同一份核心逻辑。
 */
import { handleSearch } from "../../api/_core.js";

export const onRequest = (context) => handleSearch(context.request, context.env);
