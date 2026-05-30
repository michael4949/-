# Mnemo —— 复刻 Hermes 并超越的技术路线

> 代号 **Mnemo**(记忆女神 Mnemosyne)。可随时改名。
>
> 论点(来自附件报告):**Hermes 的真正护城河不是功能清单,而是「闭环学习」**——
> Agent 在多步任务 / 出错自修复 / 被纠正后,自动产出并维护 `SKILL.md`(技能),
> 并叠加分层记忆。我们把火力压在这条闭环上,再用 **Claude 的模型质量 + 可治理性**
> 去超越。

---

## 现在就能验证(Phase 1 已完成 ✅)

Python 核心「大脑」已落地、有测试、**完全离线可跑**(标准库零依赖):

```bash
cd core
python3 -m mnemo.cli demo     # 端到端证明:跑工具 → 自动写技能 → 跨会话回忆
python3 -m pytest             # 20 个测试,~0.5s,无需联网
```

已实现的 Hermes 核心机制:

- **自进化技能**:任务≥5 次工具调用 / 出错恢复 / 被纠正 → 自动从轨迹合成 `SKILL.md`
  (When to Use / Quick Reference / Procedure / Pitfalls / Verification),或 `patch` 强化已有技能。
- **渐进式披露**:Level 0 目录常驻、Level 1 全文按需、Level 2 钻取引用文件。
- **五层记忆**:上下文压缩(L1)、技能(L2)、向量语义检索(L3)、
  `MEMORY.md`/`USER.md` 字符上限 + 冻结注入(L4)、SQLite + FTS5 情节检索(L5)。
- **工具系统**:文件 / shell(危险命令拦截)/ 技能 / 记忆工具,统一注册表 + 上下文。
- **多 Provider 抽象**:离线 `scripted` 脑(驱动 demo/测试)+ 真 Claude(原生工具调用 + prompt caching)。
- **JSON API**:`mnemo serve`,零依赖,给 React 控制台用。

> 设计原则:核心**只用标准库**,保证任何环境(包括本沙箱、CI、$5 VPS)都能直接跑;
> Claude / 向量模型 / FastAPI 等都是**可选插件**,不是硬依赖。

---

## 路线图

### Phase 2 — React 控制台(对应「Python 核心 + React 控制台」)
把现有 React 应用改造成 Mnemo 控制台,连 `mnemo serve`:
- 实时对话面板(流式 events:tool_call / tool_result / skill / final)
- **技能浏览器**:看 / diff / 编辑 / 删除每个 `SKILL.md`(治理面)
- **记忆面板**:`MEMORY.md`/`USER.md` 用量条 + 语义检索框 + 会话时间线
- 把"Agent 自己学到的东西"**可视化、可审计**——这正是 Hermes 被诟病的"不可观测学习"短板。

### Phase 3 — 工具广度 + 沙箱
- 更多内建工具:`web_fetch`、`http`、`python_exec`、`apply_patch`(代码编辑)。
- **沙箱后端**:local / Docker / (后续 SSH、Modal),容器即边界。
- 权限模式(default / acceptEdits / plan / bypass)+ PreToolUse 审批钩子。

### Phase 4 — 单进程多 IM 网关(Hermes 护城河之一)
- 统一 `Channel` 适配器接口 + 单进程 gateway,复用同一 agent core。
- 先接 Telegram / Discord / Slack;再补飞书 / 企业微信 / 钉钉(国内场景)。
- 命令守卫(/stop /new /queue)、消息排队、跨平台一致行为。

### Phase 5 — 用户建模 + 进化式优化
- **L4+ 用户建模**:peer card + 辩证推理(Honcho 思路,或自建轻量版)。
- **离线进化**(GEPA / DSPy 思路):读历史轨迹,产出针对 skill/prompt 的改进 **PR**,
  过约束门(测试通过、体积上限、语义不漂移),**绝不直接 commit**——可审计。

### 贯穿始终 — 可治理性(我们的"超越"着力点)
- 每个技能是磁盘上的纯 `SKILL.md`:可 diff、可 review、纳入 Git。
- 进化是确定性、可解释的(会告诉你**为什么**学了这个技能)。
- 记忆有硬上限;API 花费上限;技能变更可走 PR/审查门。
- 生产建议:gateway(持密钥)与 sandbox(跑不可信输入)分机部署。

---

## 目录结构

```
.
├── core/                # Python 大脑(本期成果)—— 见 core/README.md
│   ├── mnemo/           # agent / llm / tools / skills / memory / server / cli
│   └── tests/           # 20 个测试
├── (现有 React 应用)     # Phase 2 改造成控制台
└── ROADMAP.md           # 本文件
```

## Hermes 能力对照(详表见 core/README.md)

| 维度 | Hermes | Mnemo 现状 |
|---|---|---|
| 自进化技能 + 渐进式披露 | ✅ | ✅ 已实现 |
| 分层记忆(L1–L5) | ✅ | ✅ 已实现(向量为轻量哈希嵌入,可换真嵌入) |
| 危险命令守卫 | ✅ | ✅ 已实现 |
| 多模型 | ✅ 200+ | ✅ Claude 原生 + 抽象接口 |
| 单进程多 IM 网关 | ✅ 20+ | ⏳ Phase 4 |
| 用户建模 / 进化优化 | ✅ | ⏳ Phase 5 |
| **学习的可观测/可治理** | ⚠️ 社区诟病 | ✅ **我们的超越点** |
