#!/usr/bin/env python3
"""A 股 / 国内期货历史行情管道：AkShare → 引擎可读的 JSON。

设计上分成两层：
  · **纯逻辑层**（复权、主力拼接、涨跌停标记、校验）—— 无网络依赖，`--selftest` 可离线全量验证；
  · **抓取层**（AkShare 调用）—— 只做 I/O，不含业务判断。

这样切分是因为：管道里真正容易出错、且错了会静默污染所有下游结论的，
全部集中在纯逻辑层。网络那部分错了会直接报错，反而安全。

用法:
    python3 tools/akshare_pipeline.py --selftest              # 离线自检（无需网络）
    python3 tools/akshare_pipeline.py --stock 000001 --start 2018-01-01
    python3 tools/akshare_pipeline.py --futures RB --start 2020-01-01
    python3 tools/akshare_pipeline.py --list-sources          # 数据源与授权说明

⚠️ 数据授权提醒（这是法律问题，不是技术问题）
    AkShare 抓取的是各交易所与财经门户的公开数据，仅适用于**个人研究与自用**。
    一旦把数据下发给你的用户，即构成「再分发」，绝大多数数据源的条款都禁止这么做。
    商用前必须向数据商购买明确包含「终端展示」授权的许可（通联/聚宽/Choice/iFinD/Wind），
    或改用 BYOD（用户自带数据导入）模式把授权风险转移给用户。
    详见 --list-sources。
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import unittest
from dataclasses import dataclass, field
from typing import Iterable, Sequence

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


# ══════════════════════════════════════════════════════════════════════
#  纯逻辑层
# ══════════════════════════════════════════════════════════════════════

@dataclass
class Bar:
    t: int          # epoch 毫秒
    o: float
    h: float
    l: float
    c: float
    v: float
    limit_up: bool = False
    limit_down: bool = False
    suspended: bool = False
    contract: str = ""          # 期货：该根数据来自哪张合约
    adj_factor: float = 1.0     # 复权因子（不复权价 × 因子 = 前复权价）

    def to_row(self) -> list:
        return [self.t, round(self.o, 6), round(self.h, 6),
                round(self.l, 6), round(self.c, 6), self.v]


def validate_bars(bars: Sequence[Bar]) -> list[str]:
    """尽早暴露脏数据。返回问题清单而不是抛异常 —— 真实数据里总有几根是坏的，
    要能看到全部问题再决定怎么处理，而不是被第一个错误挡住。"""
    issues = []
    for i, b in enumerate(bars):
        if not all(math.isfinite(x) for x in (b.o, b.h, b.l, b.c)):
            issues.append(f"bar[{i}] 含非有限价格")
            continue
        if b.h < max(b.o, b.c) - 1e-9 or b.l > min(b.o, b.c) + 1e-9:
            issues.append(f"bar[{i}] 高低价与开收价矛盾: o={b.o} h={b.h} l={b.l} c={b.c}")
        if b.o <= 0 or b.c <= 0:
            issues.append(f"bar[{i}] 价格非正")
        if i > 0 and b.t <= bars[i - 1].t:
            issues.append(f"bar[{i}] 时间未严格递增")
    return issues


def mark_limit_moves(bars: Sequence[Bar], limit_pct: float = 0.10) -> None:
    """标记涨跌停。

    只有**一字板**（开=高=低=收，且相对前收达到涨跌停幅度）才置位 ——
    因为撮合引擎用这个标志表达「买不到 / 卖不掉」，而非一字板的涨停板上
    盘中是有成交的，标记了会让模拟比现实更难。宁可漏标不可错标。
    """
    for i in range(1, len(bars)):
        b, prev = bars[i], bars[i - 1]
        if prev.c <= 0:
            continue
        chg = (b.c - prev.c) / prev.c
        flat = abs(b.h - b.l) < 1e-9 and abs(b.o - b.c) < 1e-9
        if flat and chg >= limit_pct - 1e-6:
            b.limit_up = True
        elif flat and chg <= -limit_pct + 1e-6:
            b.limit_down = True


def mark_suspensions(bars: Sequence[Bar], min_volume: float = 0.0) -> None:
    """标记停牌：成交量为零。停牌日不应参与训练判分。"""
    for b in bars:
        if b.v <= min_volume:
            b.suspended = True


def apply_adjustment(bars: Sequence[Bar], mode: str = "none") -> list[Bar]:
    """按复权因子生成复权序列。

    ⚠️ 回放训练必须用 mode='none'（不复权），这一条极其重要且极易做错。

    复权因子是**用未来的除权除息事件**倒推出来的。如果直接把前复权价喂给回放，
    用户在 2015 年的界面上看到的价格，已经隐含了 2016 年那次分红的信息 ——
    这是一个非常隐蔽的未来函数，不会报错，不会崩溃，只会让所有训练成绩虚高。

    正确做法：回放展示不复权价（当时盘面真实所见），复权因子单独保存，
    只在做跨期收益率统计时使用。
    """
    if mode == "none":
        return list(bars)
    out = []
    if mode == "qfq":       # 前复权：以最新价格为基准
        base = bars[-1].adj_factor if bars else 1.0
        for b in bars:
            k = b.adj_factor / base if base else 1.0
            out.append(Bar(b.t, b.o * k, b.h * k, b.l * k, b.c * k, b.v,
                           b.limit_up, b.limit_down, b.suspended, b.contract, b.adj_factor))
    elif mode == "hfq":     # 后复权：以最早价格为基准
        base = bars[0].adj_factor if bars else 1.0
        for b in bars:
            k = b.adj_factor / base if base else 1.0
            out.append(Bar(b.t, b.o * k, b.h * k, b.l * k, b.c * k, b.v,
                           b.limit_up, b.limit_down, b.suspended, b.contract, b.adj_factor))
    else:
        raise ValueError(f"未知复权模式: {mode}")
    return out


def splice_main_contract(
    contracts: dict[str, list[Bar]],
    roll_schedule: list[tuple[int, str, str]],
    method: str = "shift",
) -> list[Bar]:
    """把逐月合约拼接成主力连续合约。

    roll_schedule: [(换月时间戳, 旧合约, 新合约), ...]，按时间升序。

    两种方法都要提供，因为它们会给出**不同的回测结论**，不能只实现一种就当没这回事：

      · shift（价差平移法）：在换月点计算新旧合约价差，把此前的历史整体平移。
        保持绝对价差不变 → 适合按点数计盈亏的品种。
        风险：长历史 + 大 contango 时，早期价格可能被平移成负数。会返回警告。

      · ratio（比例法）：按价格比例缩放历史。
        保持百分比涨跌幅不变 → 适合按收益率做统计。
        风险：改变了绝对点数，按点数设的止损距离会失真。

    无论哪种，拼接后的序列都**不是任何一张真实合约的价格**，
    因此只适合做形态训练与统计，不适合宣称「你在 2019 年能赚这么多」。
    """
    if not roll_schedule:
        only = next(iter(contracts.values())) if contracts else []
        return list(only)

    warnings: list[str] = []
    # 按时间顺序取各段：[..., roll_i) 用旧合约，[roll_i, roll_{i+1}) 用新合约
    segments: list[list[Bar]] = []
    first_contract = roll_schedule[0][1]
    bars_first = [b for b in contracts.get(first_contract, []) if b.t < roll_schedule[0][0]]
    segments.append([_clone(b, first_contract) for b in bars_first])

    for idx, (ts, old, new) in enumerate(roll_schedule):
        end = roll_schedule[idx + 1][0] if idx + 1 < len(roll_schedule) else float("inf")
        seg = [b for b in contracts.get(new, []) if ts <= b.t < end]
        segments.append([_clone(b, new) for b in seg])

    # 从最新一段往回调整，保证最近的价格是真实的
    out: list[Bar] = list(segments[-1])
    for i in range(len(segments) - 2, -1, -1):
        seg = segments[i]
        if not seg or not out:
            out = seg + out
            continue
        ts, old, new = roll_schedule[i]
        old_px = _price_at(contracts.get(old, []), ts)
        new_px = _price_at(contracts.get(new, []), ts)
        if old_px is None or new_px is None or old_px <= 0:
            out = seg + out
            continue

        if method == "shift":
            delta = new_px - old_px
            adjusted = [_shift(b, delta) for b in seg]
            if any(b.l <= 0 for b in adjusted):
                warnings.append(f"价差平移在 {old}→{new} 处产生了非正价格，该品种建议改用 ratio 法")
        elif method == "ratio":
            k = new_px / old_px
            adjusted = [_scale(b, k) for b in seg]
        else:
            raise ValueError(f"未知拼接方法: {method}")
        out = adjusted + out

    for w in warnings:
        print(f"  ⚠️  {w}", file=sys.stderr)
    return out


def _clone(b: Bar, contract: str) -> Bar:
    return Bar(b.t, b.o, b.h, b.l, b.c, b.v, b.limit_up, b.limit_down, b.suspended, contract, b.adj_factor)


def _shift(b: Bar, d: float) -> Bar:
    return Bar(b.t, b.o + d, b.h + d, b.l + d, b.c + d, b.v,
               b.limit_up, b.limit_down, b.suspended, b.contract, b.adj_factor)


def _scale(b: Bar, k: float) -> Bar:
    return Bar(b.t, b.o * k, b.h * k, b.l * k, b.c * k, b.v,
               b.limit_up, b.limit_down, b.suspended, b.contract, b.adj_factor)


def _price_at(bars: Sequence[Bar], ts: int) -> float | None:
    """取 ts 当日或之前最近一根的收盘价"""
    best = None
    for b in bars:
        if b.t <= ts:
            best = b.c
        else:
            break
    return best


def dump_json(bars: Sequence[Bar], path: str, symbol: str, timeframe: str, source: str,
              extra: dict | None = None) -> None:
    payload = {
        "symbol": symbol,
        "timeframe": timeframe,
        "source": source,
        "columns": ["t", "o", "h", "l", "c", "v"],
        "count": len(bars),
        "rows": [b.to_row() for b in bars],
        # 涨跌停 / 停牌用稀疏索引存，避免每根都带布尔字段把体积撑大
        "limitUp": [i for i, b in enumerate(bars) if b.limit_up],
        "limitDown": [i for i, b in enumerate(bars) if b.limit_down],
        "suspended": [i for i, b in enumerate(bars) if b.suspended],
        "adjFactors": [round(b.adj_factor, 8) for b in bars] if any(b.adj_factor != 1.0 for b in bars) else None,
    }
    if extra:
        payload.update(extra)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(payload, f, separators=(",", ":"))
    print(f"已写出 {path}  ({len(bars)} 根, {os.path.getsize(path)/1024:.0f} KB)")


# ══════════════════════════════════════════════════════════════════════
#  抓取层（需要网络与 akshare）
# ══════════════════════════════════════════════════════════════════════

def _require_akshare():
    try:
        import akshare as ak
        return ak
    except ImportError:
        print("需要先安装: pip install akshare", file=sys.stderr)
        sys.exit(1)


def fetch_stock(code: str, start: str, end: str) -> list[Bar]:
    """A 股日线。同时取不复权价（回放用）与前复权价（用于反推复权因子）。"""
    ak = _require_akshare()
    import pandas as pd

    raw = ak.stock_zh_a_hist(symbol=code, period="daily", start_date=start.replace("-", ""),
                             end_date=end.replace("-", ""), adjust="")
    qfq = ak.stock_zh_a_hist(symbol=code, period="daily", start_date=start.replace("-", ""),
                             end_date=end.replace("-", ""), adjust="qfq")
    fac = {}
    if qfq is not None and not qfq.empty:
        for _, r in qfq.iterrows():
            fac[str(r["日期"])] = float(r["收盘"])

    bars = []
    for _, r in raw.iterrows():
        day = str(r["日期"])
        close_raw = float(r["收盘"])
        # 复权因子 = 前复权收盘 / 不复权收盘。单独存，绝不混进回放价格里。
        adj = (fac.get(day, close_raw) / close_raw) if close_raw > 0 else 1.0
        bars.append(Bar(
            t=int(pd.Timestamp(day).timestamp() * 1000),
            o=float(r["开盘"]), h=float(r["最高"]), l=float(r["最低"]), c=close_raw,
            v=float(r["成交量"]), adj_factor=adj,
        ))
    return bars


def fetch_futures_main(symbol: str, start: str, end: str) -> list[Bar]:
    """期货主力连续。AkShare 已提供拼接好的主力连续，这里直接取用；
    若需自行控制拼接方法，改用 fetch_futures_contracts + splice_main_contract。"""
    ak = _require_akshare()
    import pandas as pd

    df = ak.futures_main_sina(symbol=f"{symbol}0", start_date=start.replace("-", ""),
                              end_date=end.replace("-", ""))
    bars = []
    for _, r in df.iterrows():
        bars.append(Bar(
            t=int(pd.Timestamp(str(r["日期"])).timestamp() * 1000),
            o=float(r["开盘价"]), h=float(r["最高价"]), l=float(r["最低价"]), c=float(r["收盘价"]),
            v=float(r["成交量"]), contract=f"{symbol}0",
        ))
    return bars


SOURCES_DOC = """
数据源分层（按可用性与授权风险排序）
──────────────────────────────────────────────────────────────────────
【起步 / MVP】免费或低门槛，够把产品跑起来
  AkShare      A股日线分钟、期货日线、财报        个人研究自用；再分发违规
  Baostock     A股日线/分钟，接口稳定             同上
  Tushare      积分制，覆盖广                     同上

