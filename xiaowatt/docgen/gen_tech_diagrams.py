# -*- coding: utf-8 -*-
"""技术文档配图四张"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib import font_manager

f_reg = font_manager.FontProperties(fname='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
f_bold = font_manager.FontProperties(fname='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')
NAVY='#00367A'; BLUE='#1E63B8'; SKY='#EAF1F9'; SKY2='#DCE9F7'; LINE='#9FB8D8'
TXT='#12263F'; GREY='#5A6B7E'; GOLD='#B7791F'; GOLDBG='#FDF3E0'; RED='#B0483F'; REDBG='#FBEDEA'; GREEN='#2E7D5B'; GREENBG='#E8F5EE'

def box(ax,x,y,w,h,fc,ec,r=0.10,lw=1.3):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle=f'round,pad=0,rounding_size={r}',fc=fc,ec=ec,lw=lw))
def txt(ax,x,y,s,size=11,color=TXT,bold=False,ha='center',va='center'):
    ax.text(x,y,s,fontsize=size,color=color,ha=ha,va=va,fontproperties=f_bold if bold else f_reg,linespacing=1.45)
def arrow(ax,x1,y1,x2,y2,color=BLUE,lw=1.6,style='-|>'):
    ax.add_patch(FancyArrowPatch((x1,y1),(x2,y2),arrowstyle=style,mutation_scale=13,color=color,lw=lw,shrinkA=2,shrinkB=2))

# ============ 图A1：陪练底座技术架构 ============
fig,ax=plt.subplots(figsize=(12.2,7.4),dpi=200)
ax.set_xlim(0,122); ax.set_ylim(0,74); ax.axis('off')

def layer(y,h,title,items,iw=None,fc='#FFFFFF',ec=NAVY,ifc=SKY2,tcol=NAVY,x0=4,w=114):
    box(ax,x0,y,w,h,fc,ec)
    txt(ax,x0+3,y+h-2.6,title,11,tcol,True,ha='left')
    n=len(items); gap=2.2
    iw=iw or (w-6-gap*(n-1))/n
    for i,it in enumerate(items):
        bx=x0+3+i*(iw+gap)
        box(ax,bx,y+1.6,iw,h-6.2,ifc,LINE)
        if isinstance(it,tuple):
            txt(ax,bx+iw/2,y+1.6+(h-6.2)*0.66,it[0],9.6,NAVY,True)
            txt(ax,bx+iw/2,y+1.6+(h-6.2)*0.3,it[1],7.6,GREY)
        else:
            txt(ax,bx+iw/2,y+1.6+(h-6.2)/2,it,9.4)

layer(63,10.5,'呈现层 · 网页单页应用（八个页面）',['入口选择','陪练舱','工作台','AI教练中心','评分复盘','成长档案','班组看板','教练编辑器'])
layer(50.5,10.5,'教学引导层',[('三种模式','教学/演练/考核'),('任务指令条','步骤推导与勾选'),('知识点卡','随操作项切换'),('三级提示','方向/要点/答案'),('知识问答','检索+依据标注'),('阶段预习','段前知识卡')])
layer(35.5,13,'引擎层',[('剧本引擎','五拍状态机\n判定点·红线埋点'),('角色引擎','三角色切换\n姿态与情绪'),('评分引擎','六维计分\n否决与加分'),('复盘引擎','事件序列\n生成复盘文字'),('作业面板','七类位置\n接线图实时变位')])
layer(20.5,13,'数据与知识层',[('剧本数据','29项·三段调度令\n判定点与红线'),('知识库','九主题·知识点卡\n依据条款原文'),('台词清单','117条·4232字\n三角色分配'),('评分记录','事件留痕\n本地错题存储'),('模拟数据','人员与成绩\n全部脱敏')])
# 数字人渲染层
box(ax,4,8,114,11.5,'#FFFFFF',GOLD)
txt(ax,7,17.4,'数字人渲染层（按环境自动降级）',11,GOLD,True,ha='left')
for i,(t,d) in enumerate([('预渲染视频','透明通道格式·离线播放\n现场演示首选'),('实时会话','联网环境·自由问答'),('内置渲染','矢量骨骼·拼音口型对齐\n任何环境保底')]):
    bx=7+i*37.5
    box(ax,bx,9.4,34,6.2,GOLDBG if i!=2 else SKY2,GOLD if i!=2 else LINE)
    txt(ax,bx+17,14.0,t,9.8,GOLD if i!=2 else NAVY,True)
    txt(ax,bx+17,11.0,d,7.8,GREY)
box(ax,4,1.2,114,4.6,SKY,LINE,r=0.06)
txt(ax,61,3.5,'运行环境：单文件网页应用 · 浏览器直接打开 · 内网可用 · 演示全程不依赖外部网络',9.6,NAVY,True)
for x in [61]:
    arrow(ax,x,63,x,61.2); arrow(ax,x,50.5,x,48.7); arrow(ax,x,35.5,x,33.7); arrow(ax,x,20.5,x,18.7)
plt.tight_layout(pad=0.4); plt.savefig('/home/claude/build/tech_peilian.png',bbox_inches='tight',facecolor='white'); plt.close()

# ============ 图A2：五拍状态机 ============
fig,ax=plt.subplots(figsize=(12.2,4.9),dpi=200)
ax.set_xlim(0,122); ax.set_ylim(0,49); ax.axis('off')
txt(ax,4,46.4,'■',10,NAVY,ha='left'); txt(ax,7.4,46.3,'监护人（数字人）',9.2,NAVY,True,ha='left')
txt(ax,28,46.4,'■',10,'#DCE9F7',ha='left'); txt(ax,31.4,46.3,'操作人（学员）',9.2,GREY,True,ha='left')
beats=[('唱票','监护人按票面\n完整唱票'),('手指口述','手指对象\n复诵票面'),('对，执行','监护人核对\n发出执行令'),('执行','在作业面板\n完成操作'),('检查回报','核对状态\n回报结果'),('标注对勾','监护人在票面\n标注"√"')]
for i,(t,d) in enumerate(beats):
    x=4+i*19.6
    box(ax,x,30,17,12,NAVY if i in (0,2,5) else SKY2, NAVY if i in (0,2,5) else LINE)
    txt(ax,x+8.5,38.5,t,10.5,'#FFFFFF' if i in (0,2,5) else NAVY,True)
    txt(ax,x+8.5,33.6,d,7.8,'#CFE0F5' if i in (0,2,5) else GREY)
    if i<5: arrow(ax,x+17,36,x+19.6,36)
box(ax,97,22,21,6.4,GREENBG,GREEN); txt(ax,107.5,25.2,'进入下一操作项',9.4,GREEN,True)
arrow(ax,110.5,30,110.5,28.6,color=GREEN)
# 判定分支
box(ax,4,4,54,15.5,REDBG,RED)
txt(ax,7,16.6,'判定分支（任一拍触发）',10,RED,True,ha='left')
txt(ax,7,9.6,'缺拍 · 未发令操作 · 手指与票面不符 · 复诵不一致\n跳项 · 走错间隔 · 只看单一位置指示\n红线（未验电合接地刀闸等）→ 一票否决 + 后果推演',8.4,TXT,ha='left')
box(ax,64,4,54,15.5,GOLDBG,GOLD)
txt(ax,67,16.6,'异常处置支线（凡变化必上报）',10,GOLD,True,ha='left')
txt(ax,67,9.6,'发现指示不一致 → 立即中止 → 汇报值班负责人\n→ 逐级上报 → 研判处置 → 具备恢复条件\n→ 返回被中止项重新核对',8.4,TXT,ha='left')
arrow(ax,32,30,32,19.9,color=RED)
arrow(ax,91,30,91,19.9,color=GOLD)
plt.tight_layout(pad=0.4); plt.savefig('/home/claude/build/tech_wupai.png',bbox_inches='tight',facecolor='white'); plt.close()

# ============ 图B1：班组助手技术架构 ============
fig,ax=plt.subplots(figsize=(12.2,6.6),dpi=200)
ax.set_xlim(0,122); ax.set_ylim(0,66); ax.axis('off')
layer(55,10.5,'呈现层 · 网页单页应用',[('班组总览一屏','多类型图表·全部可下钻'),('成员画像卡','个人明细'),('助手对话区','问答与初稿'),('所级管理视图','多班组总览')])
layer(41,12.5,'应用逻辑层',[('问答引擎','意图识别→结构化查询\n回答附数据来源'),('文稿生成','班前会/月度总结\n模板+数据槽位'),('提醒引擎','临期规则扫描\n待办排序'),('确认机制','全部输出标注\n由班组长确认后使用')])
layer(26.5,13,'画像计算层',[('指标口径','资质有效性·学时完成率\n活动频次·任务量'),('临期规则','复审期限≤90天\n学时进度滞后'),('聚合下钻','班组→成员\n两级数据联动'),('所级聚合','多班组指标汇总')])
layer(12,13,'数据层（脱敏模拟数据装载）',[('人员','基本信息'),('证书','取得/复审期限'),('学时','要求/完成'),('出勤','值班安排'),('任务','工作记录'),('活动荣誉','开展记录')])
box(ax,4,1.2,114,4.6,SKY,LINE,r=0.06)
txt(ax,61,3.5,'运行环境：单文件网页应用 · 内网可用 · 演示形态内置生成规则，部署形态预留大瓦特模型底座生成服务接口',9.4,NAVY,True)
arrow(ax,61,55,61,53.2); arrow(ax,61,41,61,39.2); arrow(ax,61,26.5,61,24.7)
plt.tight_layout(pad=0.4); plt.savefig('/home/claude/build/tech_banzu.png',bbox_inches='tight',facecolor='white'); plt.close()

# ============ 图B2：问答与文稿生成处理流程 ============
fig,ax=plt.subplots(figsize=(12.2,4.6),dpi=200)
ax.set_xlim(0,122); ax.set_ylim(0,46); ax.axis('off')
flow=[('班组长提问','"三个月内证书\n到期的有谁"'),('意图识别','名单类/统计类\n临期类/文稿类'),('结构化查询','按口径计算\n筛选数据'),('回答组装','结论+名单/数字\n+数据来源'),('班组长确认','修改后使用')]
for i,(t,d) in enumerate(flow):
    x=4+i*23.8
    box(ax,x,26,21,13,SKY2 if i not in (0,4) else '#FFFFFF',LINE if i not in (0,4) else NAVY)
    txt(ax,x+10.5,35.2,t,10.2,NAVY,True)
    txt(ax,x+10.5,30,d,8,GREY)
    if i<4: arrow(ax,x+21,32.5,x+23.8,32.5)
box(ax,18,6,86,12,GOLDBG,GOLD)
txt(ax,61,14.6,'文稿类走模板生成：模板段落 + 数据槽位（当月画像指标自动填充）',9.6,GOLD,True)
txt(ax,61,9.6,'班前会材料＝工作安排+风险提示+学习内容　·　月度总结＝六段结构逐段填充　·　每处数字可回溯到画像数据',8.4,TXT)
arrow(ax,42,26,42,18.2,color=GOLD)
arrow(ax,80,18.2,98,26,color=GOLD)
plt.tight_layout(pad=0.4); plt.savefig('/home/claude/build/tech_qa.png',bbox_inches='tight',facecolor='white'); plt.close()
print('4 diagrams ok')
