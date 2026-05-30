"""The Mnemo agent runtime — where the five layers meet.

Per run:
  1. open/resume a session; take a *frozen* snapshot of prompt memory (L4)
  2. assemble a small system prompt = directives + skills Level-0 (L2) + memory
  3. loop: model → tool calls → results, persisting every turn to SQLite (L5)
     compacting the middle of the transcript when it grows (L1)
  4. epilogue: index the session for semantic recall (L3) and run the
     self-evolution loop that may author/patch a SKILL.md (L2)
"""

from __future__ import annotations

from typing import Iterator, Optional

from .config import MnemoConfig
from .llm import LLMProvider, build_provider
from .memory.manager import MemoryManager
from .skills.evolution import SkillEvolver
from .skills.manager import SkillManager
from .tools import ToolContext, ToolRegistry, default_registry
from .types import AgentEvent, EventType, Message, Role

_SYSTEM_TEMPLATE = """\
You are Mnemo, a self-evolving assistant. You get sharper over time by writing
down reusable procedures (skills) and durable facts (memory).

Operating principles:
- Prefer acting with tools over guessing. Take the smallest correct step.
- Consult skills before complex tasks (skill_view). Reuse what you already know.
- When you learn a reusable, multi-step procedure, capture it with skill_manage.
- Persist durable facts with `remember`; pull older context with `recall` /
  `session_search` only when you actually need it (keep context lean).

## Skills (Level 0 — name [category]: description)
{skills}

## Durable memory (frozen snapshot for this session)
{memory}
"""