【必备】撮合引擎的参数来源，必须从官方取
  中金所/上期所/大商所/郑商所官网
               合约规格、保证金比例、手续费率、交易日历（含夜盘时段）
               —— 这些参数错了，所有盈亏结论都是错的

【商用】谈授权时必须明确写入「可用于终端展示」
  通联数据 / 聚宽 / 东方财富 Choice / 同花顺 iFinD / Wind

【兜底】BYOD：用户自带数据导入
  把授权风险转移给用户，同时成为差异化功能

⚠️ 第一件该做的事不是写代码，是搞清楚数据商合同里「再分发」条款怎么写。
   产品把数据下发到客户端 = 再分发。这一条谈不下来，整个产品形态要重新设计。
"""


# ══════════════════════════════════════════════════════════════════════
#  离线自检
# ══════════════════════════════════════════════════════════════════════

class PipelineTests(unittest.TestCase):
    def _mk(self, closes, t0=0, step=86400000):
        return [Bar(t=t0 + i * step, o=c, h=c + 1, l=c - 1, c=c, v=100)
                for i, c in enumerate(closes)]

    def test_validate_catches_bad_bars(self):
        bad = [Bar(t=0, o=10, h=9, l=8, c=10, v=1)]
        self.assertTrue(any("矛盾" in s for s in validate_bars(bad)))
        bad2 = [Bar(t=0, o=10, h=12, l=8, c=10, v=1), Bar(t=0, o=10, h=12, l=8, c=10, v=1)]
        self.assertTrue(any("递增" in s for s in validate_bars(bad2)))
        self.assertEqual(validate_bars(self._mk([10, 11, 12])), [])

    def test_limit_marks_only_flat_boards(self):
        bars = [
            Bar(t=0, o=10, h=10, l=10, c=10, v=1),
            Bar(t=1, o=11, h=11, l=11, c=11, v=1),      # 一字涨停 +10%
            Bar(t=2, o=11.5, h=12.1, l=11.2, c=12.1, v=1),  # 涨停但盘中有波动
        ]
        mark_limit_moves(bars, 0.10)
        self.assertTrue(bars[1].limit_up)
        self.assertFalse(bars[2].limit_up, "非一字板不应标记 —— 盘中有成交，模拟里就该能买到")

    def test_adjustment_none_is_identity(self):
        bars = self._mk([10, 11, 12])
        for b in bars:
            b.adj_factor = 0.5
        out = apply_adjustment(bars, "none")
        self.assertEqual([b.c for b in out], [10, 11, 12],
                         "回放必须拿到不复权价，否则未来的除权信息会泄露进历史界面")

    def test_qfq_normalises_to_latest(self):
        bars = self._mk([10, 20, 30])
        bars[0].adj_factor, bars[1].adj_factor, bars[2].adj_factor = 0.5, 0.5, 1.0
        out = apply_adjustment(bars, "qfq")
        self.assertAlmostEqual(out[0].c, 5.0)
        self.assertAlmostEqual(out[2].c, 30.0, msg="前复权应以最新价为基准，最后一根不变")

    def test_splice_shift_preserves_recent_prices_and_gaps(self):
        # 旧合约在换月点收 100，新合约收 130；换月前的历史应整体上移 30
        old = self._mk([90, 95, 100], t0=0)
        new = self._mk([130, 135, 140], t0=3 * 86400000)
        rolls = [(3 * 86400000, "OLD", "NEW")]
        out = splice_main_contract({"OLD": old, "NEW": new}, rolls, method="shift")
        self.assertEqual(len(out), 6)
        self.assertAlmostEqual(out[-1].c, 140, msg="最近的价格必须是真实价格")
        self.assertAlmostEqual(out[0].c, 120, msg="换月前历史应平移 +30")
        # 平移不改变绝对点数变动
        self.assertAlmostEqual(out[1].c - out[0].c, 95 - 90)

    def test_splice_ratio_preserves_returns(self):
        old = self._mk([90, 95, 100], t0=0)
        new = self._mk([130, 135, 140], t0=3 * 86400000)
        rolls = [(3 * 86400000, "OLD", "NEW")]
        out = splice_main_contract({"OLD": old, "NEW": new}, rolls, method="ratio")
        self.assertAlmostEqual(out[-1].c, 140)
        # 比例法保持百分比涨跌幅
        self.assertAlmostEqual(out[1].c / out[0].c, 95 / 90)
        self.assertAlmostEqual(out[0].c, 90 * 1.3)

    def test_splice_two_methods_disagree(self):
        """两种拼接法给出不同结果 —— 这正是必须两种都提供、并让用户知情的理由。"""
        old = self._mk([90, 95, 100], t0=0)
        new = self._mk([130, 135, 140], t0=3 * 86400000)
        rolls = [(3 * 86400000, "OLD", "NEW")]
        a = splice_main_contract({"OLD": old, "NEW": new}, rolls, method="shift")
        b = splice_main_contract({"OLD": old, "NEW": new}, rolls, method="ratio")
        self.assertNotAlmostEqual(a[0].c, b[0].c,
                                  msg="两种拼接法结果相同，说明测试用例没有区分度")

    def test_splice_multi_roll(self):
        c1 = self._mk([100, 101], t0=0)
        c2 = self._mk([110, 111], t0=2 * 86400000)
        c3 = self._mk([120, 121], t0=4 * 86400000)
        # 换月点当日两张合约都有报价，取各自最近收盘
        c1 += [Bar(t=2 * 86400000, o=102, h=103, l=101, c=102, v=1)]
        c2 += [Bar(t=4 * 86400000, o=112, h=113, l=111, c=112, v=1)]
        rolls = [(2 * 86400000, "C1", "C2"), (4 * 86400000, "C2", "C3")]
        out = splice_main_contract({"C1": c1, "C2": c2, "C3": c3}, rolls, method="shift")
        self.assertAlmostEqual(out[-1].c, 121, msg="最新段必须保持原值")
        self.assertEqual(len(validate_bars(out)), 0, "拼接后的序列自身应通过校验")

    def test_suspension_marking(self):
        bars = self._mk([10, 11, 12])
        bars[1].v = 0
        mark_suspensions(bars)
        self.assertTrue(bars[1].suspended)
        self.assertFalse(bars[0].suspended)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--selftest", action="store_true", help="离线自检纯逻辑层（无需网络）")
    ap.add_argument("--list-sources", action="store_true", help="打印数据源与授权说明")
    ap.add_argument("--stock", help="A 股代码，如 000001")
    ap.add_argument("--futures", help="期货品种，如 RB")
    ap.add_argument("--start", default="2018-01-01")
    ap.add_argument("--end", default="2026-01-01")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    if args.list_sources:
        print(SOURCES_DOC)
        return 0

    if args.selftest:
        suite = unittest.TestLoader().loadTestsFromTestCase(PipelineTests)
        res = unittest.TextTestRunner(verbosity=2).run(suite)
        return 0 if res.wasSuccessful() else 1

    if args.stock:
        bars = fetch_stock(args.stock, args.start, args.end)
        mark_limit_moves(bars, 0.10)
        mark_suspensions(bars)
        issues = validate_bars(bars)
        if issues:
            print(f"⚠️ 发现 {len(issues)} 处数据问题（前 5 条）:", file=sys.stderr)
            for s in issues[:5]:
                print("   " + s, file=sys.stderr)
        out = args.out or os.path.join(OUT_DIR, f"stock_{args.stock}_1d.json")
        dump_json(bars, out, args.stock, "1d", "AkShare 不复权日线（复权因子单独存放）")
        return 0

    if args.futures:
        bars = fetch_futures_main(args.futures, args.start, args.end)
        issues = validate_bars(bars)
        if issues:
            print(f"⚠️ 发现 {len(issues)} 处数据问题", file=sys.stderr)
        out = args.out or os.path.join(OUT_DIR, f"futures_{args.futures}_1d.json")
        dump_json(bars, out, args.futures, "1d", "AkShare 主力连续日线")
        return 0

    ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
