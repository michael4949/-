# 小瓦特 · 南网人资数智化创新产品评优 · 参赛项目工作区

本工作区承接两个全委托参赛项目的开发，此前已在对话式环境中完成大量工作，现迁入 Claude Code 继续。**动手前先读完本文件，再按 `docs/03_任务清单.md` 干活。**

- 项目一「小瓦特·练」AI 智能陪练底座——**9/13 按客户二次修改重构**：主线偏向人力资源（作业授权认证表 → 8 维能力 → 题库考试取证 → 组长培训计划 → 认证表草稿），新增陪练关卡引擎（教练在侧、学员先动：看 / 做 / 说 + 逐级提示 + 红线制止，docs/02 第 45 条）与两份关卡（1163、雨淋阀）、组长工作台；陪练舱 29 项完整票保留，**9/13 三次口径：数字人朗读语音恢复 + 全过程去点选（准备 / 遥控 / 核对 / GIS / 拟票 / 测验改为口述与按住操作，docs/02 第 46 条）**。口径见 docs/02 第 44–46 条，客户材料解读见 docs/05
- 项目二「小瓦特·班」供电所班组长 AI 助手——**高保真原型已搭起（9/3）**，规格与代码地图见 `banzu/README.md`

甲方＝深圳供电局有限公司人力资源部（南方电网直管全资子公司）。业务方：项目一＝福田供电局（联系人于然）；项目二＝光明供电局（联系人林洁怡）。叙事口径：**「大瓦特练机器，小瓦特练人」**。

## 时间倒排（当前 9/13）

| 节点 | 日期 | 状态 |
|---|---|---|
| 需求澄清 / 技术方案 / 初版演示 | 8/14 · 8/21 · 8/28 | 已过 |
| 中期评审 | 9/4 | 已过 |
| 作品预验收（线上） | 9/11 | 已过 |
| **成果交付与模拟答辩** | **9/23** | ← 下一个节点 |

一切取舍的唯一标准：**这两个 demo 能在评审现场 8 分钟内演完、演稳、打动评委。** 功能宁可少而硬，不可多而虚。

## 目录结构

```
xiaowatt/
├── CLAUDE.md               ← 本文件
├── docs/
│   ├── 01_项目背景.md       甲方、合同、评分维度、客户现有系统基线
│   ├── 02_已定决策.md       所有已拍板的产品与技术决策（不要推翻）
│   ├── 03_任务清单.md       ← 干活看这里，含每页验收标准
│   └── 正式交付物/          四份已交付的需求/技术文档 docx（权威规格，可读）
├── peilian/                项目一工作区（扁平结构，源码+生成器+测试同目录）
│   ├── build.py            构建：拼接源码 → dist/ 单文件 HTML
│   ├── data.js …           见下方「代码地图」
│   ├── dist/               构建产物（已含当前版本，双击可开）
│   └── shots/              测试截图输出目录
├── banzu/                  项目二工作区（扁平结构：data.js(班组·关键节点·九类核心技能·周报·试验班)/data2.js/data3.js(履职证据·岗评·技能·五类指标·确认记录)/data4.js(星级评价标准，由 xlsx 生成)/state.js(状态层)/scenes.js/xw.js/comp.js(派工四规则)/upload.js/charts.js/charts2.js/app.js(两角色)/p_*.js(p_super.js=管理者九页)/intent.js + build.py + smoke.cjs + gen_samples.py + samples/ + dist/）
├── assets/photos/          隐患现场真实照片插槽（p7/tree/lock/ins/trench/nest.jpg，到货即替换矢量插画）
├── assets/xiaowatt/        小瓦特形象（main.png 甲方 3D 全身像已到，透明底；talk/think/look/work/listen.png 到货即按状态换图；提示词 docs/小瓦特形象_生成提示词.md）
├── heygen/                 数字人批量渲染工具箱（用户自行在 HeyGen 侧执行）
├── assets/logo.png         客户 logo（透明底 820×290，构建时 base64 内联）
├── assets/coaches/         教练形象图（<id>.jpg 256px 18 位 + 三个陪练舱角色的 <id>_hd.jpg 512px，构建时自动内联）
└── docgen/                 四份正式文档的生成脚本（Node docx），改文档时用
```

## 环境与命令

