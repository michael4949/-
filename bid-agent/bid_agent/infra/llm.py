"""大模型推理抽象。

设计目标：
  1. 默认对接本地 Ollama（数据不出域）。
  2. 当 Ollama 不可用时，``available`` 为 False；上层各模块据此切换到
     基于规则 / 模板 / 检索的确定性逻辑，保证系统离线也能跑通全流程。
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

import requests

from ..config import Config, get_config
from ..logging_utils import get_logger

log = get_logger("infra.llm")


class LLMUnavailable(RuntimeError):
    pass


class BaseLLM:
    """大模型接口。"""

    name: str = "base"
    available: bool = False

    def generate(
        self,
        prompt: str,
        *,
        system: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        raise NotImplementedError

    def generate_json(
        self,
        prompt: str,
        *,
        system: Optional[str] = None,
        temperature: float = 0.0,
    ) -> Any:
        """要求模型输出 JSON，并稳健解析。"""
        sys_prompt = (system or "") + "\n请只输出 JSON，不要包含任何解释或 Markdown 代码块标记。"
        raw = self.generate(prompt, system=sys_prompt, temperature=temperature)
        return _extract_json(raw)


class NullLLM(BaseLLM):
    """占位实现：表示当前无可用大模型。"""

    name = "null"
    available = False

    def generate(self, prompt: str, **_: Any) -> str:  # noqa: D401
        raise LLMUnavailable("当前没有可用的大模型后端（Ollama 未连接）。")


class OllamaLLM(BaseLLM):
    """对接本地 Ollama 推理服务。"""

    def __init__(self, config: Optional[Config] = None):
        self.cfg = config or get_config()
        self.name = self.cfg.llm_model
        self.base_url = self.cfg.ollama_base_url.rstrip("/")
        self.available = self._check()

    def _check(self) -> bool:
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=3)
            if r.status_code != 200:
                return False
            models = [m.get("name", "") for m in r.json().get("models", [])]
            if models and self.cfg.llm_model not in models:
                # 模型未拉取，但服务在线——仍可用（生成时给出提示）
                log.warning(
                    "Ollama 在线，但未发现模型 %s；已有：%s", self.cfg.llm_model, models
                )
            return True
        except Exception as e:  # 连接失败 -> 不可用
            log.info("Ollama 不可用（将使用降级引擎）：%s", e)
            return False

    def generate(
        self,
        prompt: str,
        *,
        system: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        payload: Dict[str, Any] = {
            "model": self.cfg.llm_model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": self.cfg.temperature if temperature is None else temperature,
                "num_predict": max_tokens or self.cfg.max_tokens,
            },
        }
        if system:
            payload["system"] = system
        try:
            r = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.cfg.request_timeout,
            )
            r.raise_for_status()
            return r.json().get("response", "").strip()
        except Exception as e:
            raise LLMUnavailable(f"Ollama 生成失败：{e}") from e


def get_llm(config: Optional[Config] = None) -> BaseLLM:
    """工厂：根据配置与可用性返回 LLM 实例。"""
    cfg = config or get_config()
    mode = (cfg.llm_mode or "auto").lower()
    if mode == "off":
        log.info("LLM 模式 = off：使用降级引擎")
        return NullLLM()
    llm = OllamaLLM(cfg)
    if llm.available:
        log.info("已连接 Ollama（模型 %s）", cfg.llm_model)
        return llm
    if mode == "on":
        log.warning("LLM 模式 = on，但 Ollama 不可用；仍降级运行")
    return NullLLM()


# ----------------------------- 工具 -----------------------------
_JSON_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)


def _extract_json(raw: str) -> Any:
    """从模型输出中稳健地提取 JSON。"""
    if not raw:
        raise ValueError("空响应")
    text = raw.strip()
    m = _JSON_FENCE.search(text)
    if m:
        text = m.group(1).strip()
    # 尝试直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # 回退：截取首个 { 或 [ 到最后一个 } 或 ]
    for open_ch, close_ch in (("{", "}"), ("[", "]")):
        start = text.find(open_ch)
        end = text.rfind(close_ch)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                continue
    raise ValueError(f"无法从响应中解析 JSON：{raw[:200]}")
