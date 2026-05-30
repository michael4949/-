import pytest

from mnemo.skills.manager import SkillError, SkillManager
from mnemo.skills.model import Skill

SAMPLE = """\
---
name: deploy-service
description: Deploy the web service to staging
version: 0.3.0
category: automation
tags:
  - deploy
  - staging
---

# deploy-service

## When to Use
When the user wants to ship the web service to staging.

## Procedure
1. Run the build.
2. Push the image.

## Pitfalls
- Forgetting to set the env file.
"""


def test_roundtrip_parse_and_serialize():
    s = Skill.from_markdown(SAMPLE)
    assert s.name == "deploy-service"
    assert s.category == "automation"
    assert s.tags == ["deploy", "staging"]
    assert "Run the build" in s.sections["Procedure"]
    # Re-serialized markdown still parses back to the same essentials.
    again = Skill.from_markdown(s.to_markdown())
    assert again.name == s.name
    assert again.sections["Pitfalls"] == s.sections["Pitfalls"]


def test_frontmatter_only_is_cheap_and_correct():
    meta = Skill.parse_frontmatter_only(SAMPLE)
    assert meta.name == "deploy-service"
    assert meta.description.startswith("Deploy")
    assert "deploy" in meta.tags


def test_manager_crud_and_progressive_disclosure(tmp_path):
    mgr = SkillManager(tmp_path / "skills")
    assert mgr.list_meta() == []

    mgr.create(Skill(name="My Skill", description="does a thing", sections={"Procedure": "step 1"}))
    metas = mgr.list_meta()
    assert len(metas) == 1
    assert metas[0].name == "My Skill"

    # Level 0 catalog mentions the skill by name.
    assert "My Skill" in mgr.level0()
    # Level 1 view returns the full markdown.
    assert "step 1" in mgr.view("My Skill")

    # patch bumps version and updates the section.
    s = mgr.patch("My Skill", section="Procedure", content="step 2", append=True)
    assert "step 1" in mgr.view("My Skill") and "step 2" in mgr.view("My Skill")
    assert s.version != "0.1.0"

    # creating the same skill again without overwrite fails.
    with pytest.raises(SkillError):
        mgr.create(Skill(name="My Skill"))

    mgr.delete("My Skill")
    assert mgr.list_meta() == []


def test_reference_file_and_path_escape(tmp_path):
    mgr = SkillManager(tmp_path / "skills")
    mgr.create(Skill(name="ref-skill", sections={"Procedure": "p"}))
    mgr.write_file("ref-skill", "references/notes.md", "extra detail")
    # Level 2 drill-down.
    assert "extra detail" in mgr.view("ref-skill", "references/notes.md")
    # Escaping the skill dir is refused.
    with pytest.raises(SkillError):
        mgr.write_file("ref-skill", "../../escape.md", "nope")