class Agent:
    def __init__(
        self,
        config: MnemoConfig,
        *,
        provider: Optional[LLMProvider] = None,
        memory: Optional[MemoryManager] = None,
        skills: Optional[SkillManager] = None,
        evolver: Optional[SkillEvolver] = None,
        registry: Optional[ToolRegistry] = None,
        workdir: str = ".",
    ):
        self.config = config
        # Provider is built lazily (see the `provider` property) so that read-only
        # work (memory/skills) never fails just because, say, Claude is misconfigured.
        self._provider = provider
        self.memory = memory or MemoryManager(config)
        self.skills = skills or SkillManager(config.skills_dir)
        self.evolver = evolver or SkillEvolver(self.skills, toolcall_threshold=config.skill_toolcall_threshold)
        self.context = ToolContext(config, self.memory, self.skills, workdir=workdir)
        self.registry = registry or default_registry(self.context)
        self.workdir = workdir

    @property
    def provider(self) -> LLMProvider:
        """Build the LLM provider on first use, then cache it."""
        if self._provider is None:
            self._provider = build_provider(self.config)
        return self._provider

    # ----- prompt assembly ---------------------------------------------
    def build_system_prompt(self) -> str:
        skills_l0 = self.skills.level0()
        memory = self.memory.frozen_prompt_memory().strip() or "(none yet)"
        return _SYSTEM_TEMPLATE.format(skills=skills_l0, memory=memory)

    # ----- the loop -----------------------------------------------------
    def run(self, user_input: str, *, session_id: Optional[str] = None, channel: str = "cli") -> Iterator[AgentEvent]:
        if session_id is None:
            session_id = self.memory.start_session(channel=channel)
            transcript: list[Message] = []
        else:
            transcript = self.memory.load_transcript(session_id)
        self.context.session_id = session_id
        self.context.transcript = transcript

        system = self.build_system_prompt()  # frozen at session start

        user_msg = Message(role=Role.USER, content=user_input)
        transcript.append(user_msg)
        self.memory.record(session_id, user_msg)

        steps = 0
        final_text = ""
        while steps < self.config.max_steps:
            steps += 1
            yield from self._maybe_compact(transcript)

            response = self.provider.complete(transcript, system=system, tools=self.registry.schemas())

            if response.text and response.wants_tools:
                yield AgentEvent(EventType.ASSISTANT, text=response.text)
            if not response.wants_tools:
                final_text = response.text
                final_msg = Message(role=Role.ASSISTANT, content=final_text)
                transcript.append(final_msg)
                self.memory.record(session_id, final_msg)
                yield AgentEvent(EventType.ASSISTANT, text=final_text, data={"final": True})
                break

            # Persist the assistant tool-call turn, then execute each call.
            assistant_msg = Message(role=Role.ASSISTANT, content=response.text, tool_calls=response.tool_calls)
            transcript.append(assistant_msg)
            self.memory.record(session_id, assistant_msg)

            for call in response.tool_calls:
                yield AgentEvent(EventType.TOOL_CALL, text=call.name, data={"arguments": call.arguments, "id": call.id})
                result = self.registry.execute(call.name, call.arguments, self.context)
                result.tool_call_id = call.id
                tool_msg = Message(role=Role.TOOL, content=result.content, name=call.name, tool_call_id=call.id)
                transcript.append(tool_msg)
                self.context.transcript = transcript
                self.memory.record(session_id, tool_msg)
                yield AgentEvent(
                    EventType.TOOL_RESULT,
                    text=result.content,
                    data={"tool": call.name, "is_error": result.is_error, "id": call.id},
                )
        else:
            yield AgentEvent(EventType.ERROR, text=f"stopped after {self.config.max_steps} steps without finishing")

        # ----- epilogue: index for recall + self-evolve ----------------
        yield from self._epilogue(session_id, transcript, final_text)

    def _epilogue(self, session_id: str, transcript: list[Message], final_text: str) -> Iterator[AgentEvent]:
        summary = self._summarize_session(transcript, final_text)
        self.memory.index_session(session_id, summary)

        if self.config.auto_evolve:
            result = self.evolver.evolve(transcript)
            if result.action in ("created", "updated"):
                yield AgentEvent(
                    EventType.SKILL_LEARNED,
                    text=f"{result.action} skill '{result.skill_name}'",
                    data={"action": result.action, "name": result.skill_name, "reason": result.reason},
                )

        yield AgentEvent(EventType.FINAL, text=final_text, data={"session_id": session_id, "summary": summary})

    # ----- context management (Layer 1) --------------------------------
    def _maybe_compact(self, transcript: list[Message]) -> Iterator[AgentEvent]:
        threshold = self.config.compact_threshold
        if len(transcript) <= threshold:
            return
        from .config import KEEP_HEAD, KEEP_TAIL

        head = transcript[:KEEP_HEAD]
        tail = transcript[-KEEP_TAIL:]
        middle = transcript[KEEP_HEAD:-KEEP_TAIL]
        if not middle:
            return
        blob = "\n".join(m.short(200) for m in middle)
        summary = self.provider.summarize(blob, max_chars=800)
        note = Message(role=Role.ASSISTANT, content=f"[compacted {len(middle)} earlier turns]\n{summary}")
        transcript[:] = head + [note] + tail
        self.context.transcript = transcript
        yield AgentEvent(EventType.COMPACTED, text=f"compacted {len(middle)} turns", data={"kept": len(transcript)})

    # ----- helpers ------------------------------------------------------
    def _summarize_session(self, transcript: list[Message], final_text: str) -> str:
        goal = next((m.content for m in transcript if m.role == Role.USER), "")
        tools = [tc.name for m in transcript if m.role == Role.ASSISTANT for tc in m.tool_calls]
        parts = []
        if goal:
            parts.append(f"Goal: {' '.join(goal.split())[:200]}")
        if tools:
            parts.append("Tools: " + ", ".join(dict.fromkeys(tools)))
        if final_text:
            parts.append(f"Outcome: {' '.join(final_text.split())[:200]}")
        return " | ".join(parts)

    # ----- convenience --------------------------------------------------
    def run_collect(self, user_input: str, *, session_id: Optional[str] = None) -> tuple[str, list[AgentEvent]]:
        """Drain the generator; return (final_answer, all_events). Handy for tests/scripts."""
        events = list(self.run(user_input, session_id=session_id))
        answer = ""
        for ev in events:
            if ev.type == EventType.FINAL:
                answer = ev.text
            elif ev.type == EventType.ASSISTANT and ev.data.get("final"):
                answer = ev.text
        return answer, events
