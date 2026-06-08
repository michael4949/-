"""智能标书生成系统 (Bid Agent)。

基于「本地大模型 + Agent + RAG」的智能标书生成系统，面向管道行业标书制作。

四层架构：
    infra       —— 基础设施层：本地大模型 / Embedding 推理（Ollama，可降级）
    rag         —— 向量化与检索层：企业私有知识库的构建与混合检索
    agents      —— 智能体编排层：LangGraph 风格的多 Agent 工作流编排
    web         —— 应用与交互层：FastAPI Web 服务与前端

六大功能模块：
    parsing     —— 模块一：招标文件解析（Word/PDF）
    extraction  —— 模块二：招标需求智能抽取（NER / 废标项 / 评分 / 风险）
    rag         —— 模块三：企业知识库构建与检索
    generation  —— 模块四：智能标书生成（多 Agent 分模块并行）
    review      —— 模块五：标书审核与校验
    management  —— 模块六：系统管理（知识库 / 模板 / 配置 / 日志）
"""

__version__ = "0.1.0"
__all__ = ["__version__"]
