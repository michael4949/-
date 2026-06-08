"""统一日志：控制台 + 文件（用于审计追溯）。"""
from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Optional

_CONFIGURED = False


def setup_logging(log_dir: Optional[Path] = None, level: int = logging.INFO) -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return
    handlers: list[logging.Handler] = []

    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(fmt)
    handlers.append(console)

    if log_dir is not None:
        log_dir = Path(log_dir)
        log_dir.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_dir / "bid_agent.log", encoding="utf-8")
        file_handler.setFormatter(fmt)
        handlers.append(file_handler)

    root = logging.getLogger("bid_agent")
    root.setLevel(level)
    root.handlers.clear()
    for h in handlers:
        root.addHandler(h)
    root.propagate = False
    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    if not _CONFIGURED:
        setup_logging()
    return logging.getLogger(f"bid_agent.{name}")
