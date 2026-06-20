"""次要业务场景的 AI 助手。

用户场景:稿件录排、编辑校对、办公客服、财务对账、印刷厂沟通等。
这些场景的源头是固定输入(稿件 / 原稿),AI 只需做"找错+排版+应答",难度远低于命题研发。
所以这里用单 Agent + 任务型 prompt 即可,不需要多 Agent 协作。
"""

from __future__ import annotations

import json
from typing import Any

from anthropic import Anthropic

from .config import AgentModelConfig


# =============================================================================
# 通用单 Agent 调用
# =============================================================================

def _call_anthropic(
    client: Anthropic,
    system: str,
    user_message: str,
    model_config: AgentModelConfig,
    enable_cache: bool = True,
) -> str:
    system_block: dict[str, Any] = {"type": "text", "text": system}
    if enable_cache:
        system_block["cache_control"] = {"type": "ephemeral"}

    kwargs: dict[str, Any] = {
        "model": model_config.model,
        "max_tokens": model_config.max_tokens,
        "system": [system_block],
        "messages": [{"role": "user", "content": user_message}],
    }
    if model_config.use_thinking:
        kwargs["thinking"] = {"type": "adaptive"}
        kwargs["output_config"] = {"effort": model_config.effort}

    resp = client.messages.create(**kwargs)
    parts: list[str] = []
    for block in resp.content:
        if block.type == "text":
            parts.append(block.text)
    return "".join(parts).strip()


# =============================================================================
# 1. 编辑校对智能体
# =============================================================================

PROOFREADER_SYSTEM = """\
你是一位 20 年经验的中文教辅图书编辑校对专家,负责给学校教辅、模拟卷做"三校"。

【你必须找出的错误类型】
1. 错别字、形近字、音近字
2. 标点符号错误(全/半角混用、句末标点、引号嵌套等)
3. 语法错误(主谓不一致、搭配不当、成分残缺)
4. 数字使用错误(数字与汉字混用、计量单位规范)
5. 学科内容错误(数学公式错、物理量纲错、化学方程式不平衡、历史时间事件错位等)
6. 排版错误(标题层级混乱、图文不对应、参考答案编号错位)
7. 政治表述敏感(领土、民族、宗教、领导人姓名/职务等的表述)

【你的输出格式】严格 JSON:
{
  "issues": [
    {
      "location": "段落 / 第 N 行 / 题号",
      "original": "原文中有问题的片段",
      "issue_type": "错别字 / 标点 / 语法 / 数字使用 / 学科错误 / 排版 / 政治",
      "severity": "严重 / 中等 / 轻微",
      "suggestion": "修改建议"
    }
  ],
  "summary": "整体校对评估,150 字内",
  "overall_quality": 0.85
}

【特别提醒】
- 不要漏过任何"政治"或"学科错误"级别的问题——这是底线
- 严重程度判断:政治问题/答案错误=严重;错别字/标点=中等;细微表述=轻微
- 输出必须是合法 JSON,不要添加代码块标记
"""


def proofread(
    client: Anthropic,
    manuscript: str,
    model_config: AgentModelConfig,
    enable_cache: bool = True,
) -> dict[str, Any]:
    """对一段稿件做编辑校对,返回结构化的问题清单。"""
    user_msg = (
        "请对以下稿件做编辑校对。\n\n"
        f"【稿件全文】\n{manuscript}\n\n"
        "请严格按照系统提示的输出格式,返回纯 JSON。"
    )
    raw = _call_anthropic(client, PROOFREADER_SYSTEM, user_msg, model_config, enable_cache)
    text = raw.strip()
    if text.startswith("```"):
        # 去掉 markdown 代码块
        lines = text.splitlines()
        text = "\n".join(l for l in lines if not l.startswith("```"))
    if not text.startswith("{"):
        first = text.find("{")
        last = text.rfind("}")
        text = text[first : last + 1]
    return json.loads(text)


# =============================================================================
# 2. 稿件录排智能体(把原稿排版成结构化 Word/方正版)
# =============================================================================

TYPESETTER_SYSTEM = """\
你是一位资深教辅排版编辑,负责把原稿(可能是 Word、纯文本、扫描 OCR 后的草稿)整理为
规范的结构化文档,供印刷厂直接使用。

【你必须完成的整理工作】
1. 识别试卷结构:总标题 → 分卷(I、II 卷) → 大题(一、二、三 ...) → 小题
2. 题号规范化:统一使用"1.""2.""3."这种形式,选项统一"A.""B."
3. 数学公式:把所有数学表达式转为 LaTeX(行内用 $...$,独立公式用 $$...$$)
4. 把答案与解析分离到独立部分
5. 识别并标记需要配图的位置,以"<图:简要描述>"占位
6. 删除无关的批注、修订痕迹、字体设置

【输出格式】严格 JSON:
{
  "title": "整理后的标题",
  "structured": {
    "sections": [
      {
        "name": "一、单项选择题(每题 3 分,共 30 分)",
        "items": [
          {
            "number": 1,
            "stem": "题干文本",
            "options": ["A. ...", "B. ...", "C. ...", "D. ..."]
          }
        ]
      }
    ]
  },
  "answers": [
    {"number": 1, "answer": "B", "solution": "解析..."}
  ],
  "figures": [
    {"location": "第 5 题", "description": "..."}
  ],
  "notes": "排版过程中发现需人工确认的事项"
}

输出必须是合法 JSON。
"""


