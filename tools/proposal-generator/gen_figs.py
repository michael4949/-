
# -*- coding: utf-8 -*-
"""方案配图：竞品矩阵 / 架构 / 闭环 / 舆情拓扑 / 双版本 / 报价 / 甘特"""
import os, math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Rectangle
from matplotlib.path import Path
import matplotlib.patheffects as pe

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE + "/img"; os.makedirs(OUT, exist_ok=True)

FP = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
fm.fontManager.addfont(FP)
CJK = fm.FontProperties(fname=FP).get_name()
plt.rcParams["font.family"] = CJK
plt.rcParams["axes.unicode_minus"] = False

BG      = "#0B1120"
PANEL   = "#101A31"
CYAN    = "#00D4FF"
TEAL    = "#00F5D4"
GOLD    = "#C9A961"
GOLDL   = "#F0D998"
VIOLET  = "#8B5CF6"
PURPLE  = "#A855F7"
MAGENTA = "#EC4899"
BLUE    = "#2563EB"
SKY     = "#38BDF8"
EMER    = "#10B981"
AMBER   = "#F59E0B"
TXT     = "#E6EDF8"
MUTE    = "#8DA2C0"

def newfig(w, h):
    fig = plt.figure(figsize=(w, h), dpi=170)
    fig.patch.set_facecolor(BG)
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_facecolor(BG)
    ax.set_xlim(0, 100); ax.set_ylim(0, 100); ax.axis("off")
    return fig, ax

def save(fig, name):
    fig.savefig(f"{OUT}/{name}", facecolor=BG, dpi=170)
    plt.close(fig); print("  ✓", name)

def card(ax, x, y, w, h, fc, ec=None, r=1.6, lw=1.6, alpha=1.0, z=2):
    p = FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}",
                       fc=fc, ec=ec or fc, lw=lw, alpha=alpha, zorder=z)
    ax.add_patch(p); return p

def txt(ax, x, y, s, size=11, c=TXT, w="normal", ha="center", va="center", z=6, glow=False):
    t = ax.text(x, y, s, fontsize=size, color=c, fontweight=w, ha=ha, va=va, zorder=z)
    if glow:
        t.set_path_effects([pe.withStroke(linewidth=3, foreground="#04080F")])
    return t

def arrow(ax, p1, p2, c=CYAN, lw=2.0, style="-|>", ms=14, rad=0.0, z=4, ls="-"):
    ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle=style, mutation_scale=ms,
                                 color=c, lw=lw, linestyle=ls, zorder=z,
                                 connectionstyle=f"arc3,rad={rad}"))

def title(ax, s, sub=None, ts=17, ss=10.5):
    txt(ax, 50, 95.5, s, ts, TXT, "bold")
    if sub: txt(ax, 50, 91, sub, ss, MUTE)


# ══════════════ 1. 竞品能力雷达 ══════════════
def fig_radar():
    dims = ["对话式交互", "研究深度\n(因子/回测)", "数据广度", "舆情情报",
            "自动化 / Agent", "组合与风控", "上手门槛低", "B端可扩展"]
    data = {
        "TryQuant":  ([9, 2, 6, 7, 3, 4, 9, 5], CYAN,    "-"),
        "BigQuant":  ([2, 9, 8, 2, 7, 7, 2, 6], GOLD,    "-"),
        "i问财":     ([8, 3, 7, 4, 2, 2, 9, 4], MAGENTA, "-"),
        "本方案(目标)": ([9, 9, 9, 9, 9, 8, 9, 9], TEAL,  "-"),
    }
    N = len(dims)
    ang = [n / N * 2 * math.pi for n in range(N)] + [0]
    fig = plt.figure(figsize=(9.2, 7.4), dpi=170); fig.patch.set_facecolor(BG)
    ax = fig.add_subplot(111, polar=True); ax.set_facecolor(PANEL)
    ax.set_theta_offset(math.pi / 2); ax.set_theta_direction(-1)
    ax.set_ylim(0, 10)
    ax.set_xticks(ang[:-1]); ax.set_xticklabels(dims, fontsize=10.5, color=TXT)
    ax.tick_params(axis="x", pad=16)
    ax.set_yticks([2, 4, 6, 8, 10])
    ax.set_yticklabels(["2", "4", "6", "8", "10"], fontsize=8, color=MUTE)
    ax.grid(color="#2B3B58", lw=0.9)
    ax.spines["polar"].set_color("#2B3B58")
    for k, (v, c, ls) in data.items():
        vv = v + [v[0]]
        lwd = 3.0 if "本方案" in k else 1.9
        ax.plot(ang, vv, color=c, lw=lwd, ls=ls, label=k, zorder=5)
        ax.fill(ang, vv, color=c, alpha=0.20 if "本方案" in k else 0.09, zorder=3)
    lg = ax.legend(loc="upper right", bbox_to_anchor=(1.27, 1.13), fontsize=10.5,
                   facecolor=PANEL, edgecolor="#2B3B58", labelcolor=TXT)
    ax.set_title("三家标的能力对比 · 本方案定位", fontsize=15, color=TXT,
                 fontweight="bold", pad=34)
    fig.savefig(f"{OUT}/fig_radar.png", facecolor=BG, dpi=170, bbox_inches="tight")
    plt.close(fig); print("  ✓ fig_radar.png")


