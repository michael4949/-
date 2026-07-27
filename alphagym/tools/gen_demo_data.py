#!/usr/bin/env python3
"""
演示数据生成器 —— A 股 + 国内期货 + 财报

⚠️ 这里生成的**全部是合成数据，不是真实行情**。
用途只有一个：在真实数据源接入之前，让产品的每一个功能都能被完整演示。
所以有两条纪律写死在代码里：

  1）产出的每个文件都带 `"synthetic": true` 和 `"disclaimer"` 字段，
     前端据此在界面上打「演示数据」标记。任何一个消费方都不可能"不小心"
     把它当成真实行情 —— 字段就在那儿。
  2）代码结构与真实数据完全同构。接真实数据源时只要产出同样 schema 的
     JSON，前端一行不用改。

── 为什么不用简单的随机游走 ──
随机游走生成的 K 线，涨跌幅是独立正态的。真实 A 股不是：
  · 波动率聚集：暴跌之后往往跟着暴跌
  · 肥尾：极端日远多于正态预测
  · 板块联动：同一板块的股票同涨同跌
  · 涨跌停：主板 ±10%、创业板/科创板 ±20%、ST ±5%，且存在一字板
  · 停牌：成交量为零，不参与判分
  · 基本面驱动：好公司长期跑赢，这样「财务选股」才筛得出东西
上面每一条都实现了，否则用这份数据练出来的手感是假的，
演示出来的「财务选股有效」也是假的。

用法:
    python3 tools/gen_demo_data.py            # 生成到 data/
    python3 tools/gen_demo_data.py --selftest # 离线自检，不写文件
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
import unittest
from dataclasses import dataclass, field
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")

DISCLAIMER = "演示数据，由 tools/gen_demo_data.py 合成，非真实行情。接入真实数据源后按同一 schema 替换即可。"

# ══════════════════════════════════════════════════════════════════
#  板块与标的
# ══════════════════════════════════════════════════════════════════

SECTORS = [
    ("银行", 0.55, 0.16),      # (板块名, 与大盘相关度, 年化波动)
    ("白酒食品", 0.60, 0.30),
    ("医药生物", 0.58, 0.32),
    ("新能源", 0.62, 0.45),
    ("半导体", 0.65, 0.48),
    ("房地产", 0.60, 0.34),
    ("券商", 0.75, 0.38),
    ("机械制造", 0.58, 0.28),
]

# 每个板块给几只票，代码段决定涨跌停幅度
BOARD_RULES = {
    "主板": 0.10,
    "创业板": 0.20,
    "科创板": 0.20,
    "ST": 0.05,
}

STOCK_NAMES = {
    "银行": ["工建银行", "招浦银行", "民兴银行", "北岸银行"],
    "白酒食品": ["黔台酒业", "汾水酒业", "洋润食品", "伊利乳源"],
    "医药生物": ["恒康医药", "药明生科", "迈瑞医械", "长春疫苗"],
    "新能源": ["宁德时代新", "比迪新能", "隆兴光伏", "阳光储能"],
    "半导体": ["中芯微电", "北方装备", "韦尔半导", "兆易存储"],
    "房地产": ["万地控股", "保利置业新", "招商蛇港", "金科地产"],
    "券商": ["中信证融", "华泰联合新", "东方财智", "国泰君融"],
    "机械制造": ["三一装备", "徐工机械新", "恒立液压新", "汇川技术新"],
}

FUTURES = [
    # (代码, 名称, 交易所, 合约乘数, 最小变动, 保证金率, 起始价, 年化波动)
    ("RB", "螺纹钢", "上期所", 10, 1.0, 0.10, 3800, 0.28),
    ("I",  "铁矿石", "大商所", 100, 0.5, 0.13, 780, 0.36),
    ("CU", "沪铜", "上期所", 5, 10.0, 0.12, 68000, 0.22),
    ("M",  "豆粕", "大商所", 10, 1.0, 0.09, 3400, 0.24),
    ("TA", "PTA", "郑商所", 5, 2.0, 0.09, 5600, 0.30),
    ("IF", "沪深300股指", "中金所", 300, 0.2, 0.12, 3900, 0.20),
    ("AU", "沪金", "上期所", 1000, 0.02, 0.10, 460, 0.16),
    ("SC", "原油", "上期能源", 1000, 0.1, 0.15, 560, 0.38),
]


# ══════════════════════════════════════════════════════════════════
#  随机数：自带实现，保证跨机器可复现
# ══════════════════════════════════════════════════════════════════

class Rng:
    """xorshift128+ 的简化版。用它而不是 random 模块，是为了让同一 seed
    在任何 Python 版本上都产出逐位相同的数据 —— 演示数据也要可复现。"""

    def __init__(self, seed: int):
        self.s = [(seed ^ 0x9E3779B9) & 0xFFFFFFFF, (seed * 2654435761) & 0xFFFFFFFF,
                  (seed ^ 0x85EBCA6B) & 0xFFFFFFFF, (seed * 374761393 + 1) & 0xFFFFFFFF]
        for _ in range(12):
            self.next()

    def next(self) -> float:
        a, b, c, d = self.s
        t = (b << 9) & 0xFFFFFFFF
        c ^= a; d ^= b; b ^= c; a ^= d; c ^= t
        d = ((d << 11) | (d >> 21)) & 0xFFFFFFFF
        self.s = [a & 0xFFFFFFFF, b & 0xFFFFFFFF, c & 0xFFFFFFFF, d]
        return ((d * 5) & 0xFFFFFFFF) / 0x100000000

    def normal(self) -> float:
        u = max(self.next(), 1e-12)
        v = self.next()
        return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)

    def student_t(self, df: float = 4.0, cap: float = 8.0) -> float:
        """肥尾：t 分布的尾部比正态厚得多，更接近真实市场。

        必须截断。t(4) 的分母是卡方，偶尔会抽到极接近 0 的值，
        算出来的 t 能到几百 —— 喂进 GARCH 递推会让方差指数爆炸，
        math.exp() 直接溢出。截到 ±8 个标准差，既保住肥尾又不会失控。
        """
        z = self.normal()
        chi = sum(self.normal() ** 2 for _ in range(int(df)))
        t = z / math.sqrt(max(chi, 0.05) / df)
        # 归一化到单位方差。t(df) 的方差是 df/(df-2)，df=4 时是 2 ——
        # 不除掉这一项，实际波动率就是设定值的 1.41 倍，
        # 涨跌停会从「十倍标准差的罕见事件」变成家常便饭。
        t /= math.sqrt(df / (df - 2))
        return max(-cap, min(cap, t))

    def pick(self, seq):
        return seq[int(self.next() * len(seq)) % len(seq)]


# ══════════════════════════════════════════════════════════════════
#  交易日历
# ══════════════════════════════════════════════════════════════════

def trading_days(start: date, n: int) -> list[date]:
    """A 股交易日：跳过周末，并跳过几个主要法定假期区间（近似）。"""
    out: list[date] = []
    d = start
    while len(out) < n:
        if d.weekday() < 5 and not _is_holiday(d):
            out.append(d)
        d += timedelta(days=1)
    return out


def _is_holiday(d: date) -> bool:
    md = (d.month, d.day)
    if md == (1, 1) or (d.month == 1 and d.day <= 3):
        return True
    if d.month == 5 and d.day <= 3:                 # 劳动节
        return True
    if d.month == 10 and d.day <= 7:                # 国庆
        return True
    # 春节：用一个随年份漂移的近似窗口，避免每年都落在同一天
    cny = 20 + (d.year * 7) % 25
    if d.month == 2 and cny <= d.day <= cny + 6:
        return True
    return False


# ══════════════════════════════════════════════════════════════════
#  行情合成
# ══════════════════════════════════════════════════════════════════

@dataclass
class Bar:
    t: int
    o: float
    h: float
    l: float
    c: float
    v: float
    limit_up: bool = False
    limit_down: bool = False
    suspended: bool = False


def _garch_path(rng: Rng, n: int, ann_vol: float) -> list[float]:
    """GARCH(1,1) 式的波动率聚集：今天波动大，明天大概率也大。"""
    base = ann_vol / math.sqrt(244)
    omega, alpha, beta = base * base * 0.05, 0.10, 0.85
    var = base * base
    var_cap = base * base * 9           # 波动率最多放大到 3 倍。放到 6 倍的话
                                        # 日内 σ 能到 6%，10% 涨停只有 1.7σ，天天封板
    out = []
    for _ in range(n):
        shock = rng.student_t(4.0) * math.sqrt(var)
        shock = max(-0.25, min(0.25, shock))
        var = min(omega + alpha * shock * shock + beta * var, var_cap)
        out.append(shock)
    return out


def make_market_factor(rng: Rng, n: int) -> list[float]:
    """大盘因子：所有股票共享，制造板块联动与系统性风险。"""
    shocks = _garch_path(rng, n, 0.22)
    # 叠加两轮慢牛慢熊，让回放里能遇到真正的趋势段
    out = []
    for i, s in enumerate(shocks):
        cycle = 0.00022 * math.sin(2 * math.pi * i / 520) + 0.00015 * math.sin(2 * math.pi * i / 190)
        out.append(s + cycle)
    return out


def synth_stock(rng: Rng, days: list[date], px0: float, ann_vol: float,
                market: list[float], beta: float, sector_f: list[float],
                quality: float, limit_pct: float) -> list[Bar]:
    """
    单只股票的日线。收益 = beta·大盘 + 0.6·板块 + 个股噪声 + 基本面漂移。

    quality 是这家公司的"基本面质量"（0~1），它同时驱动：
      · 长期收益漂移（好公司长期跑赢）
      · 财报里的 ROE / 增速
    两者同源，所以「财务选股」筛出来的高 ROE 组合，在这份数据里
    确实会有超额收益 —— 演示才有说服力，而不是筛完发现毫无区别。
    """
    n = len(days)
    idio = _garch_path(rng, n, ann_vol)
    drift = (quality - 0.5) * 0.0013        # 年化约 ±16%，好公司长期跑赢但不夸张

    bars: list[Bar] = []
    px = px0
    prev_close = px0
    for i in range(n):
        if rng.next() < 0.004:              # 约每 250 个交易日停牌一次
            bars.append(Bar(_ts(days[i]), prev_close, prev_close, prev_close,
                            prev_close, 0.0, suspended=True))
            continue

        r = 1.35 * beta * market[i] + 0.6 * sector_f[i] + idio[i] + drift
        # 涨跌停：封板价本身要先取到 2 位小数（真实盘口就是这样报的），
        # 再拿它去夹。反过来先夹再取整的话，四舍五入会把价格推出板外万分之一，
        # 于是「涨幅不得超过 10%」这条铁律在数据里就被破了。
        # 涨停价向下取整到分、跌停价向上取整到分。
        # 用四舍五入的话，9.045 会被取成 9.04，相对 10.05 就是 −10.05%，
        # 「涨跌幅不得超过 10%」这条铁律在数据里就破了。
        cap_hi = math.floor(prev_close * (1 + limit_pct) * 100) / 100
        cap_lo = math.ceil(prev_close * (1 - limit_pct) * 100) / 100
        close = min(max(_r2(prev_close * math.exp(r)), cap_lo), cap_hi)

        hit_up = close >= cap_hi - 1e-9
        hit_dn = close <= cap_lo + 1e-9
        # 一字板：真正的涨跌停里有相当一部分是开盘即封死
        board = (hit_up or hit_dn) and rng.next() < 0.45

        if board:
            o = h = l = close
        else:
            gap = rng.normal() * abs(r) * 0.4
            o = min(max(_r2(prev_close * math.exp(gap)), cap_lo), cap_hi)
            wick = abs(r) * (0.5 + rng.next())
            h = min(_r2(max(o, close) * math.exp(abs(rng.normal()) * wick * 0.5)), cap_hi)
            l = max(_r2(min(o, close) * math.exp(-abs(rng.normal()) * wick * 0.5)), cap_lo)

        # 成交量：跟波动正相关，涨跌停时缩量（封死了没人能成交）
        vbase = 8e6 * math.exp(rng.normal() * 0.35)
        vol = vbase * (1 + 6 * abs(r))
        if board:
            vol *= 0.18

        bars.append(Bar(_ts(days[i]), o, h, l, close, round(vol),
                        limit_up=hit_up, limit_down=hit_dn))
        prev_close = close
    return bars


def synth_future(rng: Rng, days: list[date], px0: float, ann_vol: float,
                 market: list[float], beta: float, tick: float) -> list[Bar]:
    """期货主力连续。没有涨跌停夹逼（简化），但有跳空和更肥的尾。"""
    n = len(days)
    idio = _garch_path(rng, n, ann_vol)
    bars: list[Bar] = []
    prev_close = px0
    for i in range(n):
        r = beta * market[i] + idio[i]
        close = prev_close * math.exp(r)
        # 期货隔夜跳空比股票明显（外盘影响）
        o = prev_close * math.exp(rng.normal() * abs(r) * 0.7)
        wick = abs(r) * (0.6 + rng.next())
        h = max(o, close) * math.exp(abs(rng.normal()) * wick * 0.6)
        l = min(o, close) * math.exp(-abs(rng.normal()) * wick * 0.6)
        vol = 2.2e5 * math.exp(rng.normal() * 0.4) * (1 + 5 * abs(r))
        q = lambda x: round(round(x / tick) * tick, 4)
        bars.append(Bar(_ts(days[i]), q(o), q(h), q(l), q(close), round(vol)))
        prev_close = close
    return bars


def _ts(d: date) -> int:
    return int(date(d.year, d.month, d.day).toordinal() - date(1970, 1, 1).toordinal()) * 86400000


def _r2(x: float) -> float:
    return round(x, 2)


# ══════════════════════════════════════════════════════════════════
#  财报合成
# ══════════════════════════════════════════════════════════════════

@dataclass
class Report:
    """一期财报。

    ⚠️ `discl` （实际披露日）是这个结构里最重要的字段。
    「财报时光机」必须按披露日过滤，而不是按报告期 ——
    2024 年一季报是 4 月底才公布的，拿它去解释 4 月初的股价就是未来函数。
    """
    period: str          # 报告期，如 2023Q4
    end_ts: int          # 报告期结束日
    discl_ts: int        # 实际披露日
    revenue: float       # 营业收入（万元）
    net_profit: float    # 归母净利润（万元）
    equity: float        # 归母净资产（万元）
    assets: float        # 总资产（万元）
    liabilities: float   # 总负债（万元）
    cash_flow: float     # 经营性现金流净额（万元）
    shares: float        # 总股本（万股）


QUARTER_END = {1: (3, 31), 2: (6, 30), 3: (9, 30), 4: (12, 31)}
# 披露滞后：一季报 4 月底、半年报 8 月底、三季报 10 月底、年报次年 4 月底
DISCLOSE_LAG_DAYS = {1: 30, 2: 61, 3: 31, 4: 120}


def synth_reports(rng: Rng, days: list[date], quality: float, sector: str) -> list[Report]:
    first, last = days[0], days[-1]
    reports: list[Report] = []

    # 起始规模：不同板块量级差别很大
    scale = {"银行": 40, "白酒食品": 8, "医药生物": 5, "新能源": 12,
             "半导体": 4, "房地产": 20, "券商": 10, "机械制造": 7}.get(sector, 6)
    revenue = 120000 * scale * math.exp(rng.normal() * 0.3)
    # 净资产相对**季度**收入的倍数。定得太小会让 ROE 系统性偏高 ——
    # 曾经用过 1.6~2.8 倍，结果全市场 ROE 中位 22%，真实 A 股只有 8% 左右，
    # 于是「高 ROE」这个条件筛出了八成的票，等于没筛。
    equity = revenue * (4.5 + rng.next() * 4.0)
    assets = equity * (1.7 + rng.next() * 2.2)
    # 净利率与 ROE 由 quality 驱动，和股价漂移同源
    margin = 0.03 + quality * 0.22 + rng.normal() * 0.015
    # 增速区间要拉开，否则「营收同比 ≥ 20%」这类成长股条件永远无解
    growth_q = (quality - 0.45) * 0.135          # 每季环比增速，年化约 −21% ~ +32%

    y = first.year
    q = (first.month - 1) // 3 + 1
    while True:
        m, dd = QUARTER_END[q]
        end = date(y, m, dd)
        discl = end + timedelta(days=DISCLOSE_LAG_DAYS[q])
        if end > last:
            break
        if end >= first:
            # 季节性：四季度收入通常最高
            seas = {1: 0.88, 2: 1.02, 3: 0.97, 4: 1.13}[q]
            rev_q = revenue * seas * math.exp(rng.normal() * 0.05)
            np_q = rev_q * max(0.002, margin + rng.normal() * 0.02)
            # 先各自取整，再让负债 = 资产 − 净资产。
            # 三个数各自独立取整的话，会出现 资产 ≠ 净资产 + 负债 的报表。
            eq_r, as_r = round(equity, 1), round(assets, 1)
            reports.append(Report(
                period=f"{y}Q{q}",
                end_ts=_ts(end), discl_ts=_ts(discl),
                revenue=round(rev_q, 1),
                net_profit=round(np_q, 1),
                equity=eq_r,
                assets=as_r,
                liabilities=round(as_r - eq_r, 1),
                cash_flow=round(np_q * (0.6 + rng.next() * 0.9), 1),
                shares=round(revenue / 40, 1),
            ))
            equity += np_q * 0.30                 # 留存收益滚存，其余分红。
            # 留存比例不能太高：高盈利公司净资产滚得太快，ROE 会被自己摊薄，
            # 最后「高 ROE」反而认不出好公司。
            assets *= 1 + growth_q * 0.6 + 0.004
        revenue *= 1 + growth_q + rng.normal() * 0.02
        q += 1
        if q > 4:
            q = 1
            y += 1
    return reports


# ══════════════════════════════════════════════════════════════════
#  组装与输出
# ══════════════════════════════════════════════════════════════════

def build(n_days: int = 1100, seed: int = 20240118) -> dict:
    rng = Rng(seed)
    start = date(2019, 1, 2)
    days = trading_days(start, n_days)
    market = make_market_factor(rng, n_days)

    stocks, fundamentals = [], {}
    code_seq = {"主板沪": 600100, "主板深": 1, "创业板": 300100, "科创板": 688100}

    for sector, corr, svol in SECTORS:
        sector_f = _garch_path(rng, n_days, svol * 0.55)
        for name in STOCK_NAMES[sector]:
            r = rng.next()
            if r < 0.55:
                board, key = "主板", "主板沪"
                code = f"{code_seq['主板沪']}.SH"; code_seq["主板沪"] += 7
            elif r < 0.75:
                board, key = "主板", "主板深"
                code = f"{code_seq['主板深']:06d}.SZ"; code_seq["主板深"] += 11
            elif r < 0.9:
                board = "创业板"
                code = f"{code_seq['创业板']}.SZ"; code_seq["创业板"] += 5
            else:
                board = "科创板"
                code = f"{code_seq['科创板']}.SH"; code_seq["科创板"] += 3

            quality = rng.next()
            limit_pct = BOARD_RULES[board]
            px0 = 5 + rng.next() * 55
            beta = corr + rng.normal() * 0.12
            bars = synth_stock(rng, days, px0, svol, market, beta, sector_f, quality, limit_pct)
            stocks.append({
                "symbol": code, "display": name, "sector": sector, "board": board,
                "limitPct": limit_pct, "timeframe": "1d",
                "count": len(bars), "rows": [_row(b) for b in bars],
                "limitUp": [i for i, b in enumerate(bars) if b.limit_up],
                "limitDown": [i for i, b in enumerate(bars) if b.limit_down],
                "suspended": [i for i, b in enumerate(bars) if b.suspended],
            })
            fundamentals[code] = {
                "symbol": code, "display": name, "sector": sector,
                "reports": [_rep(r) for r in synth_reports(rng, days, quality, sector)],
            }

    futures = []
    for code, name, exch, mult, tick, margin, px0, vol in FUTURES:
        beta = 0.25 + rng.next() * 0.5
        bars = synth_future(rng, days, px0, vol, market, beta, tick)
        futures.append({
            "symbol": code + "0", "display": name, "exchange": exch,
            "multiplier": mult, "tickSize": tick, "marginRate": margin,
            "timeframe": "1d", "count": len(bars), "rows": [_row(b) for b in bars],
        })

    meta = {
        "synthetic": True,
        "disclaimer": DISCLAIMER,
        "generator": "tools/gen_demo_data.py",
        "seed": seed,
        "from": days[0].isoformat(),
        "to": days[-1].isoformat(),
        "tradingDays": len(days),
    }
    return {"meta": meta, "stocks": stocks, "futures": futures, "fundamentals": fundamentals}


def _row(b: Bar) -> list:
    return [b.t, b.o, b.h, b.l, b.c, b.v]


def _rep(r: Report) -> list:
    return [r.period, r.end_ts, r.discl_ts, r.revenue, r.net_profit,
            r.equity, r.assets, r.liabilities, r.cash_flow, r.shares]


REPORT_FIELDS = ["period", "endTs", "disclTs", "revenue", "netProfit",
                 "equity", "assets", "liabilities", "cashFlow", "shares"]


def write_all(out: dict) -> None:
    os.makedirs(DATA, exist_ok=True)
    meta = out["meta"]

    with open(os.path.join(DATA, "cn_stocks.json"), "w", encoding="utf-8") as f:
        json.dump({**meta, "kind": "stocks", "items": out["stocks"]}, f,
                  ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(DATA, "cn_futures.json"), "w", encoding="utf-8") as f:
        json.dump({**meta, "kind": "futures", "items": out["futures"]}, f,
                  ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(DATA, "cn_fundamentals.json"), "w", encoding="utf-8") as f:
        json.dump({**meta, "kind": "fundamentals", "fields": REPORT_FIELDS,
                   "items": out["fundamentals"]}, f,
                  ensure_ascii=False, separators=(",", ":"))

    for name in ("cn_stocks", "cn_futures", "cn_fundamentals"):
        p = os.path.join(DATA, name + ".json")
        print(f"  {name}.json  {os.path.getsize(p) / 1024:.0f} KB")


# ══════════════════════════════════════════════════════════════════
#  自检
# ══════════════════════════════════════════════════════════════════

class GenTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = build(n_days=420, seed=99)

    def test_reproducible(self):
        """同一 seed 必须逐位可复现 —— 演示数据也不能每次跑都不一样"""
        a = build(n_days=120, seed=7)
        b = build(n_days=120, seed=7)
        self.assertEqual(a["stocks"][0]["rows"], b["stocks"][0]["rows"])

    def test_meta_marks_synthetic(self):
        """这是最重要的一条：产出必须自带「合成数据」标记"""
        self.assertTrue(self.out["meta"]["synthetic"])
        self.assertIn("非真实行情", self.out["meta"]["disclaimer"])

    def test_ohlc_consistent(self):
        for s in self.out["stocks"] + self.out["futures"]:
            for t, o, h, l, c, v in s["rows"]:
                self.assertGreaterEqual(h, max(o, c) - 1e-6, s["display"])
                self.assertLessEqual(l, min(o, c) + 1e-6, s["display"])
                self.assertGreater(l, 0)
                self.assertGreaterEqual(v, 0)

    def test_limit_never_exceeded(self):
        """涨跌停幅度不能被突破 —— 这是 A 股最硬的规则"""
        for s in self.out["stocks"]:
            pct = s["limitPct"]
            rows = s["rows"]
            susp = set(s["suspended"])
            for i in range(1, len(rows)):
                if i in susp or (i - 1) in susp:
                    continue
                prev_c = rows[i - 1][4]
                for px in rows[i][1:5]:
                    chg = px / prev_c - 1
                    self.assertLessEqual(chg, pct + 1e-6,
                                         f'{s["display"]} 第 {i} 根涨幅 {chg:.4f} 超过 {pct}')
                    self.assertGreaterEqual(chg, -pct - 1e-6,
                                            f'{s["display"]} 第 {i} 根跌幅 {chg:.4f} 超过 {pct}')

    def test_limit_flags_match_prices(self):
        """封板时收盘价必须**正好等于**封板价。

        注意不能断言涨幅正好等于 10%：封板价要取到分，向下取整之后
        实际涨幅会略小于 10%（比如 0.0998），这正是真实盘口的样子。
        所以对的不变量是「收盘价 == 按规则算出来的封板价」。
        """
        for s in self.out["stocks"]:
            rows, pct = s["rows"], s["limitPct"]
            for i in s["limitUp"]:
                if i == 0:
                    continue
                cap = math.floor(rows[i - 1][4] * (1 + pct) * 100) / 100
                self.assertAlmostEqual(rows[i][4], cap, places=6,
                                       msg=f'{s["display"]} 第 {i} 根标了涨停但收盘价不等于涨停价')
            for i in s["limitDown"]:
                if i == 0:
                    continue
                cap = math.ceil(rows[i - 1][4] * (1 - pct) * 100) / 100
                self.assertAlmostEqual(rows[i][4], cap, places=6,
                                       msg=f'{s["display"]} 第 {i} 根标了跌停但收盘价不等于跌停价')

    def test_suspended_zero_volume(self):
        for s in self.out["stocks"]:
            for i in s["suspended"]:
                self.assertEqual(s["rows"][i][5], 0)

    def test_boards_and_limits_cover_all_rules(self):
        boards = {s["board"] for s in self.out["stocks"]}
        self.assertIn("主板", boards)
        self.assertTrue({"创业板", "科创板"} & boards, "应当有 20% 涨跌幅的标的")
        for s in self.out["stocks"]:
            self.assertEqual(s["limitPct"], BOARD_RULES[s["board"]])

    def test_fat_tails_and_vol_clustering(self):
        """检验数据像真市场：峰度显著高于正态，且波动率有自相关"""
        rows = self.out["stocks"][0]["rows"]
        rets = [rows[i][4] / rows[i - 1][4] - 1 for i in range(1, len(rows)) if rows[i - 1][4] > 0]
        m = sum(rets) / len(rets)
        var = sum((r - m) ** 2 for r in rets) / len(rets)
        kurt = sum((r - m) ** 4 for r in rets) / len(rets) / (var * var)
        self.assertGreater(kurt, 3.2, f"峰度 {kurt:.2f} 太低，尾巴不够肥")

        absr = [abs(r - m) for r in rets]
        am = sum(absr) / len(absr)
        num = sum((absr[i] - am) * (absr[i - 1] - am) for i in range(1, len(absr)))
        den = sum((a - am) ** 2 for a in absr)
        self.assertGreater(num / den, 0.03, "波动率没有聚集，不像真市场")

    def test_market_factor_creates_correlation(self):
        """同一天大盘跌，多数股票应该一起跌 —— 否则板块联动是假的"""
        rows = [s["rows"] for s in self.out["stocks"]]
        n = len(rows[0])
        agree = 0
        for i in range(1, n):
            ups = sum(1 for r in rows if r[i - 1][4] > 0 and r[i][4] > r[i - 1][4])
            frac = ups / len(rows)
            if frac > 0.7 or frac < 0.3:
                agree += 1
        self.assertGreater(agree / n, 0.2, "涨跌太分散，看不出系统性风险")

    def test_reports_have_disclosure_lag(self):
        """财报时光机的地基：披露日必须晚于报告期结束日"""
        for code, f in self.out["fundamentals"].items():
            self.assertTrue(f["reports"], code)
            for r in f["reports"]:
                d = dict(zip(REPORT_FIELDS, r))
                self.assertGreater(d["disclTs"], d["endTs"],
                                   f'{code} {d["period"]} 披露日不晚于报告期末')
                lag_days = (d["disclTs"] - d["endTs"]) / 86400000
                self.assertGreaterEqual(lag_days, 25)
                self.assertLessEqual(lag_days, 130)

    def test_reports_are_chronological_and_sane(self):
        for code, f in self.out["fundamentals"].items():
            prev = -1
            for r in f["reports"]:
                d = dict(zip(REPORT_FIELDS, r))
                self.assertGreater(d["endTs"], prev, code)
                prev = d["endTs"]
                self.assertGreater(d["revenue"], 0)
                self.assertGreater(d["equity"], 0)
                self.assertAlmostEqual(d["assets"], d["equity"] + d["liabilities"], places=1)

    def test_every_stock_has_fundamentals(self):
        codes = {s["symbol"] for s in self.out["stocks"]}
        self.assertEqual(codes, set(self.out["fundamentals"].keys()))

    def test_quality_drives_both_price_and_fundamentals(self):
        """
        这条最关键：ROE 高的公司，长期涨幅也该更好。
        两者同源是有意为之 —— 否则「财务选股」演示出来会发现筛不筛都一样，
        客户看到的就是一个没有说服力的空壳。
        """
        pairs = []
        for s in self.out["stocks"]:
            reps = self.out["fundamentals"][s["symbol"]]["reports"]
            if len(reps) < 4:
                continue
            d = [dict(zip(REPORT_FIELDS, r)) for r in reps]
            roe = sum(x["netProfit"] / x["equity"] for x in d) / len(d)
            ret = s["rows"][-1][4] / s["rows"][0][4] - 1
            pairs.append((roe, ret))
        self.assertGreater(len(pairs), 10)
        # Spearman 秩相关
        rk = lambda xs: {v: i for i, v in enumerate(sorted(xs))}
        r1, r2 = rk([p[0] for p in pairs]), rk([p[1] for p in pairs])
        n = len(pairs)
        dsum = sum((r1[a] - r2[b]) ** 2 for a, b in pairs)
        rho = 1 - 6 * dsum / (n * (n * n - 1))
        self.assertGreater(rho, 0.25, f"ROE 与涨幅的秩相关只有 {rho:.2f}，财务选股会演示不出效果")

    def test_total_returns_are_plausible(self):
        """涨幅要落在人能接受的范围里。

        这条是被一次事故逼出来的：为了让 ROE 与涨幅的相关性达标，
        我一度把基本面漂移调到年化 34%，结果一只银行股四年涨了 9.4 倍。
        数据可以是合成的，但不能一眼假。
        """
        for s in self.out["stocks"]:
            rows = s["rows"]
            total = rows[-1][4] / rows[0][4] - 1
            years = len(rows) / 244
            cagr = (1 + total) ** (1 / years) - 1
            # 区间不对称是有道理的：价格下有零的硬底，上不封顶。
            # 上限定在 65%：之前那次事故是年化 75%（四年 9.4 倍），
            # 原本 120% 的上限根本没兜住 —— 阈值要卡在会真的报警的位置。
            self.assertGreater(cagr, -0.72, f'{s["display"]} 年化 {cagr:.1%}，跌得不像话')
            self.assertLess(cagr, 0.65, f'{s["display"]} 年化 {cagr:.1%}，涨得不像话')

    def test_limit_frequency_is_plausible(self):
        """涨跌停是稀有事件。天天封板的数据不像 A 股，像庄股。"""
        for s in self.out["stocks"]:
            n = len(s["rows"])
            up = len(s["limitUp"]) / n
            dn = len(s["limitDown"]) / n
            self.assertLess(up, 0.045, f'{s["display"]} 涨停占比 {up:.1%}，太频繁')
            self.assertLess(dn, 0.045, f'{s["display"]} 跌停占比 {dn:.1%}，太频繁')

    def test_suspension_frequency_is_plausible(self):
        for s in self.out["stocks"]:
            frac = len(s["suspended"]) / len(s["rows"])
            self.assertLess(frac, 0.02, f'{s["display"]} 停牌占比 {frac:.1%}，太频繁')

    def test_futures_have_contract_specs(self):
        for f in self.out["futures"]:
            self.assertGreater(f["multiplier"], 0)
            self.assertGreater(f["tickSize"], 0)
            self.assertGreater(f["marginRate"], 0)
            # 报价必须落在最小变动价位的整数倍上
            for row in f["rows"][:200]:
                for px in row[1:5]:
                    self.assertAlmostEqual(px / f["tickSize"], round(px / f["tickSize"]), places=4)

    def test_calendar_skips_weekends_and_holidays(self):
        days = trading_days(date(2021, 1, 1), 300)
        for d in days:
            self.assertLess(d.weekday(), 5)
            self.assertFalse(_is_holiday(d))
        self.assertEqual(len(set(days)), len(days))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--selftest", action="store_true", help="离线自检，不写文件")
    ap.add_argument("--days", type=int, default=1100, help="交易日数量")
    ap.add_argument("--seed", type=int, default=20240118)
    args = ap.parse_args()

    if args.selftest:
        suite = unittest.TestLoader().loadTestsFromTestCase(GenTests)
        res = unittest.TextTestRunner(verbosity=2).run(suite)
        return 0 if res.wasSuccessful() else 1

    print(f"生成演示数据（seed={args.seed}, {args.days} 个交易日）…")
    out = build(n_days=args.days, seed=args.seed)
    write_all(out)
    m = out["meta"]
    print(f"  {len(out['stocks'])} 只股票 · {len(out['futures'])} 个期货品种 · "
          f"{sum(len(v['reports']) for v in out['fundamentals'].values())} 期财报")
    print(f"  区间 {m['from']} → {m['to']}")
    print("  ⚠️  全部为合成数据，非真实行情")
    return 0


if __name__ == "__main__":
    sys.exit(main())
