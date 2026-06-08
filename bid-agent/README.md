# 智能标书生成系统（标书生成智能体）

> 基于「**本地大模型 + Agent + RAG**」的智能标书生成系统，面向**管道行业**标书制作。
> 上传招标文件，自动完成 **需求解析 → 信息检索 → 标书生成 → 合规审核 → 导出 Word**，
> 把标书编制从"数日鏖战"缩短到"数小时完成 + 人工最终确认"。
> **全流程本地运行，数据不出域。**

<p align="center">
  招标文件解析 ➜ 需求/废标项抽取 ➜ 企业知识库检索 ➜ 多 Agent 分模块生成 ➜ 合规审核 ➜ 一键导出
</p>

---

## ✨ 亮点

- **开箱即用，离线可跑**：未连接大模型时自动降级到内置确定性引擎（规则抽取 + 模板/检索生成），
  `pip install` 后即可完整体验全流程；接入 Ollama 后**无需改代码**自动启用大模型。
- **数据不出域**：解析、检索、生成、存储全部在本地完成，向量库为纯本地实现，满足企业隐私要求。
- **废标项不遗漏**：自动识别 ★/▲ 星号条款与"否则按废标处理"等实质性要求，生成《投标注意事项清单》，
  并在审核阶段逐条核验是否已响应。
- **检索增强**：企业私有知识库，**向量检索 + 关键词检索（BM25）混合 + 重排序**。
- **多 Agent 并行**：按标书结构拆分为投标函、公司简介、技术方案、报价等子模块，多 Agent 并发生成。

---

## 🧱 系统架构（四层）

| 层 | 职责 | 本项目实现 |
|---|---|---|
| **基础设施层** | 本地大模型 / 嵌入推理 | `infra/` · Ollama（CPU/GPU）；不可用时降级 `NullLLM` + `HashingEmbedder` |
| **向量化与检索层** | 企业私有知识库构建与检索 | `rag/` · 本地向量库 + 混合检索 + 重排序 |
| **智能体编排层** | 工作流编排（LangGraph 风格） | `agents/` · `StateGraph`：解析→抽取→生成→审核→导出 |
| **应用与交互层** | Web 操作界面 | `web/` · FastAPI + 单页前端 |

## 🧩 六大功能模块

| 模块 | 说明 | 代码 |
|---|---|---|
| ① 招标文件解析 | Word/PDF/文本，提取全文、表格、结构 | `parsing/` |
| ② 招标需求智能抽取 | NER + 废标项 + 评分细则 + 技术参数 + 合同风险 | `extraction/` |
| ③ 企业知识库构建与检索 | 向量化 + 混合检索 + 重排序 | `rag/` |
| ④ 智能标书生成 | 多 Agent 分模块并行生成，导出 Word | `generation/` |
| ⑤ 标书审核与校验 | 合规审核（对照废标项）+ 完整性审核 + 审核报告 | `review/` |
| ⑥ 系统管理 | 知识库管理、任务持久化、审计日志 | `management/` |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd bid-agent
pip install -r requirements.txt
```

### 2. 导入示例企业知识库（管道行业）

```bash
python scripts/seed_knowledge_base.py
```

### 3a. 命令行端到端演示

```bash
python scripts/demo.py            # 使用内置示例招标文件
python scripts/demo.py 你的招标文件.pdf --company "鸿源管道科技有限公司"
```

### 3b. 启动 Web 服务（推荐）

```bash
python run.py        # 打开 http://localhost:8000
```

在网页中：上传招标文件 → 查看实时进度 → 浏览需求摘要/废标项清单/评分细则/审核报告 → 下载标书 Word。
也可点击「使用示例招标文件」一键体验。

---

## 🤖 接入本地大模型（强烈推荐，质量更高）

系统通过 HTTP 调用本地 [Ollama](https://ollama.com)，**无需额外 Python 依赖**：

```bash
# 1) 安装 Ollama 后拉取模型（按硬件选择尺寸）
ollama pull qwen2.5:7b-instruct      # 生成/抽取
ollama pull nomic-embed-text         # 向量嵌入

