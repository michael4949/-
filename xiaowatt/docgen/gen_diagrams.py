# -*- coding: utf-8 -*-
"""需求文档配图：两张总体框架图"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib import font_manager

f_reg = font_manager.FontProperties(fname='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
f_bold = font_manager.FontProperties(fname='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')

NAVY = '#00367A'; BLUE = '#1E63B8'; SKY = '#EAF1F9'; SKY2 = '#DCE9F7'
LINE = '#9FB8D8'; TXT = '#12263F'; GREY = '#5A6B7E'; GOLD = '#B7791F'; GOLDBG = '#FDF3E0'

def box(ax, x, y, w, h, fc, ec, r=0.10):
    b = FancyBboxPatch((x, y), w, h, boxstyle=f'round,pad=0,rounding_size={r}',
                       fc=fc, ec=ec, lw=1.3)
    ax.add_patch(b)

def txt(ax, x, y, s, size=11, color=TXT, bold=False, ha='center', va='center'):
    ax.text(x, y, s, fontsize=size, color=color, ha=ha, va=va,
            fontproperties=f_bold if bold else f_reg, linespacing=1.5)

def arrow(ax, x1, y1, x2, y2, color=BLUE, lw=1.6, style='-|>'):
    a = FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style, mutation_scale=14,
                        color=color, lw=lw, shrinkA=2, shrinkB=2)
    ax.add_patch(a)

# ================= 图一：陪练底座总体框架 =================
fig, ax = plt.subplots(figsize=(12.2, 7.0), dpi=200)
ax.set_xlim(0, 122); ax.set_ylim(0, 70); ax.axis('off')

# 用户层
box(ax, 4, 59, 114, 8.5, SKY, LINE)
txt(ax, 10.5, 63.2, '使用人员', 11.5, NAVY, True)
for i, t in enumerate(['学员\n（操作人）', '班组长', '培训管理员']):
    box(ax, 22 + i * 32, 60.4, 26, 5.8, '#FFFFFF', LINE)
    txt(ax, 35 + i * 32, 63.3, t.replace('\n', ' '), 10.5)

# 应用层
box(ax, 4, 41.5, 76, 14.5, '#FFFFFF', NAVY)
txt(ax, 10, 53.2, '学员端', 11.5, NAVY, True)
for i, t in enumerate(['工作台', 'AI教练中心', '陪练舱\n（核心）', '评分复盘', '成长档案']):
    box(ax, 7 + i * 14.6, 43.2, 13, 7.6, SKY if i != 2 else NAVY, LINE if i != 2 else NAVY)
    txt(ax, 13.5 + i * 14.6, 47, t, 10, '#FFFFFF' if i == 2 else TXT, i == 2)
box(ax, 84, 41.5, 34, 14.5, '#FFFFFF', NAVY)
txt(ax, 91, 53.2, '管理端', 11.5, NAVY, True)
for i, t in enumerate(['班组看板', '任务下发']):
    box(ax, 87 + i * 14.6, 43.2, 13, 7.6, SKY, LINE)
    txt(ax, 93.5 + i * 14.6, 47, t, 10)

# 底座四引擎
box(ax, 4, 22.5, 114, 15.5, '#FFFFFF', NAVY)
txt(ax, 13.5, 35.4, '陪练底座', 12, NAVY, True)
for i, (t, d) in enumerate([('角色引擎', '数字人教练人设\n语音·动作·情绪'), ('剧本引擎', '作业流程组织为\n逐项对练与判定点'),
                            ('评分引擎', '六维计分·红线否决\n加分项'), ('复盘引擎', '逐项回放·错误归因\n依据条款·改进建议')]):
    box(ax, 7 + i * 21.5, 24.3, 19.5, 9.4, SKY2, LINE)
    txt(ax, 16.75 + i * 21.5, 31.2, t, 10.5, NAVY, True)
    txt(ax, 16.75 + i * 21.5, 27.2, d, 8.2, GREY)
box(ax, 94, 24.3, 21, 9.4, GOLDBG, GOLD)
txt(ax, 104.5, 31.2, '教练编辑器', 10.5, GOLD, True)
txt(ax, 104.5, 27.2, '由一张现场电气操作票\n生成剧本初稿·人工校核', 8.2, GREY)

# 支撑层
box(ax, 4, 4, 76, 13, '#FFFFFF', LINE)
txt(ax, 12.5, 14.5, '技术支撑', 11, NAVY, True)
for i, t in enumerate(['大瓦特\n模型底座', '安规与细则\n知识库', '语音合成\n语音输入', '数字人呈现\n预渲染/实时/内置']):
    box(ax, 7 + i * 18.4, 5.6, 16.6, 7.2, SKY, LINE)
    txt(ax, 15.3 + i * 18.4, 9.2, t, 8.8)

# 知识课堂供给层
box(ax, 84, 4, 34, 13, GOLDBG, GOLD)
txt(ax, 101, 14.5, '人工智能知识课堂（供给层）', 10, GOLD, True)
for i, t in enumerate(['课程', '题库', '学时', '学员画像']):
    box(ax, 86.5 + i * 7.6, 5.8, 6.8, 5.6, '#FFFFFF', GOLD)
    txt(ax, 89.9 + i * 7.6, 8.6, t, 8.6)

arrow(ax, 61, 59, 61, 56.2)
arrow(ax, 42, 41.5, 42, 38.2)
arrow(ax, 101, 41.5, 101, 38.2)
arrow(ax, 42, 22.5, 42, 17.2)
arrow(ax, 101, 17, 101, 22.3, color=GOLD)
txt(ax, 106.5, 19.6, '底座调用 · 学时回写', 8.2, GOLD)

plt.tight_layout(pad=0.4)
plt.savefig('/home/claude/build/arch_peilian.png', bbox_inches='tight', facecolor='white')
plt.close()

# ================= 图二：班组画像与班组长助手 =================
fig, ax = plt.subplots(figsize=(12.2, 6.6), dpi=200)
ax.set_xlim(0, 122); ax.set_ylim(0, 66); ax.axis('off')

# 应用层
box(ax, 4, 46, 82, 16, '#FFFFFF', NAVY)
txt(ax, 15, 59.3, '班组长AI助手', 12, NAVY, True)
for i, (t, d) in enumerate([('即问即答', '自然语言查询\n班组数据'), ('班前会材料\n初稿', '安排·风险\n学习内容'),
                            ('月度总结\n初稿', '按当月画像\n数据生成'), ('任务安排\n参考', '按资质与工作量\n给出人选参考')]):
    box(ax, 7 + i * 19.6, 47.6, 17.8, 9.2, NAVY if i == 0 else SKY2, NAVY if i == 0 else LINE)
    txt(ax, 15.9 + i * 19.6, 54.2, t, 9.6, '#FFFFFF' if i == 0 else NAVY, True)
    txt(ax, 15.9 + i * 19.6, 50.1, d, 7.8, '#CFE0F5' if i == 0 else GREY)
box(ax, 90, 46, 28, 16, GOLDBG, GOLD)
txt(ax, 104, 59.3, '所级管理视图', 11, GOLD, True)
box(ax, 92.5, 47.6, 23, 9.2, '#FFFFFF', GOLD)
txt(ax, 104, 52.2, '多班组画像总览', 9.6)
box(ax, 40, 40.2, 42, 4.2, '#FFF8EC', GOLD, r=0.06)
txt(ax, 61, 42.3, '全部输出为初稿与参考 · 由班组长确认后使用', 9.2, GOLD, True)

# 画像层
box(ax, 4, 21, 114, 16.5, '#FFFFFF', NAVY)
txt(ax, 15.5, 34.8, '班组数字画像', 12, NAVY, True)
for i, (t, d) in enumerate([('班组总览一屏', '人员结构·资质·学时\n安全活动·任务·荣誉'), ('成员画像卡', '个人信息·持证与有效期\n学时进度·近期工作'),
                            ('临期与待办提示', '证书复审临期\n学时未达标·待办活动'), ('图表下钻', '总览图表可逐级\n下钻至成员明细')]):
    box(ax, 7 + i * 28.4, 22.8, 26, 9.4, SKY2, LINE)
    txt(ax, 20 + i * 28.4, 29.6, t, 10.2, NAVY, True)
    txt(ax, 20 + i * 28.4, 25.6, d, 8.2, GREY)

# 数据层
box(ax, 4, 3, 114, 13, '#FFFFFF', LINE)
txt(ax, 21, 13.5, '数据层（演示阶段以脱敏模拟数据装载）', 10.5, NAVY, True)
for i, t in enumerate(['人员基本信息', '资质证书台账', '培训学时', '出勤与值班', '工作任务记录', '安全活动与荣誉']):
    box(ax, 6.5 + i * 18.8, 4.6, 17.2, 6.4, SKY, LINE)
    txt(ax, 15.1 + i * 18.8, 7.8, t, 8.8)

arrow(ax, 61, 16, 61, 20.7)
arrow(ax, 45, 37.5, 45, 45.7)
arrow(ax, 104, 37.5, 104, 45.7)

plt.tight_layout(pad=0.4)
plt.savefig('/home/claude/build/arch_banzu.png', bbox_inches='tight', facecolor='white')
plt.close()
print('diagrams ok')
