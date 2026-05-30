# Mnemo — 会成长的 AI 助理（复刻并超越 Hermes）

Mnemo 是一个**会自己学习**的 AI 助理:你跟它说的话它会永久记住、能跨对话回忆,
做完复杂任务后还会**自己总结成「技能」**(写成 `SKILL.md`)。灵感来自 Hermes,
差异化在于:用 **Claude 的模型质量** + **可观测、可治理的学习**去超越它。

这个仓库有两部分:

| 目录 | 是什么 | 语言 |
|---|---|---|
| **`core/`** | Mnemo 的「大脑」:Agent 运行时 + 自进化技能 + 分层记忆 | Python(零依赖) |
| 根目录(`App.tsx` 等) | **Mnemo 控制台**:能点鼠标的网页界面(聊天 + 技能 + 记忆) | React + Vite |

![控制台](docs/console.png)

---

## 一、最快体验(只用大脑,0 安装)

不需要装任何东西、不需要 API key,直接看它端到端跑一遍:

```bash
cd core
python3 -m mnemo.cli demo
```

你会看到它跑工具 → **自己写出一个技能** → 写入记忆 → 一个新对话把记忆找回来。

---

## 二、打开网页控制台(推荐,能点鼠标)

控制台需要**同时开两个东西**:后端「大脑」+ 前端「网页」。
打开**两个终端窗口**,各跑一条命令:

**终端 1 —— 启动大脑(后端 API):**
```bash
cd core
python3 -m mnemo.cli serve
```
看到 `mnemo API on http://127.0.0.1:8765` 就成功了,别关这个窗口。

**终端 2 —— 启动网页(前端):**
```bash
npm install      # 第一次用才需要,装完以后就不用再装
npm run dev
```
看到 `Local: http://localhost:3000/` 后,用浏览器打开 **http://localhost:3000** 即可。

> 网页会自动连上后端(`/api` 已配置代理,无需额外设置)。
> 想用真正的 Claude 大脑?见 `core/README.md` 的「切换到 Claude」。

---

## 三、它现在能做什么

- **记事 & 回忆**:跟它说「记住…」,以后(哪怕换对话)问它都记得。
- **自动学技能**:完成多步任务后,它把流程写成 `SKILL.md`,下次更快。
- **看得见的学习**:右侧面板能看它学了哪些技能、记了哪些事 —— 纯文本、可审查。
- **接 Claude 升级**:换上 Anthropic key,同一套机器换成 Claude 来真正思考、做复杂任务。

## 四、让它真正会思考(接入 Claude)

离线模式只会记事/回忆。想让它能回答任意问题、做复杂任务,接上 Claude 即可:

```bash
cd core
python3 -m mnemo.cli setup     # 按提示粘贴 key,会自动测试连接
```

需要一个 Anthropic API key:去 [console.anthropic.com](https://console.anthropic.com) →
API Keys → Create Key,复制以 `sk-ant-` 开头的那串粘进去就行。key 只存在你本机
(`~/.mnemo/credentials.json`,不会上传)。配好后,网页控制台顶部的提示会消失,大脑自动换成 Claude。

更深入的架构说明见 [`core/README.md`](core/README.md),完整路线图见 [`ROADMAP.md`](ROADMAP.md)。

---

## 目录

```
.
├── core/                 # Python 大脑(Agent + 技能 + 记忆 + JSON API)
│   ├── mnemo/            #   见 core/README.md
│   └── tests/            #   20 个测试:cd core && python3 -m pytest
├── components/           # 控制台 React 组件(聊天/技能/记忆面板)
├── services/mnemoApi.ts  # 控制台调后端 API 的客户端
├── App.tsx, index.*      # 控制台入口
├── ROADMAP.md            # 复刻并超越 Hermes 的路线图
└── README.md             # 本文件
```
