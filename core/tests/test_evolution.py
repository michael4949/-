from mnemo.skills.evolution import SkillEvolver
from mnemo.skills.manager import SkillManager
from mnemo.types import Message, Role, ToolCall


def _assistant_call(name, args):
    return Message(role=Role.ASSISTANT, tool_calls=[ToolCall.create(name, args)])


def _tool_result(name, content, call_id):
    return Message(role=Role.TOOL, content=content, name=name, tool_call_id=call_id)


def _transcript_with_n_calls(n):
    t = [Message(role=Role.USER, content="set up the project notes and verify them")]
    for i in range(n):
        call = ToolCall.create("write_file", {"path": f"f{i}.txt", "content": "x"})
        t.append(Message(role=Role.ASSISTANT, tool_calls=[call]))
        t.append(_tool_result("write_file", "wrote 1 chars", call.id))
    t.append(Message(role=Role.ASSISTANT, content="all done"))
    return t


def test_assess_triggers_on_complex_task(tmp_path):
    ev = SkillEvolver(SkillManager(tmp_path / "skills"), toolcall_threshold=5)
    worthy, reason = ev.assess(_transcript_with_n_calls(5))
    assert worthy and "complex" in reason


def test_assess_skips_trivial_task(tmp_path):
    ev = SkillEvolver(SkillManager(tmp_path / "skills"), toolcall_threshold=5)
    worthy, _ = ev.assess(_transcript_with_n_calls(2))
    assert not worthy


def test_assess_triggers_on_error_recovery(tmp_path):
    ev = SkillEvolver(SkillManager(tmp_path / "skills"), toolcall_threshold=99)
    c1 = ToolCall.create("run_shell", {"command": "deploy"})
    c2 = ToolCall.create("run_shell", {"command": "deploy --fixed"})
    t = [
        Message(role=Role.USER, content="deploy the app"),
        Message(role=Role.ASSISTANT, tool_calls=[c1]),
        _tool_result("run_shell", "ERROR: permission denied", c1.id),
        Message(role=Role.ASSISTANT, tool_calls=[c2]),
        _tool_result("run_shell", "deployed ok", c2.id),
        Message(role=Role.ASSISTANT, content="fixed and deployed"),
    ]
    worthy, reason = ev.assess(t)
    assert worthy and "recover" in reason


def test_evolve_creates_then_updates(tmp_path):
    mgr = SkillManager(tmp_path / "skills")
    ev = SkillEvolver(mgr, toolcall_threshold=5)

    result = ev.evolve(_transcript_with_n_calls(5))
    assert result.action == "created"
    assert result.skill_name
    md = mgr.view(result.skill_name)
    assert "Procedure" in md and "write_file" in md

    # Running a similar task again reinforces (updates) the same skill.
    result2 = ev.evolve(_transcript_with_n_calls(6))
    assert result2.action == "updated"
    assert result2.skill_name == result.skill_name


def test_propose_captures_pitfalls_from_errors(tmp_path):
    ev = SkillEvolver(SkillManager(tmp_path / "skills"), toolcall_threshold=1)
    c = ToolCall.create("run_shell", {"command": "x"})
    t = [
        Message(role=Role.USER, content="run the thing"),
        Message(role=Role.ASSISTANT, tool_calls=[c]),
        _tool_result("run_shell", "ERROR: command failed: not found", c.id),
        Message(role=Role.ASSISTANT, content="done"),
    ]
    skill = ev.propose(t)
    assert skill is not None
    assert "failed" in skill.sections["Pitfalls"].lower()