# ══════════════ 2. 能力缺口矩阵 ══════════════
def fig_gap():
    fig, ax = newfig(11.6, 6.2)
    title(ax, "能力缺口矩阵：市场空白区在哪里",
          "横轴＝研究深度（因子·回测·归因）  纵轴＝交互易用性（对话化程度）")
    # 象限底
    card(ax, 12, 14, 76, 68, PANEL, "#243450", r=1.2, lw=1.4)
    ax.plot([50, 50], [14, 82], color="#2B3B58", lw=1.2, ls="--", zorder=3)
    ax.plot([12, 88], [48, 48], color="#2B3B58", lw=1.2, ls="--", zorder=3)
    txt(ax, 50, 10.5, "研究深度  →", 11, MUTE)
    ax.text(8.4, 48, "交互易用性  →", fontsize=11, color=MUTE, rotation=90,
            ha="center", va="center")

    # 空白区高亮
    card(ax, 50, 48, 38, 34, "#0E2A36", TEAL, r=1.2, lw=2.2, alpha=0.55, z=3)
    txt(ax, 69, 76, "★ 市 场 空 白 区", 14, TEAL, "bold", z=7)
    txt(ax, 69, 70.5, "对话式 × 完整投研深度", 11, TEAL, z=7)
    txt(ax, 69, 63, "本方案主战场", 12.5, "#FFFFFF", "bold", z=7)
    txt(ax, 69, 56.5, "一句话跑完\n想法→因子→回测→组合→归因", 10, TXT, z=7)

    pts = [
        (33, 75, "TryQuant", CYAN,    "对话强 / 无因子回测"),
        (19, 60, "选股筛选类工具", MAGENTA, "条件筛选 / 不做验证"),
        (72, 26, "专业量化平台", GOLD,   "研究深 / 门槛高"),
        (33, 38, "传统行情终端", MUTE,   "看盘为主"),
    ]
    for x, y, nm, c, sub in pts:
        ax.add_patch(Circle((x, y), 2.5, fc=c, ec="#FFFFFF", lw=1.5, zorder=6, alpha=0.95))
        txt(ax, x, y - 5.0, nm, 11.5, c, "bold", z=7)
        txt(ax, x, y - 8.4, sub, 8.8, MUTE, z=7)
    save(fig, "fig_gap.png")


