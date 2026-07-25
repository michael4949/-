#!/usr/bin/env python3
"""把 backtesting.py 自带的真实行情样本导出为引擎可读的 JSON 夹具。

这不是产品数据管道（那是 tools/akshare_pipeline.py），只是为了让校准测试
跑在**真实市场数据**上而不是随机游走上 —— 真实数据有跳空、波动率聚集和肥尾，
这些恰恰是最容易让统计检验失效的地方。用随机游走验证过的引擎，
一碰到真实数据就可能露馅。

数据来源：backtesting.py 测试夹具（GOOG 日线、EURUSD 小时线），均为公开历史行情。
"""
import json
import os
import sys

OUT = os.path.join(os.path.dirname(__file__), "..", "data")


def dump(df, name, symbol, timeframe, note):
    rows = []
    for ts, r in df.iterrows():
        rows.append([
            int(ts.timestamp() * 1000),
            round(float(r["Open"]), 6),
            round(float(r["High"]), 6),
            round(float(r["Low"]), 6),
            round(float(r["Close"]), 6),
            float(r["Volume"]) if "Volume" in r else 0.0,
        ])
    payload = {
        "symbol": symbol,
        "timeframe": timeframe,
        "source": note,
        "columns": ["t", "o", "h", "l", "c", "v"],
        "count": len(rows),
        "rows": rows,
    }
    path = os.path.join(OUT, name)
    os.makedirs(OUT, exist_ok=True)
    with open(path, "w") as f:
        json.dump(payload, f, separators=(",", ":"))
    print(f"{name}: {len(rows)} 根  {df.index[0]} → {df.index[-1]}  ({os.path.getsize(path)/1024:.0f} KB)")


def main():
    from backtesting.test import GOOG, EURUSD
    dump(GOOG, "goog_daily.json", "GOOG", "1d",
         "真实历史行情（含 2008 金融危机），来自 backtesting.py 测试夹具")
    dump(EURUSD, "eurusd_h1.json", "EURUSD", "1h",
         "真实历史行情，来自 backtesting.py 测试夹具")


if __name__ == "__main__":
    sys.exit(main())