```bash
# 构建项目一（纯 Python3 标准库，无依赖）
cd peilian && python3 build.py        # → dist/小瓦特练_倒闸操作陪练舱_高保真原型.html

# 回归测试（需要 playwright）
npm i playwright && npx playwright install chromium
cd peilian
# 首页为默认落点（hash 路由）；测试脚本经 F+'#arena' 直达陪练舱入口
# 三条主回归都以 S.filled=true 跳过拟票练习，直接从上岗前准备开始
node v2full.js     # 完整票全流程（关埋点；准备阶段走 prepAuto 口述路径，遥控 / 核对弹层走口述 + 按住），期望：ENDED / vio 0 / ERR none
node v2trap.js     # 完整票（开埋点），期望：停在第11项异常，vio 2，ERR none
node v2test.js     # 分段票（冷备用→检修）+ 问教练 + 报告，期望 end / vio 0 / ERR none
node v2fill.js     # 拟票练习：错票期望 75 分且票头/漏项/多项/顺序四类错误全中，满分路径全程口述（fillSay 票头一句话 + 8 项口语化说法）期望 100 分 0 错误、rows 1–8
node v2demo.js     # 现场动作示范：12 类动作逐项开一次示范并走完四步，期望 stage end / vio 0 / ERR none
node v2exam1163.js # 陪练关卡 · 1163：考核正确路径 score 10 hints 0 / 训练说错+被制止 kinds judge,order red false stopLine true / 考核红线 red true score 0 / 漏项 miss / 刷新后记录 4 / 组长 rows 8 / 任务下发 / 学员待练 / ERR none
node v2examrain.js # 陪练关卡 · 雨淋阀：训练正确路径 score 10 / 考核关键错误路径 crit 2 kinds crit!,crit!,miss / 按住盒盖 boxOpen true / 拖手柄 handle 100 / run3 score 10 / ERR none

# 重新生成数据（只有改剧本/知识库时才需要；gen_data.py 需 pip install pypinyin）
python3 gen_data.py && python3 gen_know.py && python3 gen_lines.py && python3 build.py
```

**改任何 JS/CSS 后必须 `python3 build.py` 重新构建**（dist 是拼接产物，不要直接改 dist）。**改交互逻辑后必须跑 v2full + v2trap 两条回归**，通过标准如上；动到拟票或示范再补跑 v2fill / v2demo；**动到能力模型、考试引擎、场景图、首页或组长工作台必须跑 v2exam1163 + v2examrain**。铁律 grep：`grep -c "演示" dist/*.html` 只允许讲师演示台相关命中。

## 铁律（甲方多次强调，违反即打回）

1. **原型里不许有任何"讲解员式"内容。** 界面上每个字都必须是客户员工日常真实使用的系统里会出现的字。禁止"演示环境""本模块展示了…""点击××可下钻"这类说给参观者听的话；禁止交付物口径、报价、"一期范围"类徽标。唯一例外是右下角「讲师演示台」（评审现场的控制入口，保留）。⚠️ 现存代码里有少量违规残留，清单在任务 P0-1，先清掉。
2. **人员评价类内容一律脱敏模拟数据**，涉及能力/资格结论的输出必须体现"由人确认"。演示人物全部虚拟（任玲玲、陈志远、林岚、周建国等）。
3. **不写空泛表述**：禁"提升效率、智能分析、建设平台"这类无法验收的话，一切表述落到可检查的动作与结果。
4. **用词禁区**：不用"手术/骨架/刀"（改用 调整/框架/重构）；不用"门禁"（改用 关口/准入/把关）；标题与命题用正向表述（如"经验可传承"，不说"带不走"）。
5. **单文件离线**：两个 demo 都必须是双击即开的单文件 HTML，比赛现场按内网假设，不得依赖外网资源。唯一例外：数字人"实时会话"模式的动态 import（失败必须优雅降级到内置渲染，已实现，勿破坏）。
6. **不推翻已定决策**（见 docs/02），不重构已通过回归的陪练舱交互；发现 bug 修 bug，跑回归。

## 设计体系