# ══════════════ 3. 系统架构分层 ══════════════
def fig_arch():
    fig, ax = newfig(11.6, 7.6)
    title(ax, "系统技术架构 · 六层分层设计",
          "共用内核 ＋ 地区适配包，两地差异集中在数据源与合规适配两层")
    layers = [
        ("L6  应用与交付层", "Web / PWA · 移动端 · B端白标组件 · 开放 API", VIOLET, 76.5),
        ("L5  智能体层 (Agent)", "策略托管 · 持续监控 · 自动调仓建议 · 任务编排", PURPLE, 65.5),
        ("L4  AI 内核层", "意图解析 NLU · Function Call · RAG 知识库 · 多轮对话", CYAN, 54.5),
        ("L3  研究引擎层", "因子引擎 · 回测引擎 · 归因引擎 · 组合与风险", TEAL, 43.5),
        ("L2  数据中台层", "行情 · 财报 · 舆情 · 官方信息源 · 特征存储", BLUE, 32.5),
        ("L1  基础设施层", "K8s · PostgreSQL/TimescaleDB · Redis · 向量库 · 可观测", "#475F86", 21.5),
    ]
    for nm, desc, c, y in layers:
        card(ax, 9, y, 82, 9.2, PANEL, c, r=1.1, lw=2.0)
        card(ax, 9, y, 2.4, 9.2, c, c, r=1.1, lw=0)
        txt(ax, 14.5, y + 5.9, nm, 12, c, "bold", ha="left")
        txt(ax, 14.5, y + 2.8, desc, 9.6, MUTE, ha="left")
    # 右侧合规纵贯条
    card(ax, 92.4, 21.5, 5.2, 64.2, "#2A1A10", AMBER, r=1.1, lw=1.8)
    ax.text(95.0, 53.6, "合 规 与 审 计 贯 穿 全 层", fontsize=10.5, color=AMBER,
            rotation=90, ha="center", va="center", fontweight="bold", zorder=6)
    # 执行层（灰显）
    card(ax, 9, 10.5, 82, 8.0, "#141A26", "#3A4762", r=1.1, lw=1.8, alpha=0.9)
    txt(ax, 50, 16.0, "L0  交易执行层（本次不含）", 11.5, "#7C8BA6", "bold")
    txt(ax, 50, 12.8, "预留持牌机构标准对接位，后续如需接入由甲方自行选择通道", 9.4, "#66748E")
    save(fig, "fig_arch.png")


# ══════════════ 4. 对话式全流程投研闭环 ══════════════
def fig_loop():
    fig, ax = newfig(11.6, 6.4)
    title(ax, "核心差异化：对话式全流程投研闭环",
          "用户一句自然语言，系统自动完成六步研究链路并可复核每一步")
    steps = [
        ("①", "想 法", "自然语言表达\n投资假设", CYAN),
        ("②", "因 子", "自动构建 / 匹配\n因子表达式", TEAL),
        ("③", "回 测", "样本内外检验\n绩效归因", EMER),
        ("④", "组 合", "权重优化\n风险约束", GOLD),
        ("⑤", "监 控", "持续跟踪\n信号预警", PURPLE),
        ("⑥", "归 因", "收益拆解\n迭代优化", MAGENTA),
    ]
    n = len(steps); x0, wid, gap = 5.5, 13.2, 2.4
    for i, (num, nm, desc, c) in enumerate(steps):
        x = x0 + i * (wid + gap)
        card(ax, x, 40, wid, 30, PANEL, c, r=1.3, lw=2.1)
        card(ax, x, 66.4, wid, 3.6, c, c, r=1.3, lw=0)
        txt(ax, x + wid / 2, 62.0, num, 15, c, "bold")
        txt(ax, x + wid / 2, 55.0, nm, 13.5, TXT, "bold")
        txt(ax, x + wid / 2, 47.0, desc, 9.3, MUTE)
        if i < n - 1:
            arrow(ax, (x + wid + 0.3, 55), (x + wid + gap - 0.3, 55), c=c, lw=2.2, ms=13)
    # 回流箭头：绕到卡片下方，不穿越内容
    xr = x0 + 5 * (wid + gap) + wid / 2      # 末步中心
    xl = x0 + wid / 2                         # 首步中心
    ax.plot([xr, xr], [40, 34.5], color=MAGENTA, lw=2.0, ls="--", zorder=4)
    ax.plot([xl, xr], [34.5, 34.5], color=MAGENTA, lw=2.0, ls="--", zorder=4)
    arrow(ax, (xl, 34.5), (xl, 39.6), c=MAGENTA, lw=2.0, ms=14, ls="--")
    card(ax, 42, 31.6, 16, 5.8, BG, BG, r=0.6, lw=0, z=5)
    txt(ax, 50, 34.5, "闭 环 迭 代", 11.5, MAGENTA, "bold", z=6)
    card(ax, 12, 12, 76, 10.5, "#0E1B2E", CYAN, r=1.2, lw=1.7)
    txt(ax, 50, 18.6, "现有产品普遍只能覆盖其中一到两步：或止于情报解读，或止于条件筛选，或要求用户自行编写代码才能走完全程", 9.8, MUTE)
    txt(ax, 50, 14.6, "本方案：全流程对话化，每一步产出可审计、可复现、可导出", 11, TEAL, "bold")
    save(fig, "fig_loop.png")


