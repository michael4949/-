"""次要场景 Demo:跑一遍编辑校对、稿件录排、客服、印刷沟通、财务对账。

用法:
    python -m qiguang_agent.examples.aux_demo

要先设置环境变量 ANTHROPIC_API_KEY。
"""

from __future__ import annotations

import os

from anthropic import Anthropic

from ..auxiliary import (
    liaise_printing,
    proofread,
    reconcile_finance,
    reply_customer,
    typeset,
)
from ..config import AgentModelConfig


def main() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise SystemExit("请先设置 ANTHROPIC_API_KEY")

    client = Anthropic(api_key=api_key)
    sonnet = AgentModelConfig(model="claude-sonnet-4-6", effort="medium")
    opus = AgentModelConfig(model="claude-opus-4-8", effort="high")

    # ---------- 1. 编辑校对 ----------
    print("\n=== 编辑校对 Demo ===")
    manuscript = """
1. 据统记2024年河北省GDP总量约4.7万亿元, 用科学记数法表示约为 4.7×10^11 元.
   A. 正确  B.错误 C. 表述不准
2. 抗日战争爆发于一九三七年7月7日, 卢沟桥事变标志着 ……
3. 函数y=2x²+3x+1的对称轴为x = -3/4 ( )
"""
    result = proofread(client, manuscript, sonnet)
    print(result.get("summary"))
    for issue in result.get("issues", [])[:5]:
        print(f" - [{issue.get('severity')}] {issue.get('location')}: {issue.get('original')} → {issue.get('suggestion')}")

    # ---------- 2. 稿件录排 ----------
    print("\n=== 稿件录排 Demo ===")
    raw = """
河北省2025届初三第一次模拟数学试卷
第一卷选择题

1. 某城市建筑能耗占总能耗的35%, 这个百分数化为分数是
A 35/100 B 7/20 C 7/200 D 3/10

2. 计算 (-2)³+|-3| 的值
A -5 B -11 C 11 D 5

参考答案
1 B   解析:35%=35/100=7/20
2 A   解析:(-2)³=-8, |-3|=3, -8+3=-5
"""
    result = typeset(client, raw, sonnet)
    print(result.get("title"))
    for sect in result.get("structured", {}).get("sections", []):
        print(f" - {sect.get('name')}: {len(sect.get('items', []))} 题")

    # ---------- 3. 客服 ----------
    print("\n=== 客服回复 Demo ===")
    msg = "你好,我们是石家庄市第二十中学,想了解一下你们的初三一模试卷怎么订购?需要多长时间能交付?"
    reply = reply_customer(client, msg, sonnet, context="学校规模:初三 12 个班,约 600 人")
    print(reply)

    # ---------- 4. 印刷沟通 ----------
    print("\n=== 印刷沟通 Demo ===")
    job = "需要印 5000 套九年级数学一模试卷,16 开,每套含 8 页正卷 + 4 页答案,黑白单色,要求 7 天内交付。请给出工艺单和成本估算。"
    print(liaise_printing(client, job, sonnet))

    # ---------- 5. 财务对账 ----------
    print("\n=== 财务对账 Demo ===")
    raw_data = """
2025-03-01 收到 石家庄市第二中学 模拟卷采购款 8500
2025-03-03 收到 唐山某中学 模拟卷采购款 12000
2025-03-05 收到 8500 (备注:石家庄市第二中学 补款)
2025-03-07 退款 800 (备注:石家庄第二中学 印刷瑕疵补偿)
2025-03-10 收到 邯郸某校 模拟卷采购款 6800
"""
    print(reconcile_finance(client, raw_data, sonnet))


if __name__ == "__main__":
    main()