# 2) 启动本系统，自动探测并启用
python run.py
```

> 未检测到 Ollama 时，系统会在页面顶部提示"降级引擎"，并继续可用。

通过环境变量可切换模型与行为：

| 变量 | 默认 | 说明 |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama 地址 |
| `BID_LLM_MODEL` | `qwen2.5:7b-instruct` | 生成模型 |
| `BID_EMBED_MODEL` | `nomic-embed-text` | 嵌入模型 |
| `BID_LLM_MODE` | `auto` | `auto`/`on`/`off`（`off` 强制降级） |
| `BID_TEMPERATURE` | `0.3` | 采样温度 |
| `BID_TOP_K` | `6` | 检索召回数 |
| `BID_MAX_PARALLEL` | `4` | 章节并发数 |
| `BID_PORT` | `8000` | Web 端口 |

也可在项目根目录放置 `config.yaml`（见 `config.example.yaml`）。

---

## 🗂️ 目录结构

```
bid-agent/
├── run.py                     # 启动 Web 服务
├── requirements.txt
├── config.example.yaml
├── bid_agent/
│   ├── config.py              # 配置
│   ├── models.py              # 贯穿全流程的数据模型
│   ├── service.py             # 应用服务门面（KB + 编排 + 任务）
│   ├── infra/                 # 基础设施层：LLM / Embedding
│   ├── rag/                   # 检索层 + 模块三：知识库
│   ├── parsing/               # 模块一：招标文件解析
│   ├── extraction/            # 模块二：需求抽取
│   ├── generation/            # 模块四：标书生成 + Word 导出
│   ├── review/                # 模块五：审核校验
│   ├── agents/                # 智能体编排层（StateGraph）
│   ├── management/            # 模块六：系统管理
│   └── web/                   # 应用与交互层（FastAPI + 前端）
├── data/
│   ├── knowledge_base/        # 示例企业资料（管道行业）
│   ├── samples/               # 示例招标文件
│   └── runtime/               # 运行时数据（向量库/上传/输出/日志，已 gitignore）
├── scripts/                   # 知识库导入、CLI 演示
└── tests/                     # 端到端测试
```

---

## 🔌 主要 API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/info` | 运行环境（LLM/嵌入/知识库状态） |
| POST | `/api/tasks` | 上传招标文件并启动生成（multipart：`file`,`company`） |
| GET | `/api/tasks/{id}` | 任务状态与全部结果 |
| GET | `/api/tasks/{id}/download?type=bid\|review` | 下载标书 / 审核报告 |
| GET/POST/DELETE | `/api/kb/docs`、`/api/kb/upload`、`/api/kb/seed` | 知识库管理 |
| GET | `/api/kb/search?q=` | 检索测试（含向量/关键词分项得分） |

---

## 🔍 设计说明

- **降级策略**：`infra` 暴露 `available` 标志，`extraction`/`generation`/`review` 各自具备规则/模板回退，
  因此无大模型也能产出**结构完整、可编辑**的标书初稿与审核报告。
- **混合检索**：`KnowledgeBase.search` = 向量余弦（`HashingEmbedder` 或 Ollama 嵌入）与 BM25-lite
  关键词得分按 `hybrid_alpha` 融合，再按查询词覆盖度做轻量重排序。
- **多 Agent 编排**：`agents/graph.py` 提供与 LangGraph 同构的 `StateGraph`（节点签名 `state -> state`），
  生产环境可平滑替换为 `langgraph`。
- **防虚构**：启用大模型时，写作提示词强约束"仅依据企业资料、缺数据用【】占位"，避免编造资质/业绩。

## 🔒 数据安全

- 全流程本地处理，绝不外传招标文件内容；向量库为本地 JSON，不依赖外部服务。
- 操作写入 `data/runtime/logs/audit.log`，支持审计追溯。

## 🛣️ 生产化扩展路线

- 向量库：`local` → Chroma / Qdrant / Milvus（实现 `rag/vectorstore.py` 同接口适配器）。
- 嵌入/重排：接入本地 BGE/`bge-reranker` 提升召回精度。
- 编排：替换为 `langgraph` 以支持更复杂的条件分支与人审回环。
- 对接企业 OA/CRM、增量索引、权限与多租户。

## ✅ 测试

```bash
python tests/test_pipeline.py        # 或 python -m pytest tests/ -v
```

涵盖：解析、抽取（编号/预算/废标项/评分/技参/风险）、知识库检索、端到端生成与审核。