# ══════════════ 5. 舆情数据源拓扑 ══════════════
def fig_sentiment():
    fig, ax = newfig(11.6, 6.8)
    title(ax, "舆情情绪引擎 · 四类数据源拓扑",
          "采集 → 清洗去重 → 情感与实体识别 → 热点聚合 → 因子化输出")
    srcs = [
        ("境内论坛", "雪球 · 东方财富股吧\n同花顺社区", MAGENTA, 8),
        ("境外社媒", "Reddit · X\nStockTwits · Seeking Alpha", CYAN, 30),
        ("加密原生", "KOL 列表\nTelegram · Discord", PURPLE, 52),
        ("官方信息源", "交易所公告 · 券商研报\n财经媒体", GOLD, 74),
    ]
    for nm, desc, c, x in srcs:
        card(ax, x, 66, 19, 17, PANEL, c, r=1.2, lw=2.0)
        card(ax, x, 80.4, 19, 2.6, c, c, r=1.2, lw=0)
        txt(ax, x + 9.5, 76.5, nm, 12, c, "bold")
        txt(ax, x + 9.5, 70.5, desc, 8.8, MUTE)
        arrow(ax, (x + 9.5, 65.4), (50, 56.6), c=c, lw=1.7, ms=12, rad=0.06)
    # 处理管道
    card(ax, 18, 44, 64, 12.5, "#12203A", TEAL, r=1.3, lw=2.2)
    txt(ax, 50, 52.5, "统一采集与治理管道", 12.5, TEAL, "bold")
    txt(ax, 50, 47.6, "反爬调度 · 频控 · 去重 · 内容审核 · 敏感词过滤 · 版权与来源留痕", 9.4, MUTE)
    arrow(ax, (50, 43.4), (50, 37.6), c=TEAL, lw=2.2, ms=14)

    outs = [
        ("情感极性", "多空强度打分", EMER, 8),
        ("实体识别", "标的 / 板块 / 事件", SKY, 30),
        ("热度聚合", "话题榜 · 异动预警", AMBER, 52),
        ("情绪因子", "可回测的量化因子", MAGENTA, 74),
    ]
    for nm, desc, c, x in outs:
        card(ax, x, 20, 19, 16, PANEL, c, r=1.2, lw=2.0)
        txt(ax, x + 9.5, 30.5, nm, 11.5, c, "bold")
        txt(ax, x + 9.5, 25.0, desc, 8.8, MUTE)
        arrow(ax, (50, 37.2), (x + 9.5, 36.4), c=c, lw=1.5, ms=11, rad=-0.05)
    txt(ax, 50, 13.5, "▲ 关键差异：情绪不止于展示，而是直接沉淀为可回测因子进入研究引擎",
        10.5, TEAL, "bold")
    txt(ax, 50, 8.6, "境内论坛多无开放 API，方案采用合规采集策略并在第 9 章明确技术与法律边界",
        9.0, MUTE)
    save(fig, "fig_sentiment.png")


# ══════════════ 6. 双版本架构 ══════════════
def fig_dual():
    fig, ax = newfig(11.6, 6.4)
    title(ax, "双版本架构：一套内核，两个地区包",
          "内核复用率约 78%，地区差异集中在数据源适配与合规适配两层")
    card(ax, 22, 58, 56, 27, "#14213C", CYAN, r=1.4, lw=2.4)
    card(ax, 22, 81.6, 56, 3.4, CYAN, CYAN, r=1.4, lw=0)
    txt(ax, 50, 76.5, "共 用 平 台 内 核", 15, CYAN, "bold")
    txt(ax, 50, 69.5, "AI 对话内核 · 因子引擎 · 回测引擎 · 舆情管道 · Agent 编排 · 图表与前端", 10, TXT)
    txt(ax, 50, 63.0, "一次开发，两地复用", 10.5, MUTE)

    arrow(ax, (38, 57.4), (28, 46.6), c=EMER, lw=2.2, ms=14, rad=0.10)
    arrow(ax, (62, 57.4), (72, 46.6), c=PURPLE, lw=2.2, ms=14, rad=-0.10)

    left = [("数据源适配", "Tushare Pro · AKShare · 万得"),
            ("舆情源适配", "雪球 · 东财股吧 · 同花顺"),
            ("合规适配", "适当性 · AI标识 · 留痕 · 敏感词")]
    right = [("数据源适配", "港美股行情 · 加密行情 · 链上数据"),
             ("舆情源适配", "Reddit · X · StockTwits · TG/Discord"),
             ("合规适配", "地域准入 · 免责声明 · 隐私合规")]
    for (items, c, x, nm) in [(left, EMER, 6, "境内版 · A 股"),
                              (right, PURPLE, 54, "境外版 · 港美股 / 加密")]:
        card(ax, x, 12, 40, 34, PANEL, c, r=1.3, lw=2.2)
        card(ax, x, 42.4, 40, 3.6, c, c, r=1.3, lw=0)
        txt(ax, x + 20, 38.0, nm, 12.5, c, "bold")
        for i, (t1, t2) in enumerate(items):
            yy = 31.5 - i * 6.6
            card(ax, x + 2.5, yy - 2.4, 35, 5.4, "#16233C", "#2C3D5C", r=0.8, lw=1.1)
            txt(ax, x + 5.0, yy + 0.9, t1, 9.8, c, "bold", ha="left")
            txt(ax, x + 5.0, yy - 1.3, t2, 8.4, MUTE, ha="left")
    save(fig, "fig_dual.png")