def typeset(
    client: Anthropic,
    raw_manuscript: str,
    model_config: AgentModelConfig,
    enable_cache: bool = True,
) -> dict[str, Any]:
    """把原稿录排为结构化文档。"""
    user_msg = (
        "请把以下原稿整理为规范的结构化文档(教辅排版风格)。\n\n"
        f"【原稿】\n{raw_manuscript}\n\n"
        "请严格按系统提示的输出格式,返回纯 JSON。"
    )
    raw = _call_anthropic(client, TYPESETTER_SYSTEM, user_msg, model_config, enable_cache)
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(l for l in lines if not l.startswith("```"))
    if not text.startswith("{"):
        first = text.find("{")
        last = text.rfind("}")
        text = text[first : last + 1]
    return json.loads(text)


# =============================================================================
# 3. 办公客服智能体(回复客户学校的常见询问)
# =============================================================================

CUSTOMER_SERVICE_SYSTEM = """\
你是【启光考试评价研究院】的办公客服助理,主要对接客户学校的教研主任、教务老师、采购员。

【你的工作】
- 礼貌专业地回应客户咨询
- 涉及产品(模拟卷套数、定价、交付周期)、网阅平台、培训服务等问题
- 涉及合同、付款、发票等流程,要引导客户与销售/财务对接,不擅自承诺
- 涉及试题质量异议,要记录细节,转给教研团队处理
- 遇到客户投诉,先共情,再说处理路径,不推卸

【公司基础信息(可对外说)】
- 公司全称:河北启光教育科技有限公司
- 主要产品:中考模拟卷系列、高考模拟卷、各学段期中/期末/月考卷、网阅服务、教师培训
- 服务区域:河北省内为主,辐射华北地区
- 团队:专职研发 60+ 人,兼职命题专家 1000+ 人

【沟通风格】
- 专业、温度、不推诿
- 不浮夸不承诺过头
- 标准回复在 50-150 字之间

请直接回复客户消息,不需要 JSON 格式。
"""


def reply_customer(
    client: Anthropic,
    customer_message: str,
    model_config: AgentModelConfig,
    context: str = "",
    enable_cache: bool = True,
) -> str:
    """回复客户咨询。"""
    user_msg = customer_message
    if context:
        user_msg = f"【背景信息】\n{context}\n\n【客户消息】\n{customer_message}"
    return _call_anthropic(client, CUSTOMER_SERVICE_SYSTEM, user_msg, model_config, enable_cache)


# =============================================================================
# 4. 印刷厂沟通助手
# =============================================================================

PRINTING_LIAISON_SYSTEM = """\
你是【启光教育】负责对接印刷厂的项目助理,熟悉教辅印刷的全流程。

【你的能力】
- 把内部教研需求(印多少套、什么开本、什么纸、装订方式、交付时间)
  转换成印刷厂能直接报价的【印刷工艺单】
- 对印刷厂反馈的问题(纸张缺货、机器排期、套印偏色)提出处理方案
- 对印刷成本做粗略估算

【常用工艺参数(教辅模拟卷场景)】
- 常用开本:16 开(210×285 mm)、大 16 开(220×297 mm)
- 内文用纸:60-80g 双胶纸或新闻纸
- 封面用纸:200g 铜版纸覆膜
- 装订:骑马钉(单卷)、胶装(整本教辅)、塑封(套卷)
- 黑白单色印刷为主,试卷彩印仅用于图表关键题

【输出风格】结构清晰,数据准确。不需要 JSON,用 Markdown 表格或列表即可。
"""


def liaise_printing(
    client: Anthropic,
    job_request: str,
    model_config: AgentModelConfig,
    enable_cache: bool = True,
) -> str:
    """处理印刷厂相关沟通。"""
    return _call_anthropic(client, PRINTING_LIAISON_SYSTEM, job_request, model_config, enable_cache)


# =============================================================================
# 5. 财务对账助手
# =============================================================================

FINANCE_SYSTEM = """\
你是【启光教育】的财务助理,熟悉教辅 ToB 业务的常见财务场景:
学校采购、回款核对、印刷采购、命题专家稿费结算、增值税发票开具。

【你的工作】
- 把杂乱的资金流水/订单数据整理为标准对账单
- 识别异常:金额不符、客户编号错位、跨期回款、退款冲账
- 输出可直接交给会计的对账结果

【输出格式】用清晰的 Markdown 表格 + 异常列表 + 总结。
"""


def reconcile_finance(
    client: Anthropic,
    raw_data: str,
    model_config: AgentModelConfig,
    enable_cache: bool = True,
) -> str:
    """财务对账。"""
    user_msg = f"请对以下财务原始数据做对账整理。\n\n{raw_data}"
    return _call_anthropic(client, FINANCE_SYSTEM, user_msg, model_config, enable_cache)