- **全站浅色底 + 金色描边 + 绿/橙分卡**（甲方 9/2 三次口径）：白底 #f5f6f1；**所有卡片一律金色描边**（`--goldln` #d4b862，内层小卡 `--goldsoft`），并有一条缓慢流转的金色光带（`::before` conic 渐变 + `@property --ga`）；**绿系与橙系是两套主色，一张卡片只用其一**——卡片挂 `.hg`（绿：AI/能力/过程类，如雷达、成长地图、AI 复盘、指令卡、对练）或 `.ho`（橙：人力资源/任务/人员类，如待练任务、学时、班组、晋升通道、里程碑、证书、错误卡、知识点卡、操作票），卡内强调色全部走 `--ac/--acd/--acl/--acbg/--acln` 五个令牌（图表 SVG 也用 `var(--ac)` 与 `color-mix`），因此**新增任何组件不要写死绿色/橙色，用 `var(--ac)` 系列**，并给卡片挂 hg/ho。语义色保留：带电红 #e23b2e / 停电绿 #23b26a / 接地黄 #e8b22a / 红线红 #d43a2f / 金色用于"待提升"与描边。
- **AI 与人力资源元素动效**：顶栏绿金流光线、标题渐变流光、卡片金色光带、AI 标记脉冲（`<em class="ai">`）、KPI 数字滚动（countUp）、班组伙伴头像波浪、背景上升人形（peopleSVG）、粒子网络、成长地图流向粒子。
- 左上角永远是客户双行 logo（`__LOGO__` 占位符，build.py 内联）。
- 正式文档（docx）配色：南网深蓝 `#00367A` 标题与表头，每页左上角客户 logo。
- 工作台 Dashboard 的硬性口径（甲方原话，逐条对照验收）：**图表类型不重复、每个图表支持下钻或跳转到具体数据点/源、页面背景有动效、图表可交互、配色含南方电网元素、含 AI 元素、左上角客户 logo、整体高端大气时尚、背景插入南方电网图片及科技风图片**。南网实景照片素材甲方尚未提供——先用程序化变电站剪影+粒子层占位，留好图片插槽。

## 项目一 · 代码地图（peilian/，按 build.py 拼接顺序）

