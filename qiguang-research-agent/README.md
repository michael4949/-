# 启光研发智能体

为河北启光教育科技公司搭建的研发智能体平台,基于 Claude Code 工程化实现。

## 项目结构

- `.claude/` - Claude Code 配置与 Slash Commands
- `skills/` - 7 个智能体的技能包(SKILL.md)
- `knowledge-base/` - 共享知识库(真题、知识点、模板、规范)
- `workflows/` - 工作流文档
- `scripts/` - 工程脚本(查重、难度评估、格式校验等)
- `data/` - 输入、中间态、输出、审计日志
- `tests/` - 评测基准与脚本
- `docs/` - 详细文档

## 快速开始

```bash
# 1. 启动 Claude Code
claude

# 2. Claude 会自动读 CLAUDE.md,知道项目结构

# 3. 跑一道单题(以数学选择题为例)
> /generate-item data/input/proposals/example-math-q1.yaml
```

## 当前状态

- [x] Day 1: 项目初始化与全局架构
- [ ] Day 2: 最小知识库录入
- [ ] Day 3: 命题智能体核心 Skills
- [ ] Day 4: 工程脚本 + Slash Commands
- [ ] Day 5: 端到端跑通第一道题

## 技术栈

- Claude Code (Anthropic CLI)
- Python 3.11+
- python-docx, sympy, sentence-transformers

## 许可与版权

- 项目代码、Skill 设计、Prompt 框架:乙方所有,授权启光独占使用
- 知识库内容、生成题目:启光所有
- 详见与启光签订的合同
