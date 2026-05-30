"""LLM provider abstraction.

The agent core only depends on :class:`LLMProvider`. Concrete providers:
  - :class:`ScriptedProvider`   offline, deterministic — drives tests & demos
  - :class:`AnthropicProvider`  real Claude (lazy SDK import)
"""

from __future__ import annotations

from ..config import MnemoConfig
from .base import LLMProvider
from .scripted import ScriptedProvider


def build_provider(config: MnemoConfig) -> LLMProvider:
    """Factory: pick a provider from config, failing soft to scripted."""
    name = (config.provider or "scripted").lower()
    if name in ("scripted", "offline", "mock"):
        return ScriptedProvider()
    if name in ("anthropic", "claude"):
        from .anthropic_provider import AnthropicProvider  # lazy: optional SDK

        return AnthropicProvider(model=config.model, api_key=config.get_anthropic_key())
    raise ValueError(f"Unknown provider: {config.provider!r}")


__all__ = ["LLMProvider", "ScriptedProvider", "build_provider"]