| 文件 | 职责 |
|---|---|
| data.js | 生成物：29 项操作票 STEPS、12 风险 RISKS、五防 WUFANG、位置 LOC、设备 DEV（源头是 gen_data.py，改剧本改它） |
| know.js | 生成物：9 主题知识地图 KNOW、逐项知识点卡 STEPKP、阶段预习 PREVIEW（源头 gen_know.py） |
| avatar.js | 数字人引擎（形象版，9/2 甲方口径：骨骼数字人不可接受）：以教练形象图为本体（陈志远=daozha、林岚=term、周建国=angui，`_hd` 为 512px 版本），逐字视位时钟驱动呼吸/说话节奏/声波/光环，视线跟随鼠标，8 姿态映射为前倾/转头/点头/摇头；**朗读语音 `TTS`（9/13 恢复）**：无 HeyGen 片段时浏览器合成语音朗读，按角色性别选中文音色，口型跟随 `onboundary` 进度、`onend` 收尾、失败退回逐字时钟；`voiceToggle/voiceLabel` 讲师演示台开关（`xwt_voice`），`__DH_MUTE` / `__DH_SPEED<1` 时不出声；接口 speak/setPose/nod/shake/speaking 不变；构造函数可传形象对象（编辑器预览、剧本试演复用），destroy() 停循环并取消朗读 |
| player.js | 数字人播放层三档：clips（HeyGen 预渲染 WebM，主用）/ stream（实时）/ builtin；HEYGEN_MANIFEST 内联点在此 |
| guide.js | 教学引导层：三模式 MODES、当前指令 instrNow（准备/五防/执行三阶段逐项指引，含目标选择器 sel）、GPIC 动作示意图（SMIL 动画演示按住/点选/复诵等）、applyGuideTarget 目标金色脉冲、指令卡任务条（渲染签名守卫防闪烁；「我该做什么」+「前往」）、知识点卡、三级提示、知识地图抽屉、预习卡、七步导览、宽容判定 lenient() |
| layout.js | 页面骨架 LAYOUT 模板字符串 |
| app1.js | 全局状态 S、常量、工具函数 |
| sld.js | 一次接线图 SVG `sld(o)`（1M/2M 双母七间隔，随设备状态变色；`o.dev` 可传五防模拟态副本、`o.sim` 模拟样式、`o.scada` 光字牌与遥测、`o.chg` 变位闪动） |
| app2.js | 渲染层：speak/say/字幕、操作票、位置栏、renderPanel 调度、顶栏 KPI（含预估得分 estScore）、本项计时 stepRef、复诵实时评估 liveMeter/missingSegs、设备长按 bindDevHold、目标设备通用高亮 + AR 标注（SVG 目标经 svgOffset 定位、手指后出现手形标记、目标自动滚入视野） |
| fill.js | **填写操作票（拟票练习，9/9 甲方口径：第一步前先练拟票；9/13 改口述拟票）**：倒闸操作作业全过程条（接受任务→拟票→审核→签发→五防模拟→现场操作→汇报终结）、票头四要素口述或手填（`fillHeadVal` 归一到规范写法）、操作项目说一项写一项（`fillSay` → `fillMatch` 以说出的话被票面覆盖的比例为主匹配全票 29 项，设备编号必须对得上；段外项目写入后审核判「多项」）、上移下移移出、三级提示 `fillHint`（方向 → 设备 → 原文，考核模式无）、提交审核判分 100 分（票头 20 / 项目完整性 50 / 执行顺序 30）、错题详解按票头·漏项·多项·顺序分组逐条给「应为—为什么—依据」（依据取自该项 rule/why，不另编条款）、附正确票面，可改一遍再交或按正确票面签发进入准备阶段 |
| demo.js | **现场动作示范（9/9 甲方口径：不能只是点击，要看到人怎么做）**：作业人员 SVG（工装+安全帽，四姿态 站位/手指/执行/观察）、九类动作场景（把手 knob / 空开 mcb / 挂牌 tag / 地刀合闸 closeE / GIS 四项指示 gis / 后台遥控 remote / 核对 check / 调度电话 phone / 五防钥匙 key），每类四步分解（站位与核对 → 手指口述 → 执行动作 → 检查回报），设备图随步骤变位、要点气泡跟着指、监护人数字人逐步开口讲；底部操作条「看现场示范」进入，可逐步/重放/直接关掉自己做 |
| panels.js | **作业面板 v3（9/4 甲方口径：学员在设备图上动手，不点文字框）**：SVX 元件库（灯 / 把手 / 空开 / 按钮 / 挂牌钩与标志牌 / 机构指示窗 / 拐臂 / 转轴划线 / 屏面）；调度电话受令席（来电铃响 → 接听报名 → 调度报姓名下令 → 记录簿填发令单位与发令人 → 复诵 → 调度"复诵正确"记发令时间 → 票令核对卡（一致接令 / 不一致中止，票令陷阱在此判定）→ 汇报项拨号接通后汇报，调度操作指令记录簿逐条累积）；五防模拟在模拟接线图上按票序点设备（S.wfdev 模拟态、五防闭锁弹层 WF_LOCK 给出防误规则）；监控后台一次接线图点设备 → 遥控操作弹层（**9/13 口述版**：`rcSay` 口述操作性质，说错设备编号 / 性质判违规 → 自动预置返校 → `bindHold` 按住执行到进度走满 `rcExecNow`）→ 图上变位、光字牌与报文刷新，核对类项目弹出光字 / 遥测 / 设备详情，学员口述看到的内容按要素覆盖判定（`openInspect / insSay / INS_KW`，说反结论判违规）；间隔现场 / 8P 测控屏 / 20P 保护屏 / 就地控制柜为 SVG 设备图：三个间隔可走错、名称牌 / 标签 / 汇控柜模拟图 / 带电显示装置 / 机构箱指示窗 / 拐臂 / 转轴划线（gisInspect 只放大看一眼，四项是否核对到由回报内容判定，异常项给出中止上报）、1QK/ZK 把手会转、空开会掉、地刀合分按钮、挂牌钩挂上标志牌 |
| app3.js | 交互引擎：五拍闭环、判定与违规（每条违规带扣分维度、扣分值与依据原文）、设备编号读法判定（1163 读"一一六三"）、红线、异常支线、enterStep（接令项先响铃等接听）/tickStep、submitInput（带并发锁；接令项复诵后进入票令核对，汇报项须先拨通；GIS 项回报文本里说到汇控柜 / 机构箱 / 拐臂 / 转轴划线才算核对到，异常注入时回报"不一致、中止上报"走主动识别、回报"一致"判红线）、devClick 分流（五防 → wfDev、后台遥控 → openRemoteCtl、核对类 → openInspect、四项指示 → gisInspect 只看不勾）、doPhone（记录簿校验：发令单位含"中调"、发令人为来电人"李明"） |
| app4.js | 准备/五防/收尾、评分与报告（含 genReview 生成式复盘）、讲师演示台、boot（含卡住 24s 监护人主动提醒，__DH_SPEED<1 时停用）；**上岗前准备口述版（9/13）**：`prepSay` 三审 / 着装 / 精神状态按关键词记项（`PREP_KW`，说空话追问、说漏点名），`prepReadRisk` 监护人逐条宣读 12 条风险、操作人口头确认（"全部明白"不算），`prepDone` 自动进五防；`micStart` 统一语音输入（联网浏览器识别 / 离线逐字打入兜底文本）；`autoDialog` 走 `rcSay → rcExecNow / insSay`，`prepAuto` 口述路径跑完准备 |
| arena.js | 陪练舱 v2：道具层 Sheet、八种练习方式 PLANS、入口弹层 openEntry(pre 可预选练法)、问教练 askCoach+retrieve、底部操作条 |
| ability.js | **能力模型层（9/13）**：认证表 `CERT_UNITS`（8 技能单元 / 20 专业项目，★ 必备）、`ABILITY8` 八维（k/n/d/items 一对多）、`DIMS/DIMK`、`arenaTo8` 陪练舱六项计分折算、`CONFIRM_LOG` 专业规则确认记录（本机覆盖 `xwt_confirm`）、`versionStamp` 记录版本字段、`COACH_TYPES` 陪练类型地图 |
| charts.js | 手绘 SVG 图表库：雷达（opt.key 自定义下钻属性、opt.target 目标虚线多边形、任意维数）/双轴柱线/环形/面积/热力矩阵/仪表盘/场次成长曲线 chSessionCurve（得分·7日均线·用时·扣分·提示·及格线多序列可切）+ miniBars，交互经 data-* 委托 |
| homedata.js | 首页数据层（全部脱敏模拟）：HOME_USER、`RADAR_BASE` 8 维基线与 `abilityNow()`（基线与本机考试记录 6:4 合成；`RADAR_NOW/RADAR10_NOW` 为全局 getter，`DIMS6/DIMS10` 为 8 维别名）、SESSIONS 近30天场次、COACHES 18 教练（daozha 带 `exam:'e1163'`，fire 已开通带 `exam:'rain'`）、`recoList()` 按短板推荐考试、homeAgg 聚合 |
| home.js | 系统首页与教练中心：hash 路由（home/plaza/**exam**/arena/review/growth/classroom/team/editor）；**首页偏人力资源（9/13）**：作业授权认证进度（20 格，点看认证表草稿）、待考任务卡（组长下发）、8 维雷达、题库考试成绩卡、按短板推荐考试；教练中心顶部陪练类型地图、教练卡带类型标签与考试入口；底座页右下角讲师演示台 `demo2`（演示主线 / 触发红线 / 一键跑完 / 地刀三态 / 雨淋阀压力异常 / 功能实现状态清单 `IMPL_STATUS` / 边界表 / 清空本机记录）；原口径：hash 路由、导航按角色放行管理模块、**工作台＝驾驶舱布局**（我的任务/我的能力/我的复盘/班组对比/小瓦特建议 + 底部「我在练的教练」窄条与开通申请进度）、**教练中心＝独立目录页**（页头统计：教练总数/覆盖岗位族/已开通/未开通/自建，三级筛选与结果计数，新建教练入口，未开通教练可提交开通申请并在两页同步状态）；工作台中央为学员成长地图 chGrowthMap（流向边+流动粒子+阶段分区，节点经 nodeClick 下钻）、六图环绕、粒子+变电站剪影背景动效 |
| pagedata.js | 底座各页数据：ROLE 角色、TEAM 班组 12 人、REDLINES、MILESTONES、LADDER 晋升通道、CLASSROOM 接入指标、SAMPLE_TICKET 样例票、QUIZ 随堂测验 14 题（依据只引用既有条款）、COURSE_LIB 课程库 12 门、ARCH_IF 接口说明、BADGES 能力徽章 12 枚（条件函数）、localStorage 键与读写 |
| scenes.js | **考试大场景设备图（9/13，按 244 张实拍重绘、去标识、16:9）**：`SC` 工具（热区 `hs`、灯、表盘 `gauge`、把手、按钮、铭牌、完成勾）；1163：`svgHmi1163` 后台分图（1891 分图版式）、`svgMechBox` 机构箱、`svgCabFace` 就地控制柜（1891 就地控制柜母本）、`svgGroundPanel` 地刀操作面板（中性点端子箱门面母本）、`svgBayPanorama` 现场全景三检查点、`svgK2Hub` 验电与接地三处，各自 `zoom*` 放大图；雨淋阀：`svgValveGroup` 隔膜式阀组、`svgRainPanorama` 四套阀组、`svgBoxOpen` 阀盒与拖动手柄、`svgTransformerSpray` 主变喷淋动画（#1主变实拍 + 喷淋视频母本）、`svgCtrlRoom` |
| exam.js | **陪练关卡引擎 · 教练循环（9/13 二次口径：教练在侧、学员先动）**：`EX` 状态、`coachSay`（数字人 `EX.dh` 说 + 对话记录）、`examStart/examEnter/examNext/examFinish`；学员三种动作——`examLook(dev)` 走到设备前放大观察（`renderZoom` 带口述输入）、`exOp('dev:action')` 按住进度环执行（`exBindOps`，前置未满足：训练 / 演练制止，考核记红线 + `red.undo` 复位）、`exBindDrag` 拖手柄、`examSay(text, fromZoom)` 口述 / 汇报 / 提问（知识库 `retrieve`）/ 下结论（`needAll` 漏项判定）；`goalDone`（肯定语轮换 + 提示系数 `HINT_F`）、`exHint` 三级提示、`nextGoal`、`stationDone`（outro 后自动进下一情境）、卡住 26 秒教练主动开口；`examSugg` 建议；入口页 `examEntryHtml`、复盘页 `examReviewHtml`（含教练对话回放）；`examAuto(kind)/examRun(plan)` 自动驾驶（`ok / wrong / red`）；本机键 `xwt_exams` |
| exam_defs.js | 两份陪练关卡 `EXAM_1163`（7 情境，教练 陈志远）与 `EXAM_RAIN`（7 情境，教练 周建国）：情境只给 `brief`（按模式变化）+ `outro`，`goals` 为学员要自己做到的事（kind look / op / say / qa / drag；`val` 解析口述 → ok / bad / note；`hints` 三级；`after` 前置；`red` 红线；`praise / badSay / missSay` 教练台词，判定反馈照客户方案原文）；`locs` 地点切换；`spots` 设备热区（无关设备 `bad` 台词、`crit` 关键错误）；读数解析 `readOC / readVolt / readPress / readValve`；依据条款取自 STEPS/RISKS 既有 rule 原文；`EXAMS` |
| leader.js | **组长工作台（9/13，替代原班组看板）**：`teamExamRecs`（本机记录 + `TEAM_EXAM_MOCK`）、全组 8 维雷达格、短板热力、考试结果与建议（复核 `xwt_team_review`）、`ldSend` 制定培训计划（写 `xwt_tasks`，学员首页出待考任务）、`certSuggest/certDrill` 作业授权认证表草稿（确认写 `xwt_cert_confirm`）、专业规则确认记录（提交审定 / 登记结果）、`leaderClick` |
| pages.js | 评分复盘（题库考试记录区 + 场次筛选、对照切换 上一场/最佳场/均值、场次回放时间轴 rvPlay、逐句 LCS diff + 跟读实时吻合度、错误卡、行动清单本机勾选、复盘摘要生成、AI 复盘）/ 成长档案（十维能力全景 + 上月/前月/班组对照 + 目标多边形、三期对照与预测、目标填写、多序列成长曲线点击进复盘、能力徽章、学习地图、晋升通道、里程碑、打印导出）/ 知识课堂（接入关系图节点可下钻、立即同步、课程库搜索/标签/章节学习回写学时、随堂测验口答 `quizSay`（说字母 / 第几个 / 自己的话按相近度对到选项，选项只看不点）、本周学习计划生成与加入日程）/ 知识课堂顶部系统边界表 `BOUNDARY/boundaryHtml` / 教练编辑器（八维权重；角色设定含 18 形象 + 数字人预览试听 + 开场白生成；剧本步骤 上移下移/红线/删除/一致性检查 lintSteps/剧本试演；评分规则模板与示例试算；知识库检索测试与文本上传；已发布列表下架/载入）/ 角色切换 / pagesClick·pagesInput·pageAfter |

