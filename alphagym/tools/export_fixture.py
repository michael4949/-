#!/usr/bin/env python3
"""导出真实历史行情为引擎可读的 JSON 夹具。

这不是产品数据管道（那是 tools/akshare_pipeline.py），而是为了让校准测试和
浏览器 demo 跑在**真实市场数据**上而不是随机游走上 —— 真实数据有跳空、
波动率聚集和肥尾，这些恰恰是最容易让统计检验失效的地方。

数据来源（均为公开历史行情，随对应 Python 包分发）：
  · backtesting.py 测试夹具 —— GOOG 日线、EURUSD 小时线
  · arch 包内置数据集      —— S&P 500、NASDAQ 综合指数日线（1999-2018）
"""
import json
import os
import sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


def dump(rows, name, symbol, display, timeframe, note, kind="index"):
    payload = {
        "symbol": symbol,
        "display": display,
        "timeframe": timeframe,
        "kind": kind,
        "source": note,
        "columns": ["t", "o", "h", "l", "c", "v"],
        "count": len(rows),
        "rows": rows,
    }
    path = os.path.join(OUT, name)
    os.makedirs(OUT, exist_ok=True)
    with open(path, "w") as f:
        json.dump(payload, f, separators=(",", ":"))
    print(f"{name:22s} {len(rows):5d} 根  {os.path.getsize(path)/1024:6.0f} KB")


def ohlcv_rows(df, o="Open", h="High", l="Low", c="Close", v="Volume", digits=4):
    rows = []
    for ts, r in df.iterrows():
        rows.append([
            int(ts.timestamp() * 1000),
            round(float(r[o]), digits), round(float(r[h]), digits),
            round(float(r[l]), digits), round(float(r[c]), digits),
            float(r[v]) if v in r else 0.0,
        ])
    return rows


def main():
    from backtesting.test import GOOG, EURUSD
    dump(ohlcv_rows(GOOG, digits=2), "goog_daily.json", "GOOG", "谷歌", "1d",
         "真实历史行情（含 2008 金融危机），来自 backtesting.py 测试夹具", kind="stock")
    dump(ohlcv_rows(EURUSD, digits=5), "eurusd_h1.json", "EURUSD", "欧元美元", "1h",
         "真实历史行情，来自 backtesting.py 测试夹具", kind="fx")

    from arch.data import sp500, nasdaq
    dump(ohlcv_rows(sp500.load(), digits=2), "sp500_daily.json", "SPX", "标普500", "1d",
         "真实历史行情 1999-2018（含 2000 互联网泡沫、2008 金融危机），来自 arch 数据集")
    dump(ohlcv_rows(nasdaq.load(), digits=2), "nasdaq_daily.json", "IXIC", "纳斯达克", "1d",
         "真实历史行情 1999-2018，来自 arch 数据集")


if __name__ == "__main__":
    sys.exit(main())
