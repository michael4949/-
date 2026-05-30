#!/bin/bash
# Mnemo 一键启动（macOS）—— 在访达里双击本文件即可
# 它会：检查环境 → 可选地配置 Claude → 启动大脑(后端)和网页(前端) → 打开浏览器
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "══════════════════════════════════════════════"
echo "   Mnemo 启动中…"
echo "══════════════════════════════════════════════"

# 1) 检查 Python 和 Node
if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ 还没装 Python。请到 https://www.python.org/downloads/ 下载安装后，重新双击本文件。"
  read -p "按回车关闭这个窗口…"; exit 1
fi
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "❌ 还没装 Node.js。请到 https://nodejs.org （选 LTS 版）下载安装后，重新双击本文件。"
  read -p "按回车关闭这个窗口…"; exit 1
fi
echo "✅ 环境就绪：$(python3 --version), node $(node --version)"

# 2) 还没接 Claude 的话，问一次（直接回车 = 先用离线模式）
if ! python3 -c "import sys; sys.path.insert(0,'core'); from mnemo.config import MnemoConfig; sys.exit(0 if MnemoConfig.load().get_anthropic_key() else 1)" 2>/dev/null; then
  echo ""
  echo "▎还没接 Claude 大脑。去 https://console.anthropic.com → API Keys 拿一个 key（sk-ant- 开头）。"
  read -p "  粘贴 key 然后回车（不想接就直接回车，用离线模式）: " KEY
  if [ -n "$KEY" ]; then
    ( cd "$DIR/core" && python3 -m mnemo.cli setup --key "$KEY" ) || true
  fi
fi

# 3) 启动后端大脑
echo ""
echo "▎启动大脑（后端）…"
( cd "$DIR/core" && python3 -m mnemo.cli serve ) &
API_PID=$!

# 4) 首次运行装一下网页依赖
if [ ! -d "$DIR/node_modules" ]; then
  echo "▎首次运行，安装网页依赖（约几十秒，请稍候）…"
  npm install --silent
fi

# 5) 启动前端网页
echo "▎启动网页（前端）…"
( npm run dev ) &
WEB_PID=$!

# 关闭时一并停掉两个进程
trap 'echo ""; echo "正在关闭…"; kill $API_PID $WEB_PID 2>/dev/null; exit 0' INT TERM EXIT

# 6) 等网页起来后打开浏览器
sleep 4
open http://localhost:3000 2>/dev/null || true
echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ 已启动！浏览器没自动打开就手动访问： http://localhost:3000"
echo "  关闭：回到这个窗口，按 Control + C"
echo "══════════════════════════════════════════════"

wait
