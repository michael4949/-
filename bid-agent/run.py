"""启动 Web 服务。

用法：
    python run.py                 # 默认 0.0.0.0:8000
    BID_PORT=9000 python run.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from bid_agent.config import get_config  # noqa: E402
from bid_agent.logging_utils import setup_logging  # noqa: E402


def main() -> None:
    cfg = get_config()
    setup_logging(cfg.logs_dir)
    import uvicorn

    print("=" * 60)
    print(" 智能标书生成系统 · 本地大模型 + Agent + RAG")
    print(f" 访问地址： http://localhost:{cfg.port}")
    print(f" 大模型：  {cfg.llm_model}（mode={cfg.llm_mode}） @ {cfg.ollama_base_url}")
    print(" 未连接 Ollama 时将自动使用内置降级引擎，系统仍可完整运行。")
    print("=" * 60)
    uvicorn.run("bid_agent.web.app:app", host=cfg.host, port=cfg.port, log_level="info")


if __name__ == "__main__":
    main()