# ══════════════ 7. 报价结构 ══════════════
def fig_price():
    fig = plt.figure(figsize=(11.6, 6.0), dpi=170); fig.patch.set_facecolor(BG)
    ax = fig.add_axes([0.09, 0.16, 0.62, 0.68]); ax.set_facecolor(PANEL)
    names = ["A 平台内核", "B 超越模块", "C 境内地区包", "D 境外地区包",
             "E B端白标", "F 交付保障"]
    vals  = [168, 172, 46, 44, 38, 32]
    cols  = [CYAN, MAGENTA, EMER, PURPLE, GOLD, SKY]
    y = np.arange(len(names))[::-1]
    ax.barh(y, vals, color=cols, height=0.62, zorder=3,
            edgecolor="#0B1120", linewidth=1.4)
    for yy, v in zip(y, vals):
        ax.text(v + 4, yy, f"{v} 万", va="center", fontsize=11.5,
                color=TXT, fontweight="bold", zorder=5)
    ax.set_yticks(y); ax.set_yticklabels(names, fontsize=11, color=TXT)
    ax.set_xlim(0, 210); ax.set_xlabel("人民币（万元）", fontsize=10.5, color=MUTE)
    ax.tick_params(colors=MUTE, labelsize=9.5)
    for s in ax.spines.values(): s.set_color("#2B3B58")
    ax.grid(axis="x", color="#22314C", lw=0.8, zorder=1)
    ax.set_title("模块化报价结构（不含交易执行模块）", fontsize=14.5,
                 color=TXT, fontweight="bold", pad=16)

    ax2 = fig.add_axes([0.735, 0.16, 0.245, 0.68]); ax2.set_facecolor(BG); ax2.axis("off")
    ax2.set_xlim(0, 10); ax2.set_ylim(0, 10)
    combos = [("组合一\n境内单区", "418", EMER), ("组合二\n双区全量", "462", CYAN),
              ("组合三\n全量＋白标", "500", GOLD)]
    for i, (nm, v, c) in enumerate(combos):
        yy = 7.3 - i * 3.0
        p = FancyBboxPatch((0.4, yy - 1.15), 9.2, 2.3,
                           boxstyle="round,pad=0,rounding_size=0.3",
                           fc=PANEL, ec=c, lw=2.0)
        ax2.add_patch(p)
        ax2.text(5, yy + 0.42, nm, fontsize=9.6, color=MUTE, ha="center", va="center")
        ax2.text(5, yy - 0.58, f"{v} 万", fontsize=15, color=c,
                 ha="center", va="center", fontweight="bold")
    ax2.text(5, 9.4, "推荐组合", fontsize=11.5, color=TXT,
             ha="center", fontweight="bold")
    fig.savefig(f"{OUT}/fig_price.png", facecolor=BG, dpi=170)
    plt.close(fig); print("  ✓ fig_price.png")


