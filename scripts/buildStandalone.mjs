/**
 * 把「标书智能工厂」打包成一个独立 HTML 文件（standalone/标书智能工厂.html）：
 * React + 工作流 + docx 排版引擎全部内联，双击即可在浏览器打开使用，无需 Node/构建。
 * 仅样式（Tailwind CDN）与 Gemini API 调用需要联网。
 *
 * 运行：npm run build:standalone
 */
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";

const result = await build({
  entryPoints: ["bid.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  write: false,
  legalComments: "none",
  charset: "utf8", // 中文字符串保持原样（HTML 为 UTF-8），文件更小
  alias: {
    // Anthropic SDK 的本机凭证链代码动态 import 这些 Node 内置模块，浏览器里不会执行
    "node:fs": "./scripts/shims/node-empty.mjs",
    "node:path": "./scripts/shims/node-empty.mjs",
    "node:os": "./scripts/shims/node-empty.mjs",
  },

  define: {
    "process.env.API_KEY": '""',
    "process.env.GEMINI_API_KEY": '""',
    "process.env.ANTHROPIC_API_KEY": '""',
    "process.env.NODE_ENV": '"production"',
  },
});

// 内联脚本里不允许出现 "</script"，转义防止提前闭合标签
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>标书智能工厂 · 招标文件一键生成国标板式投标文件（独立版）</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<script>
  tailwind.config = { theme: { extend: { fontFamily: { sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'] } } } };
  window.__BID_STANDALONE__ = true;
</script>
<style>
  html, body { font-family: 'Noto Sans SC', system-ui, sans-serif; background-color: #05070d; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
</style>
</head>
<body>
<div id="root"></div>
<noscript>需要启用 JavaScript 才能使用。</noscript>
<script>
${js}
</script>
</body>
</html>
`;

mkdirSync("standalone", { recursive: true });
const out = "standalone/标书智能工厂.html";
writeFileSync(out, html);
console.log(`✅ 已生成 ${out}（${(html.length / 1024 / 1024).toFixed(2)} MB）`);
console.log("   双击用 Chrome/Edge 打开即可使用；样式与 Claude（Anthropic API）调用需联网。");
