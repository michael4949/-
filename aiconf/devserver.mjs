/**
 * 本地开发服务器 —— 在本机完整跑通「静态页面 + 后端检索代理」，部署前先验一遍。
 *
 *   GEMINI_API_KEY=你的密钥 node aiconf/devserver.mjs
 *   然后打开 http://localhost:8787
 *
 * 不带密钥也能启动，此时页面会自动退回「自带密钥」模式 —— 正好可以验证两条路径。
 * 生产环境不要用它，用 Vercel / Cloudflare 的托管运行时（见 README）。
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handleSearch } from "./api/_core.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 8787);

const MIME = {
  ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/ai-search") {
    const r = await handleSearch(new Request(url, { method: req.method }), process.env);
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(await r.text());
    return;
  }

  // 只允许读取本目录内的文件，挡掉 ../ 穿越
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = join(ROOT, rel === "/" || rel === "\\" ? "index.html" : rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end("Forbidden"); return; }

  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }
}).listen(PORT, () => {
  const mode = process.env.GEMINI_API_KEY ? "服务端代理（所有访客可用）" : "自带密钥（未设 GEMINI_API_KEY）";
  console.log(`AI 会期雷达 → http://localhost:${PORT}`);
  console.log(`实时检索模式：${mode}`);
});
