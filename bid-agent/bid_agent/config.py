"""全局配置。

配置优先级：环境变量 > config.yaml > 代码默认值。
所有路径默认落在 <项目根>/data 下，保证「数据不出域」。
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, Optional

# 项目根目录：.../bid-agent
ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATA_DIR = ROOT_DIR / "data"


def _env(name: str, default: Optional[str] = None) -> Optional[str]:
    val = os.environ.get(name)
    return val if val not in (None, "") else default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


def _env_float(name: str, default: float) -> float:
    raw = os.environ.get(name)
    try:
        return float(raw) if raw not in (None, "") else default
    except (TypeError, ValueError):
        return default


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    try:
        return int(raw) if raw not in (None, "") else default
    except (TypeError, ValueError):
        return default


@dataclass
class Config:
    """系统配置。"""

    # ---- 基础设施层：本地大模型（Ollama）----
    # 留空则自动探测；探测失败时降级到内置确定性引擎，保证离线可运行。
    ollama_base_url: str = field(default_factory=lambda: _env("OLLAMA_BASE_URL", "http://localhost:11434"))
    llm_model: str = field(default_factory=lambda: _env("BID_LLM_MODEL", "qwen2.5:7b-instruct"))
    embed_model: str = field(default_factory=lambda: _env("BID_EMBED_MODEL", "nomic-embed-text"))
    # auto / on / off：是否使用 Ollama。auto = 探测可用性。
    llm_mode: str = field(default_factory=lambda: _env("BID_LLM_MODE", "auto"))
    temperature: float = field(default_factory=lambda: _env_float("BID_TEMPERATURE", 0.3))
    max_tokens: int = field(default_factory=lambda: _env_int("BID_MAX_TOKENS", 2048))
    request_timeout: int = field(default_factory=lambda: _env_int("BID_LLM_TIMEOUT", 120))

    # ---- 向量化与检索层 ----
    # local（内置纯 Python 向量库，零依赖）或 chroma（需安装 chromadb）
    vector_backend: str = field(default_factory=lambda: _env("BID_VECTOR_BACKEND", "local"))
    chunk_size: int = field(default_factory=lambda: _env_int("BID_CHUNK_SIZE", 600))
    chunk_overlap: int = field(default_factory=lambda: _env_int("BID_CHUNK_OVERLAP", 120))
    retrieve_top_k: int = field(default_factory=lambda: _env_int("BID_TOP_K", 6))
    # 混合检索中向量得分的权重（0~1），其余分配给关键词得分
    hybrid_alpha: float = field(default_factory=lambda: _env_float("BID_HYBRID_ALPHA", 0.6))

    # ---- 生成 ----
    max_parallel_sections: int = field(default_factory=lambda: _env_int("BID_MAX_PARALLEL", 4))

    # ---- 路径 ----
    data_dir: Path = field(default_factory=lambda: Path(_env("BID_DATA_DIR", str(DEFAULT_DATA_DIR))))

    # ---- Web ----
    host: str = field(default_factory=lambda: _env("BID_HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: _env_int("BID_PORT", 8000))

    def __post_init__(self) -> None:
        self.data_dir = Path(self.data_dir)
        for sub in (self.kb_dir, self.uploads_dir, self.outputs_dir, self.store_dir, self.logs_dir):
            sub.mkdir(parents=True, exist_ok=True)

    # ---- 派生路径 ----
    @property
    def runtime_dir(self) -> Path:
        return self.data_dir / "runtime"

    @property
    def kb_dir(self) -> Path:
        """知识库向量与文档元数据。"""
        return self.runtime_dir / "knowledge_base"

    @property
    def uploads_dir(self) -> Path:
        return self.runtime_dir / "uploads"

    @property
    def outputs_dir(self) -> Path:
        return self.runtime_dir / "outputs"

    @property
    def store_dir(self) -> Path:
        return self.runtime_dir / "store"

    @property
    def logs_dir(self) -> Path:
        return self.runtime_dir / "logs"

    @property
    def templates_dir(self) -> Path:
        return self.data_dir / "templates"

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["data_dir"] = str(self.data_dir)
        return d

    @classmethod
    def load(cls, yaml_path: Optional[Path] = None) -> "Config":
        """从 yaml 加载（若存在），随后环境变量覆盖。"""
        values: Dict[str, Any] = {}
        path = yaml_path or (ROOT_DIR / "config.yaml")
        if path and Path(path).exists():
            try:
                import yaml  # type: ignore

                with open(path, "r", encoding="utf-8") as f:
                    values = yaml.safe_load(f) or {}
            except Exception:
                values = {}
        cfg = cls(**{k: v for k, v in values.items() if k in cls.__dataclass_fields__})
        return cfg


# 进程级单例
_CONFIG: Optional[Config] = None


def get_config() -> Config:
    global _CONFIG
    if _CONFIG is None:
        _CONFIG = Config.load()
    return _CONFIG


def set_config(cfg: Config) -> None:
    global _CONFIG
    _CONFIG = cfg
