"""Provider-neutral interface every LLM backend implements."""

from __future__ import annotations

from abc import ABC, abstractmethod

from ..types import LLMResponse, Message


class LLMProvider(ABC):
    """A minimal contract: given a transcript + tools, produce the next step.

    A "step" is either visible assistant text, a set of tool calls, or both.
    The agent loop keeps calling :meth:`complete` until no tool calls come back.
    """

    name: str = "base"

    @abstractmethod
    def complete(
        self,
        messages: list[Message],
        *,
        system: str = "",
        tools: list[dict] | None = None,
    ) -> LLMResponse:
        """Return the next assistant step.

        Args:
            messages: full transcript (user/assistant/tool messages).
            system:   the assembled system prompt (skills L0 + frozen memory + rules).
            tools:    JSON-schema tool definitions the model may call.
        """
        raise NotImplementedError

    def summarize(self, text: str, *, max_chars: int = 600) -> str:
        """Best-effort summary used for context compression / memory merge.

        Providers may override with a real LLM call; the default is extractive
        so the core never hard-depends on a network round-trip.
        """
        text = text.strip()
        if len(text) <= max_chars:
            return text
        head = text[: max_chars - 80].rsplit(" ", 1)[0]
        return head + " …[truncated]"