本机落盘：陪练舱 openReport 时 saveSession 写入 localStorage `xwt_sessions`（含 S.lines 逐句记录，dims 为 8 维折算，ver 版本字段），复盘页置顶显示并标「本机」；题库考试记录 `xwt_exams`；班组 / 培训任务 `xwt_tasks`（带 exam 的为题库考试任务，results 回写）；组长复核 `xwt_team_review`；认证表确认 `xwt_cert_confirm`；专业规则确认记录 `xwt_confirm`；自建教练 `xwt_custom_coaches`；成长目标 `xwt_goals`；课程进度 `xwt_course_prog`、学时回写 `xwt_hours`、测验记录 `xwt_quiz`、学习计划 `xwt_plan`、复盘行动清单 `xwt_actions`。

陪练舱本轮新增（9/2）：顶栏「预估得分」KPI（estScore 与评估报告同算法实时测算）、底部「本项用时 / 参考」计时（stepRef 按动作类型）、复诵输入框实时吻合度条 + 教学模式漏说要素芯片（missingSegs，演练模式只给数量，考核模式不显示）、目标设备 AR 标注（DOM 与 SVG 两种，含项号与动作）、每项完成后监护人一句点评 coachComment（考核模式不点评，只进聊天不发声以免影响回归时序）。

