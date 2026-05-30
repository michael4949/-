"""Tests for the Claude provider (mocked SDK) and persisted config/credentials."""

import sys
import types as pytypes

import pytest

from mnemo.config import MnemoConfig
from mnemo.types import Message, Role, ToolCall


def _fake_anthropic(captured: dict):
    """A stand-in 'anthropic' module so we can test translation without a network."""
    mod = pytypes.ModuleType("anthropic")

    class TextBlock:
        type = "text"

        def __init__(self, text):
            self.text = text

    class ToolBlock:
        type = "tool_use"

        def __init__(self, id, name, input):
            self.id, self.name, self.input = id, name, input

    class Usage:
        input_tokens = 10
        output_tokens = 5

    class Resp:
        def __init__(self, content):
            self.content = content
            self.usage = Usage()

    class Messages:
        def create(self, **kwargs):
            captured.update(kwargs)
            return Resp([TextBlock("thinking"), ToolBlock("call_1", "write_file", {"path": "a.txt"})])

    class Anthropic:
        def __init__(self, **kwargs):
            self.kwargs = kwargs
            self.messages = Messages()

    mod.Anthropic = Anthropic
    return mod


def test_provider_translates_request_and_parses_response(monkeypatch):
    captured: dict = {}
    monkeypatch.setitem(sys.modules, "anthropic", _fake_anthropic(captured))
    from mnemo.llm.anthropic_provider import AnthropicProvider

    prov = AnthropicProvider(model="claude-x", api_key="sk-test")
    msgs = [
        Message(role=Role.USER, content="hi"),
        Message(role=Role.ASSISTANT, tool_calls=[ToolCall(id="c1", name="read_file", arguments={"path": "x"})]),
        Message(role=Role.TOOL, content="file contents", name="read_file", tool_call_id="c1"),
    ]
    resp = prov.complete(
        msgs,
        system="SYS",
        tools=[{"name": "write_file", "description": "w", "parameters": {"type": "object"}}],
    )

    # system prompt is sent as a cache-controlled block (prompt caching)
    assert captured["system"][0]["cache_control"]["type"] == "ephemeral"
    # tool schema mapped to Anthropic's input_schema
    assert captured["tools"][0]["input_schema"]["type"] == "object"
    # transcript translated: user, assistant(tool_use), user(tool_result)
    assert [m["role"] for m in captured["messages"]] == ["user", "assistant", "user"]
    assert captured["messages"][1]["content"][0]["type"] == "tool_use"
    assert captured["messages"][2]["content"][0]["type"] == "tool_result"
    # response parsed into our types
    assert resp.text == "thinking"
    assert resp.tool_calls[0].name == "write_file"
    assert resp.usage["input_tokens"] == 10


def test_provider_requires_a_key(monkeypatch):
    monkeypatch.setitem(sys.modules, "anthropic", _fake_anthropic({}))
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    from mnemo.llm.anthropic_provider import AnthropicProvider

    with pytest.raises(RuntimeError):
        AnthropicProvider(model="x", api_key=None)


def test_config_persists_preferences_and_key(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("MNEMO_PROVIDER", raising=False)
    monkeypatch.delenv("MNEMO_MODEL", raising=False)

    cfg = MnemoConfig.load(home=tmp_path)
    assert cfg.provider == "scripted"  # default
    cfg.save_preferences(provider="anthropic", model="claude-x")
    cfg.set_anthropic_key("sk-secret-123456")

    # A fresh load reflects the persisted preferences + key.
    again = MnemoConfig.load(home=tmp_path)
    assert again.provider == "anthropic"
    assert again.model == "claude-x"
    assert again.get_anthropic_key() == "sk-secret-123456"


def test_env_overrides_persisted_provider(tmp_path, monkeypatch):
    cfg = MnemoConfig.load(home=tmp_path)
    cfg.save_preferences(provider="anthropic")
    monkeypatch.setenv("MNEMO_PROVIDER", "scripted")  # env wins over file
    assert MnemoConfig.load(home=tmp_path).provider == "scripted"