# ══════════════ 8. 交付甘特 ══════════════
def fig_gantt():
    fig = plt.figure(figsize=(11.6, 5.8), dpi=170); fig.patch.set_facecolor(BG)
    ax = fig.add_axes([0.20, 0.14, 0.76, 0.72]); ax.set_facecolor(PANEL)
    tasks = [
        ("需求确认与架构设计", 0.0, 0.7, SKY),
        ("A 平台内核（数据中台/AI内核）", 0.4, 1.9, CYAN),
        ("C 境内地区包（A股数据+合规）", 1.0, 1.2, EMER),
        ("B1 因子引擎 + B2 回测归因", 1.6, 1.6, TEAL),
        ("B3 舆情情绪引擎（四源）", 1.8, 1.7, MAGENTA),
        ("B4 AI Agent 策略托管", 2.8, 1.2, PURPLE),
        ("D 境外地区包（港美股/加密）", 3.0, 1.1, VIOLET),
        ("E B端白标与开放 API", 3.4, 0.9, GOLD),
        ("F 测试 · 验收 · 部署上线", 3.6, 1.3, AMBER),
    ]
    y = np.arange(len(tasks))[::-1]
    for yy, (nm, s, d, c) in zip(y, tasks):
        ax.barh(yy, d, left=s, height=0.56, color=c, zorder=3,
                edgecolor="#0B1120", linewidth=1.2, alpha=0.92)
        ax.text(s + d / 2, yy, f"{d:.1f}M", ha="center", va="center",
                fontsize=8.2, color="#08111F", fontweight="bold", zorder=5)
    ax.set_yticks(y); ax.set_yticklabels([t[0] for t in tasks], fontsize=10, color=TXT)
    ax.set_xlim(0, 5.0); ax.set_xticks(range(6))
    ax.set_xticklabels([f"M{i}" for i in range(6)], fontsize=10, color=MUTE)
    ax.set_xlabel("交付月份（合同生效后）", fontsize=10.5, color=MUTE)
    for s_ in ax.spines.values(): s_.set_color("#2B3B58")
    ax.grid(axis="x", color="#22314C", lw=0.8, zorder=1)
    for mx, lb, c in [(2.0, "期一验收", EMER), (3.5, "期二验收", CYAN), (4.9, "终验", GOLD)]:
        ax.axvline(mx, color=c, lw=1.8, ls="--", zorder=4)
        ax.text(mx, len(tasks) - 0.25, lb, fontsize=9.2, color=c,
                ha="center", fontweight="bold")
    ax.set_title("交付计划：4–5 个月 · 三期并行推进", fontsize=14.5,
                 color=TXT, fontweight="bold", pad=22)
    fig.savefig(f"{OUT}/fig_gantt.png", facecolor=BG, dpi=170)
    plt.close(fig); print("  ✓ fig_gantt.png")


# ══════════════ 9. 复刻路径 ══════════════
def fig_replica():
    fig, ax = newfig(11.6, 7.0)
    title(ax, "复刻路径：TryQuant 能力还原与取舍",
          "绿色＝完整还原　　金色＝还原并升级　　灰色＝不纳入本次范围", ts=21, ss=14)
    rows = [
        ("对话式交互 + 语音输入", "完整还原", EMER),
        ("信号流聚合（KOL / 新闻）", "还原并升级为四源引擎", GOLD),
        ("Ask AI 情报解读", "还原并升级为可回测因子", GOLD),
        ("Discover 行情发现页", "完整还原", EMER),
        ("多资产覆盖与搜索", "完整还原（双地区）", EMER),
        ("组合与持仓视图", "还原（只读，不含下单）", EMER),
        ("鲸鱼追踪 / 聪明钱", "还原（境外版）", EMER),
        ("Q-Perps 永续合约 · 40x 杠杆", "不纳入本次范围", "#5B6880"),
        ("一键下单 / 交易执行", "不纳入本次范围", "#5B6880"),
    ]
    for i, (nm, act, c) in enumerate(rows):
        yy = 80 - i * 8.4
        card(ax, 6, yy - 3.1, 52, 6.6, PANEL, "#2C3D5C", r=0.9, lw=1.3)
        txt(ax, 9.0, yy + 0.2, nm, 14.5, TXT, ha="left")
        card(ax, 60, yy - 3.1, 34, 6.6, PANEL, c, r=0.9, lw=2.0)
        txt(ax, 77, yy + 0.2, act, 13.5, c, "bold")
    save(fig, "fig_replica.png")


if __name__ == "__main__":
    print("生成配图…")
    fig_gap(); fig_arch(); fig_loop()
    fig_sentiment(); fig_dual(); fig_price(); fig_gantt(); fig_replica()
    print("完成 →", OUT)