关键运行时钩子（测试与演示都靠它们）：`window.__DH_MUTE`（静音，也关朗读）、`window.__DH_SPEED`（语速倍率，测试用 0.06；弹层里的预置 / 执行 / 按住等待也按它缩放；<1 时不朗读）、`S.trap.armed / S.abn.armed`（第9项票令陷阱 / 第11项异常注入开关）、`autoStep()`（自动执行当前节拍：会接电话、拨号、点"票令一致"、把遥控 / 核对弹层按口述路径走完 autoDialog）、`prepSay(text) / prepAuto()`（准备阶段口述 / 自动跑完）、`rcSay(text) / rcExecNow()`（遥控口述 / 执行）、`insSay(text)`（核对口述）、`fillSay(text)`（口述拟票）、`quizSay(text)`（测验口答）、`TTS.on / voiceToggle()`（朗读开关）、`S.toured / S.previewed / S.filled`（跳过导览/预习/拟票练习）、`S.fillOn`（入口是否勾选拟票练习）、`openDemo()`（打开当前项的现场动作示范）、`S.ph`（电话状态：ring / conn / cmp / log）、`S.wfdev`（五防模拟态）。新增数字人台词已加入 gen_lines.py 并重生成 lines.json（169 条，9/9 增补接令改口径、汇报、拟票开场与现场示范讲解，已同步 heygen/lines.json，clips 需补渲染）。

一次接线图与间隔名按客户真实站名（9/13 客户允许）：鲘元Ⅰ线 1891 / 鲘元Ⅱ线 1892 / #1–#3 主变变高 1101–1103 / 分段 1012 / 111PT / 112PT / 备用间隔；培训三线 1163 沿用客户关卡方案命名（`sld.js`、`panels.js` 走错间隔铭牌、`app2.js` 提示语）。人物全部虚拟。

## 数字人（HeyGen）现状

- **浏览器朗读语音已恢复（9/13 用户口径，覆盖 9/1 去 TTS）**：无 HeyGen 片段时每句台词由浏览器合成语音朗读（`avatar.js` `TTS`，按角色性别选中文音色；Edge / 联网 Chrome 的自然音色效果最好），口型跟随朗读进度；讲师演示台两处都有「数字人朗读语音 开 / 关」，本机记忆。片段到货后片段优先、朗读退为兜底。

- 用户自行在 HeyGen 渲染中：三个角色形象（AI 生图，提示词已交付）+ 169 条台词（heygen/lines.json，9/9 补至 169 条，需补渲染）批量渲染为**透明通道 WebM**（heygen/heygen-kit.js，v3 优先自动回退 v2）。
- **clips 到货后的接入步骤**：① 把 `clips/` 目录放到 dist/ 同级；② 把 manifest.json 内容内联进 player.js 的 `HEYGEN_MANIFEST` 常量（build.py 里加一步自动内联更好）；③ `HEYGEN_CFG.mode` 默认值改 `'clips'`；④ 重新构建，file:// 双击验证视频可播、缺片段时降级 builtin 不报错。
- 台词文本是匹配键（Avatar.clipOf 按 text.trim() 精确匹配）——**改任何台词文案都会导致对应片段失配**，改前先查 lines.json，改后要重新渲染该条或接受降级。

## 项目二（banzu/）

高保真原型已搭起（9/3，甲方确认设计方案 v0.5 后开工；**9/12 按六份客户材料重构**：主线班组改为光明供电局配电自动化班，周报第 29 期驱动，关键节点表 19 项，派工四规则理由表，履职证据替代绩效等级，九类核心技能实操量回写，五类指标模型，菜单 9→6，新增管理者视角九页 `p_super.js`，星级对标数据 `data4.js` 由客户 xlsx 生成，见 docs/02 第 43 条），规格与页面清单在 `banzu/README.md`。**与项目一不同的设计口径（甲方 9/3 定）**：浅色底 + 靛蓝 AI 体系（不用金色描边、不用绿橙分卡），客户 logo 原样置于浅色底不反白；布局＝左栏分组导航 / 顶部命令栏 / 晨间横幅 / 三张决策卡 / 双卡区 / 右栏小瓦特常驻。核心一句话：**页面是舞台，班长点按钮，小瓦特当场看、想、写、办；结果是过程的尾声；鼠标为主、语音为辅；涉及人的结论一律"由班组长确认后使用"。** 甲方 9/4 强调：**流程不得预设**——所有页面只读状态层 `DB`（state.js），所有按钮只写 `DB`，派工 / 审票 / 开工 / 回传 / 完工 / 验收 / 添加任务 / 上传两票每一步都改变后面每一页的数字；新增页面或按钮一律走 `DB`，不得再直接读 JOBS / HOURS / TICKETS / DEFECTS 常量或在内存里改它们。甲方 9/9 追加：**班组画像要能回答"这个人几斤几两、这个班组缺什么"**——绩效 / 岗评 / 技能三类每条都要有考核内容与台账依据（`data3.js`；9/12 起绩效改为「履职证据」，只列证据不出等级），资质缺口与下次培训重点要算出来，年龄梯队要能提前预警；**界面上不许有点不动的按钮**（负向选择走通用 `no`）；画像上的指标要与台账中心同源可跳转核对。

9/12 追加：**两个角色**（班组长 / 管理者）共用一套 `DB`，管理者的每个动作（督办、提醒、调配、梯队建议）都落到班组长的通知或确认；**界面上不得出现人力资源部、发起方、演示口径等字样**，真实 / 模拟 / 预设 / 待对接的标记只在讲师演示台「功能实现状态清单」；周报第 29 期为局内文件，对外演示前确认可用范围。

```bash
cd banzu && python3 build.py && node smoke.cjs     # 期望 FAILS 0 ERR none；截图在 banzu/shots/
```

改任何 banzu 源码后必须重新 build 并跑 smoke。小瓦特形象图到货后放 `assets/xiaowatt/`，重新 build 即生效。

## 先后顺序

P0（9/4 前必须）：清违规文案 ☑ → 项目一工作台 Dashboard ☑ → 项目二高保真原型 ☑。P1：教练中心 ☑、评分复盘页 ☑。P2：成长档案 ☑、教练编辑器 ☑、班组看板 ☑、知识课堂接入 ☑。**9/13 客户二次修改（项目一）☑**：能力模型 / 题库考试 / 1163 与雨淋阀关卡 / 组长工作台 / 偏人力资源首页；**9/13 三次修改 ☑**：朗读语音恢复 + 全过程去点选（docs/02 第 46 条）；待办：专家审定评分表、外部重绘图到货替换、HeyGen clips、联网浏览器上试听语音识别与合成。逐项细目与验收标准见 `docs/03_任务清单.md`。
