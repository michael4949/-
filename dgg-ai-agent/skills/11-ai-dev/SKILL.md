---
name: AI软件开发
id: ai-dev
kind: 产品
credits: 100
version: 1.2.1
suite: 薯片AI智能体 2026.09
updated: 2026-09-21
triggers: [软件开发, 一句需求, 生成应用, 报修单, 派单, 审批流, 巡检整改, 表单, 页面清单, 数据字典, 接口清单, 权限矩阵, 用例, 发布, 追加需求, 迭代交付]
inputs: [data]
data_files: 12
datasets: 3
actions: 21
llm_calls: 0
offline: true
deterministic: true
delivers: [screen, wechat]
report_pages: 0
universal: dus-1
---

# AI软件开发 · 一句需求 规格 生成 试用 用例 发布 追加

一句需求变成能扫码试用的小应用：需求句先过两级词典（对象 / 角色 / 动作 / 渠道 / 字段 / 时限）解析，落到 30 个对象与 3 个流程模板之一，得到应用规格（字段 · 状态机 · 角色 · 页面 · 主数据关联）；规格再推出页面模型、数据字典、接口清单与权限矩阵；试用屏在内存运行时上真实提交与流转（沙箱时钟 09:00 起，每个动作 +15 分），用例按 12 类枚举后逐条真实执行；发布前五项检查全过才冒烟、上线并给扫码入口；追加需求只解析为六种变更（节点 / 字段 / 看板维度 / 规则 / 校验 / 角色），逐项套用生成 V1.x.0 新版本，旧用例回归、存量记录新字段置空；交付清单与【应用交付】微信报告收口。AI 主线是 **需求解析 → 应用规格 → 生成页面 / 数据字典 / 接口 / 权限 → 试用（沙箱运行时）→ 用例真实执行 → 发布检查与发布 → 追加需求解析为六种变更并生成新版本 → 交付清单与微信报告**。纯规则、确定性（无 Date.now / Math.random）、无 LLM、断网可用；所有客户动作返回新副本并写日志，原样本与 AI ERP / AI流程提效 / AI人力官 样本不动，主数据只解析不复制，全部状态可 JSON 序列化。

## 引擎 `core/build.js`

浏览器下挂在 `DGG.coreM11`，Node 下 `require('./core/build.js')`；导出 100 项（11 个常量 + 89 个函数）。

| 分组 | 函数 | 作用 |
|---|---|---|
| 常量 | `VERSION / MODULE_NAME / CREDITS / TODAY / CLOCK0 / STEP_MIN / IDS / QR_BASE / CHANNELS / SLOT_ORDER / RULES` | 1.2.0 · AI软件开发 · 100 积分 · 今日 2026-09-17 · 时钟起点 540 分（09:00）· 每动作 15 分 · 编号 APP-001 / XQ-001 / GG-001 / JF-001 · 扫码入口域名 · 渠道 微信扫码 H5 / PC 后台 · 槽位顺序 submitter → handler → handler2 → lead · 生成依据五条 G-01..G-05 |
| 工具 | `fmtMin / fmtDur / fmtN / t / isoToMin / dateOfMin / addDays / bump` | 相对分钟 ↔「MM-DD HH:mm」与时长文案、千分位、`{占位}` 模板填充、ISO 时间转相对今日分钟、版本号按 major / minor / patch 递增 |
| 解析 | `normalize / tokenize` | 全角转半角、去空白、转小写；按标点与连接词（然后 / 之后 / 接着 / 并且 / 同时 / 以及，即 lexicon.connectors 的 6 个词，长词优先）切子句，子句内正向长词优先匹配词典表面词，得到 object / role / action / channel / field / stat / time / delta 八类词；「数量 + 单位」单独出 qty；否定词（不要 / 去掉 / 不需要 …）给同子句后 6 字内的字段词与动作词标 neg |
| 解析 | `similar / nearest / lcs` | 字符二连 Dice 相似度；对候选句（含 aliases）取相似度高者；动作序列与模板签名的公共子序列长度 |
| 解析 | `parse(text, lib, arche)` | 句中无对象词时回落：与本业态 4 条预置句比相似度，≥ 0.18 取相近句否则取第 0 句，mode 标 fallback 并给 preset 下标；对象打分 = 命中 × 3 + 业态优先（本业态 2 / 通用 1）+ 同子句字段词数，并列取先出现；模板由对象决定（对象声明 altFlows 且动作序列 LCS ≥ 2 才改选，当前对象库未用）；派单模式取对象 mode，句中出现分配动作且非 dual 则为 assign；派单句里的评价 / 驳回动作词打开 rated / rejected，secondLevel / tail 来自对象；职务 = roles.defaults[业态][模板] ← 对象 roles 覆盖 ← 句中角色词，角色词按同子句相邻动作绑槽位（分配之后 → handler2、动作之前 → 模板 actionSlots、查看之前 → lead），未绑定的按槽位顺序补空位，每个角色带 E-编号（emp / emp2）或 external 主数据；渠道固定 h5 + pc 并记录命中词；可选字段命中即加入，被否定的基础字段移除（自动带入的 member 除外）；同子句「数量 + 时限词 / 提醒」得 sla 小时；返回 evidence、hits（去重命中词数）、unknown（无命中子句数） |
| 解析 | `objOf / tplOf / objectsFor / presetsOf / followUpsOf / presetFor` | 库访问：对象、模板、业态可用对象（common + 本业态）、预置句、追加句、对象对应的预置句 |
| 解析 | `refTable / refIds / refLabels / refKnown` | 主数据只读解析：按 integrations.json 从兄弟模块样本（erp / proc / hr）取行并按 id 去重，给 id / label、行数、同步时间、直连条件；refKnown 判值是否在表内（来源为空时放行） |
| 规格 | `plan(parsed, lib, ctx)` | 生成规格：字段 = 对象基础字段 − 否定 + 可选命中 + assign 模式补处理人 + rated 的满意度评分 / 评语 + rejected 的驳回原因；节点 = 模板节点按 secondLevel / tail / tail2 / rated / rejected / recheckFail 开关过滤（巡检的合格节点只在对象有 initialRule 时出现），标签按模式与对象覆盖；迁移 = 模板迁移经模式覆盖、对象动作名、对象 sla（接单 / 分配 / 整改）或句中时限（初始节点出发）；角色 = 解析角色按职务合并 + 应用管理员；页面 = 模板 6 页 + 模式附加页 / 二级审批页 / 评价页，每页算 roleKeys；主数据关联 = ref / member 字段 → 来源表行数与 direct / import（按 ctx.systems）；规则 R1.. = 初始节点时效、二级审批文案、到期未归还、字段阈值自动转异常、对象 ruleText；编号 APP-001 / XQ-001 / GG-001 v0.1 / V1.0.0，表名 = 对象 key + _order（派单）/ _request（审批）/ _record（巡检），通知渠道 微信服务通知 |
| 规格 | `patch(spec, op, lib)` | 规格改写入口：addField / grantPermission / addState / addStat / addRule / addValidation / addRole 七种 op，已存在的不改；改动后 specVer +0.1 并带 `_changed / _note`；addState 会把主终态改为非终态并接上新迁移、附带字段与页面 |
| 规格 | `confirmSpec / summarize / diffSpec` | status → confirmed；页 / 字段 / 角色 / 节点 / 迁移 / 接口 / 用例计数；两版规格的增删差异（字段、节点、迁移、页面、接口路径、用例数、规则、统计维度） |
| 规格 | `formFields / stageFields / initialState / mainTerminal / stateLabel / roleOfSlot / roleTitle / resolveRequire` | 规格读取：表单字段（无 at 且非自动带入）、阶段字段、初始节点、主终态（returned › lent › approved › done › closed）、节点标签、槽位对应角色与职务、`@阶段` 展开为该阶段必填字段 |
| 产物 | `derivePermissions / can` | 权限矩阵：角色 × 页面 → 六种操作（查看 / 新建 / 编辑 / 流转 / 导出 / 配置），由页面种类 × 槽位默认权限加 permOverrides 得到；数据范围按槽位（本人 / 本人待办 + 已接 / 全部） |
| 产物 | `pages` | 页面模型：序号、种类名、手机 / PC、可见角色、可查看者、字段（表单页取表单字段、评价页取评价阶段字段、详情页取全部）、动作按钮（该页角色可发起的迁移）、组件序列取 components.pageKinds |
| 产物 | `schema` | 数据字典：id（示例 前缀-2609-001）+ 业务字段（snake_case，按字段类型映射列类型，ref / member 记来源）+ 系统列 status / assignee / version / created_at / updated_at；索引 uk_id、idx_status_created 与每个 ref 字段一条 |
| 产物 | `apis` | 接口清单 API-01..：新建 / 列表 / 详情，每个动作一个 POST `/:id/actions/<actionEn>`（body = 该阶段必填字段 + expected_version），有看板页给 `/stats`，每个统计维度给 `/stats/by_<维度>`，有评价页给 `/:id/rating`，有主数据关联给状态变更回调，有提醒规则给超时提醒；角色由权限矩阵反推 |
| 产物 | `checklist` | 发布前五项：用例全部通过、必填字段都有控件、每个非管理员角色至少一个可查看页、通知渠道已配置、主数据关联都有行 |
| 运行时 | `newRuntime(spec, seedRows)` | 内存运行时：预埋行副本、流水号计数、沙箱时钟 540 分、日志 |
| 运行时 | `actorOf / exampleOf / exampleValues` | 槽位 → 操作者（E-编号或职务，external 角色取客户 K-编号，alt 取第二人）；字段示例值（`@槽位` / `@主数据` 在运行时解析，examples 按下标轮换） |
| 运行时 | `validateValues` | 字段校验：必填、长度、数字范围、选项、照片张数上限（默认 3）、手机号、日期格式与先后（after）、主数据存在性；错误码 E_REQUIRED / E_LEN / E_RANGE / E_ENUM / E_PHOTO / E_PHONE / E_FORMAT / E_DATE / E_REF |
| 运行时 | `submit / transition / advance / query` | 提交：校验表单字段，流水号 前缀-年月-三位序号（如 BX-2609-007），initialRule 字段大于阈值进初始节点否则合格，自动带入字段写操作者；流转：按 from + actionEn 找候选，依次判乐观锁（E_VERSION 报出已处理人与动作）、状态（E_STATE）、二级审批阈值路由、角色（E_ROLE）、本人范围（E_SCOPE）、阶段字段校验，再写 assignee / version / history，回到初始节点时清空 assignee；每步时钟 +15 分；advance 推进小时数；query 按页面种类过滤（我的 → 本人提交，待办 → 可流转且未分配或本人已接，其余全部） |
| 运行时 | `stats` | 看板统计：各节点计数、按处理人（数量 / 完成 / 接单到终态平均分钟）、平均接单分钟、超时（初始节点停留超 sla；领用类到期字段早于时钟为超期）、提醒规则命中、今日新增 / 完成、待办 / 处理中 / 完成、追加维度分组（数量 / 平均时长 / 满意度） |
| 运行时 | `scriptSteps / runScriptStep` | 试用三步走单脚本：模板 script（按模式）→ 提交 / 流转步骤，操作者按槽位，值 = 字段示例 ⊕ 预置句 script（提交）/ assignValues（分配）/ completeValues（完成），没打开的可选步骤跳过；执行时同一步多个动作依次流转 |
| 运行时 | `reach / pathTo` | BFS 找初始节点到目标节点的迁移路径；按路径提交并流转到目标（initialRule / secondLevel 字段按需取值），用例前置与样本生成共用 |
| 用例 | `tests(spec, lib)` | 按固定顺序枚举 12 类用例 TC-01..：必填（≤ 6）、边界（超长 / 低于下限 / 高于上限 / 选项外 / 照片超张数 / 日期早于，≤ 4）、流程迁移（每条可达迁移 + 二级审批条件路由）、越权（≤ 6）、非法迁移（1）、重复接单乐观锁（1）、主数据校验（1）、超时标记（1）、权限开放（每条 permOverride）、看板统计（每条 stat）、提醒规则（每条 3 用例：未满不提醒 / 超过标记并提醒 / 提醒对象在角色表）、追加校验 |
| 用例 | `runTests(spec, seedRows, lib)` | 每条用例在预埋行副本上真实执行，给 expect / actual / pass；汇总 total / passed / failed、按类计数、通过率、越权拦截数、警告 W-01（照片字段未限制大小） |
| 追加 | `parseDelta(spec, text, lib)` | 追加句解析为六种变更：评价动作 → 新增节点已评价 + 满意度评分 / 评语 + 评价页；驳回 → 已驳回节点（仅派单模板）+ 驳回原因；复检 + 新增节点词 → 已复检 + 复检意见；统计词 / 统计动作 → 看板维度（角色词 → 按处理人，字段词 → statBy 映射，指标 数量 / 平均处理时长 / 满意度）；提醒 + 数量 → 超时提醒规则（时限词映射节点，角色取提醒之后的角色词或主管）；必选 / 下限 / 上限词 → 校验；剩余字段词 → 新增字段（对象可选字段或字段库）；新增角色词 + 未知职务 → 新增角色；已在规格里的标 exists，全是 exists 则 noop；无命中时回落本业态 3 条追加句里相近的一条（≥ 0.18）并 mode 标 fallback |
| 追加 | `previewDelta / applyOps / deltaText` | 在副本上套用 ops 并 diff：新增节点 / 字段 / 页 / 接口 / 用例 / 规则 / 统计数；变更文案 |
| 发布交付 | `pipeline / qrText / suggestion` | 五段流水（构建 / 测试环境 / 冒烟 / 正式环境 / 已上线）按 env 标 done / on / todo；扫码入口 `https://platform.dgg.cn?app=APP-001&v=V1.0.0`（可用 lib.qrBase 换域名）；权限建议：处理人看不到看板时建议开放查看 |
| 发布交付 | `deliverables / report / kpi` | 交付清单 7 项（需求说明 XQ-001、页面清单 GG-001 v0.x、数据字典、接口文档、测试报告 CS-00n、发布记录 FB-00n、权限矩阵）+ 有变更时的变更清单 BG-00n；微信报告【应用交付】七段（需求 / 应用 / 测试 / 发布 / 变更 / 主数据 / 收件），收件 = 主管职务 · 应用管理员，编号 JF-001；KPI 汇总（生成前只给预览计数） |
| 发布交付 | `ensure / seedRows / run` | 样本补默认 state；取对象预埋行；一次算全：未生成时给 4 条预置句的页 / 字段 / 用例数预览与主数据来源信息，生成后给 spec / perms / pages / schema / apis / tests / testResult / stats / checklist / script / recommended（对象可选字段前 4）/ suggestion / releases / pipeline / diff / changes / followUps 预览 / deliverables / report / kpi / log |
| 客户动作 | `setText / pickPreset` | 写需求句 / 选预置句下标 |
| 客户动作 | `generate` | 解析 + 规格确认 + 运行时预埋 + 用例第 1 轮（CS-001）+ FB-001 发布到测试环境（09:00），env = staging |
| 客户动作 | `addField / grantPermission` | 追加推荐字段（对象可选字段或字段库 key）/ 开放页面权限，都走 patch，specVer +0.1，日志写同步更新的产物 |
| 客户动作 | `submitRow / doTransition / nextScript` | 按槽位手工提交 / 流转（可带 expectedVersion 与第二人）/ 脚本下一步（走完报 E_DONE）；结果写 lastResult |
| 客户动作 | `runAllTests` | 再跑一轮用例，CS-00n 递增 |
| 客户动作 | `publish` | 五项检查不全过 → E_CHECK；同版本已在正式环境 → E_DONE；冒烟有失败 → E_SMOKE 留在测试环境；否则 env = live，FB-00n 记正式环境与冒烟结果 |
| 客户动作 | `applyDelta` | 追加句 → 变更 BG-00n：逐项 patch 并记录涉及页面 / 新增接口 / 新增用例数，版本 minor +1（V1.1.0），给旧用例回归与新用例结果，存量记录新字段置空并算终态可补填数，env 回到测试环境并记 FB-00n；未识别 → E_PARSE，已包含 → E_DONE |
| 客户动作 | `sendReport` | 标记已发送，日志写收件人 |
| 对话 | `screens()` | 本 skill 的六屏登记 `[{key,label}]`：connect / build / try / test / ship / iterate |
| 对话 | `brief(step, data, lib, result?)` | 进这一屏的开场发现，一句话，从 `run()` 的结果里取数；已生成后遇未知屏返回 null |
| 对话 | `suggest(step, data, lib, result?)` | 这一屏的快捷问句 3–4 条，条条都能被 `ask` 答上 |
| 对话 | `ask(question, step, data, lib, result?)` | 问答，返回 `{text, blocks?, act?, ref?}`；答不上返回 null，不编数 |
| 对话 | `ingest(doc, step, data, lib, result?)` | 文档摄入，入参是 `_shared/docparse.js` 的输出；写回业务数据时返回 `{…, data: 新副本}` |

## 数据表

- **lexicon.json** 两级词典：109 个词 / 544 个表面词，按类型 object 30 · role 22 · action 17 · channel 2 · field 23 · stat 3 · time 6 · delta 6；另有连接词 6（然后 / 之后 / 接着 / 并且 / 同时 / 以及）、否定词 12（不要 / 去掉 / 不需要 / 取消 / 无需 / 删掉 / 不用 / 免填 / 不再需要 / 不再要 / 去除 / 不带）、数量单位 11（个工作日 / 工作日 / 小时 / 分钟 / 天 / 次 / 人 / 张 / 元 / 箱 / 件）。role 的 canon 可按业态分（如 role.lead → 生产主管 / 仓配主管 / 作业主管）；object 键对应 objects.json 的 key，action 键对应模板 actionEn，field 键对应对象字段。
- **objects.json** 30 个对象（通用 9 · 制造 8 · 贸易仓配 6 · 服务 7），由 `scripts/objects.js` 的 DSL 生成：通用 报修单 / 报销单 / 请假单 / 用车申请 / 培训报名 / 会议室预约 / 投诉工单 / 固定资产领用 / 访客登记单；制造 设备点检单 / 整改单 / 模具领用单 / 来料异常单 / 耗材申领单 / 安全隐患上报 / 加班申请 / 供应商准入；贸易仓配 退换货工单 / 样品申请 / 门店陈列检查 / 价格申请 / 促销物料申领单 / 到货预约单；服务 新客户资料 / 票据交接单 / 咨询工单 / 续费提醒 / 工商变更申请 / 客户回访登记 / 资料补交单。每个对象给 key / name / verb / short / prefix / flow / mode / fields / optional / roles / sla / secondLevel / tail / initialRule / stateLabels / actionLabels / ruleText；字段 12 种类型（text / textarea / select / number / money / date / datetime / photo / phone / rating / ref / member），带 required / len / min / max / options / ref / at / auto / after / due / example(s)，`@` 开头的示例在运行时按槽位或主数据解析。
- **flows.json** 3 个流程模板：`approve` 提交-审批（待审批 → 待二级审批? → 已通过 / 已驳回 → 已领用? → 已归还?，8 条迁移，驳回后可重新提交）、`dispatch` 派单-处理（待接单 → 已接单 → 处理中 → 已完成 → 已评价?，另有已驳回?，5 条迁移，三种模式 处理人自领 / 组长指派 / 双处理人）、`inspect` 巡检-异常-整改（合格 / 有异常 → 整改中 → 待复检 → 已关闭，4 条迁移，复检不合格可退回整改）。每个模板给 signature、states（optional 开关）、transitions（by / require / sla / scope / sets / when）、actionSlots、6 页页面与三步 script；slotLabels / modeSlotLabels 给槽位标签。
- **roles.json** 三业态 × 三模板 × 四槽位的默认职务；应用管理员；emps 按职务给两个 E-编号（第二个用于重复接单用例）；external 门店 / 客户 → 客户主数据；六种操作；页面种类 × 槽位的默认权限；数据范围。
- **components.json** 8 种页面种类 → 手机 / PC 组件序列；12 种字段类型的控件名与校验时机；列类型映射；6 个系统列；固定文案（发布说明、通知渠道 微信服务通知、环境名、五段流水、五项检查、字段来源、报告七段模板）。
- **presets.json** 三业态各 4 条预置需求句（key / text / expect / aliases 5 条 / script / assignValues / completeValues）共 12 条，各 3 条追加句（text / expectOps / expect）共 9 条，3 条无关句作回落回归。
- **tests.json** 12 类用例的命名模板、预期文案与上限；14 个错误码文案；边界描述 6 条；警告 W-01。
- **deltas.json** 六种变更类型；节点模板 3 个（rated / rejected / rechecked）；字段库 11 个；统计维度映射 7 个；指标 3 个；提醒规则模板；校验三式（必填 / 下限 / 上限）；时限词 → 节点映射 6 个。
- **integrations.json** 主数据来源 9 项（machines / lines / groups→lines / orders / materials / products / services→products / customers / employees），各给来源模块（erp / proc / hr）、路径、id、label 模板、单位、直连条件、同步时间与业态覆盖；archeMap 把本模块业态映射到来源样本键。

## 样本契约

- `data/samples/{mfg,trade,prof}.json` 对应 archetype = make / flow / service（制造 / 贸易仓配 / 服务，flow 的中文名统一叫「贸易仓配」，样本文件名沿用 trade.json），由 `scripts/gen-samples.js` 生成：`archetype`、`company`（取自 AI ERP 同业态样本）、`today` 2026-09-17、`clockMin` 540、`systems`（企业现有系统列表，三套样本里默认为空数组，所以只跑本 skill 数据包时主数据关联一律是 import；调用方可在数据副本上写入 systems（`ensure` 只在缺省时补空数组，不覆盖），命中该来源的直连条件时才变 direct：machines mes / erp，lines erp / mes，orders erp，materials erp，products erp / shop，customers erp / crm，employees hr / oa）、`seed.byObject`（对象 key → 预埋行）、`expect`（4 个预置对象应得的 object / flow / mode / pages / fields / roles / states / apis / testsMin / rows）、`state`（空，`ensure` 补默认）。
- 预埋行由内核运行时真实走出：预置句对象 8 条、其他对象 4 条，每个对象一条超时行（创建于 09:00 之前 sla + 40 分）；制造 17 对象 84 行、贸易仓配 15 对象 76 行、服务 16 对象 80 行。行结构：`id`（前缀-2609-序号）、`status`、`values`、`createdBy { slot, title, id }`、`assignee`、`version`、`createdAt / updatedAt`（相对今日 00:00 的分钟，负数为前几日）、`history[{ seq, actionEn, action, by, role, atMin, from, to }]`。
- `state` 由内核维护：text / presetIndex / parsed / spec / prevSpec / rt / releases / log / testRuns / changes / script / env / sent / lastResult / delta，全部可 JSON 序列化，两次 `run` 同序同果。

## 边界

- 追加需求只认六种变更类型（新增节点 / 字段 / 看板维度 / 规则 / 校验 / 角色）；追加句无命中时回落本业态相近的追加句并在 mode 里明示 fallback；需求句无对象词时回落相近的预置句并明示，无关句（如「今天天气不错」）落到第 0 句。
- 一句需求对应一个对象、一张表、一条流程；对象只在 30 个对象库内，模板只有三种；渠道固定 微信扫码 H5 · PC 后台，句中渠道词只作证据。
- 产物是页面模型、数据字典、接口清单、权限矩阵、用例、发布记录与扫码入口文本，不产出代码包、小程序码、部署脚本。
- 用例在运行时上真实执行，结果不预存；发布前五项检查与冒烟由同一套用例决定。
- 离线无 LLM；内核确定性；主数据只读解析；不改原样本与兄弟模块样本。
- 对话只答 `run()` 结果里算得出的数，答不上返回 null；文档摄入只认 `_shared/docparse.js` 的六类输出，写回一律返回新副本，原数据不动。

## 命名规则

- 员工只出现 E-编号（如 E-122），联系人与角色只出职务，客户以「K-编号 · 名称」出现（如 K-102 · 连锁便利店总部）。
- 费用与工时类字段名带「（预计）」，一律标预计。
- 记录编号 前缀-年月-三位序号（如 BX-2609-007）；应用 APP-001、需求 XQ-001、规格 GG-001 v0.x、版本 V1.x.0、测试 CS-00n、发布 FB-00n、变更 BG-00n、报告 JF-001、接口 API-01、用例 TC-01、规则 R1、统计 ST1、警告 W-01。
- 时钟：今日 2026-09-17，沙箱 09:00 起，每个动作 +15 分，文案里只出「MM-DD HH:mm」。
- 禁词表见 `_shared/lint-words.json`，所有静态文案与内核生成文案经 `require('../../_shared/lint.js')(lib.lintWords).hard(text)` 为空；review 项里的词也一并回避。

## 目录

```
core/build.js               内核（UMD），浏览器为 DGG.coreM11
data/lexicon.json           两级词典（109 词 / 544 表面词、连接词、否定词、数量单位）
data/objects.json           30 个对象（scripts/objects.js 生成）    data/flows.json     3 个流程模板
data/roles.json             默认职务 / E-编号 / 权限默认 / 数据范围    data/components.json 页面组件 / 控件 / 列类型 / 文案
data/presets.json           12 条预置句 + 9 条追加句 + 3 条无关句     data/tests.json      12 类用例文案与错误码
data/deltas.json            六种变更的模板与字段库                    data/integrations.json 主数据来源映射
data/samples/{mfg,trade,prof}.json   三套样本（archetype = make / flow / service · 制造 / 贸易仓配 / 服务）   schema/data.json   数据包契约
scripts/load-data.js · objects.js · gen-samples.js · run-examples.js · validate.js
examples/*.output.json      三套样本的交付摘要
```

## 脚本

```
node scripts/gen-samples.js     # objects.js DSL → data/objects.json；三套样本的预埋行由内核真实走出并按固定偏移改写时间
node scripts/run-examples.js    # 三套样本 × 预置句：生成 → 走单 → 用例 → 发布 → 追加，写 examples/*.output.json 并打印摘要
node scripts/validate.js        # 断言：确定性、不改样本、预置句与 aliases 解析、规格计数与 expect 一致、用例全过、发布、六种变更、禁词、examples 一致、对话五件（六屏开场非空、快捷问句条条能答、同一问两次同果、文档摄入返回新副本）
```

改对象库或内核后按 gen-samples → run-examples → validate 的顺序跑；`load-data.js` 返回 lib = { lexicon, objects, flows, roles, components, presets, tests, deltas, integrations, samples, erpSamples, procSamples, hrSamples, industries, credits, lintWords }。

## 对话与文档摄入

`brief / suggest / ask / ingest` 与六屏一一对应，回答里的数字全部从 `run()` 的结果里取，答不上返回 null，不编数。四个都是纯函数：不碰页面、宿主全局、时钟与随机数，`result` 传了就用、没传自己算一次，同一组入参永远得到同一份输出。选中态不在契约里：记录取超时那条、追加需求取改动大的那条、手机页取表单页，平台自己的选中态靠 `act` 回写。

| 屏 | 认得的问法 | 回答里给的数 |
|---|---|---|
| 接入 | 命中、哪些词、识别、未识别、解析；主数据、数据源、来源、哪来、同步、台账、名册；几页、多少页、能生成、多大（未生成时）；生成应用、开始生成、直接生成（未生成时） | 命中词数与未识别子句数、前四条「识别词 → 映射」与前六条的类型；三张主数据表的条数、来源模块、直连或导入、同步时刻；预览的页 / 字段 / 角色 / 节点 / 接口 / 用例数；生成一次扣的积分数 |
| 生成应用 | 哪几页、几页、页面、手机上、PC 上；必填、字段、表单填什么；加一个某字段、补某字段；流程、节点、几步、状态；怎么生成、凭什么、依据、怎么判断 | 页数按手机 / PC 拆并逐页给端与可见角色；必填字段数与字段名、非必填数；推荐字段加进表单 / 数据字典 / 用例后规格升一版、存量这一格置空；节点链、流转条数与每条的职务、动作、约定小时数；生成依据的前三条 G-01..G-03 |
| 试用 | 超时、等了、最久、拖了；几单、多少单、看板、统计、分布、今日；平均、多久、时效；下一步、走一步、跑一单、演一遍 | 超时单数、排在前面那条的编号、已等时长、超时文案与约定时限；今日单数、记录数、各节点单数、平均接单分钟；按处理人的单数与完成数；走单脚本下一步的职务、E-编号、动作与时钟步长 |
| 测试与产物 | 用例、测试、通过、失败、跑一遍；角色、谁能、谁看、权限、矩阵、看不到；越权、拦截；采纳、开放、建议；数据字典、几列、表结构、索引；接口、API | 用例总数 / 通过 / 失败 / 通过率 / 越权拦截次数、失败条目与警告、按分组的条数；每个角色的数据范围与可进页数；越权用例的名称与实际结果；权限建议的角色、页面、操作与理由；表名、列数、索引数；接口数按读写拆、前六个的编号与方法 |
| 发布 | 二维码、扫码、扫出来、链接；发布、上线、检查、正式环境、冒烟；发到、发正式、上线吧 | 扫码入口文本、渠道与当前环境；五项检查逐项的通过与明细；未过时列出未过项，全过时给构建 → 测试环境 → 冒烟 → 正式环境 → 已上线的走法；已在正式环境时给冒烟结果 |
| 迭代交付 | 存量、旧数据、老数据、历史数据；交付、清单、产物、报告、发微信、收件；追加、迭代、新版本、变更、V1.x.0、会多什么；生成 V1.x.0、就按某一条 | 存量条数、新字段置空与可补填条数、旧用例回归；产物项数、每项的名称 / 编号 / 数量与收件职务；追加需求条数与每条的 +页 / +字段 / +用例；已生成版本时给变更清单逐项与新用例通过数 |

六屏都认的跨屏问法：**点名一条记录**（编号如 BX-2609-004，末三位也认）给它的摘要、节点、处理人、提交时刻、已等时长与前五条流转；**TC-编号** 给那条用例的分组、名称、预期、实际与结果；**API-编号** 给方法、路径与需要角色；**为什么** 有超时单时说那一单为什么停着，没有时说这张应用按哪个模板落的；**怎么办 / 接下来 / 先做什么** 按权限建议 → 发正式环境 → 追加需求 → 发交付报告的次序给下一件事。

**act 在本模块的落法**（平台只实现子集也能跑，不认识的 type 静默忽略）

| act | 本模块 |
|---|---|
| `{type:'goto', step}` | 切到那一屏（六屏之外的 key 不处理，交平台兜底；问流程节点只换屏不高亮） |
| `{type:'focus', ref}` | 按 `data-ref` 高亮：记录编号高亮试用屏看板表与手机列表里那一行（不在试用屏就先切过去），`TC-编号` 高亮测试屏用例表那一行；找不到就退回按文本找行 |
| `{type:'open', panel, ref}` | `parse` / `source` / `preview` 进接入屏高亮命中词条、主数据来源行、预览结果；`pages` 进生成应用屏高亮页面清单、`page`（ref 用页面 key）切手机预览到那一页、`judge` 开「怎么生成的」抽屉；`board` / `perf` 进试用屏高亮状态分布与 PC 指标；`matrix` / `sugg` / `tests` 进测试屏高亮权限矩阵、权限建议、用例表，`dict` / `api` 开数据字典与接口清单抽屉；`entry` / `checks` 进发布屏高亮扫码入口与发布前检查；`stock` / `follow` / `change` 进迭代屏高亮存量说明、追加需求清单、变更清单，`report` 开交付报告抽屉；`doc` 开文档草案抽屉（内容在 act 的 `blocks` 里） |
| `{type:'apply', action, input}` | `generate{}` 按当前需求句生成、`add-field{key}` 加一个推荐字段、`grant-permission{role,page,op}` 采纳权限建议、`next-script{}` 走单脚本下一步、`publish{}` 发到正式环境、`apply-delta{text}` 按这一条追加需求生成新版本。**动作名一律用通用包 `manifest.actions` 里的动作名**（不是内核导出名 `addField / grantPermission / nextScript / applyDelta`），SPEC §12 的三道校验按清单名比 |
| `{type:'set', path, value}` | `state.text` 改需求句后重解析、`state.delta` 把一句话填进追加需求框、`state.presetIndex` 换一条预置句 |

**ingest 认的文档与写回**（入参一律是 `../_shared/docparse.js` 的输出）

| 文档 | 判定 | 结果 |
|---|---|---|
| Word / PDF / 文本 | 段落逐条送解析：已生成按六种变更认，未生成按需求句认 | 段数、表数、字数；读到的金额 / 日期 / 时限 / 违约 / 时效 / 比例逐项列出，附表给前三列三行；认到的那一段给它落成的变更或「对象 · 模板」，`data` 里写进 `state.delta`（已生成）或 `state.text`（未生成）；一条都没认到就把条款多的那一段放进去并说明规格不动数 |
| Excel | 表头与对象库可选字段对得上 | 表数、行列数、表头、按列名出的字段草案（列名 → 控件 → 取值）；对得上就把那个字段加进表单 / 数据字典 / 用例，`data` 是加过字段的新规格副本；对不上只给草案，规格不动数，草案随 `act` 的 `blocks` 走抽屉 |
| PPT | 标题与每页文字当段落 | 页数、行数与首页标题，其余与 Word 同一套 |
| 邮件 | 主题加正文当段落 | 发件、主题、日期、正文行数与附件数，其余与 Word 同一套 |
| 读不出来（`ok:false`） | — | 如实说原因，六屏不动数 |

写数据的那一类返回 `{text, blocks, data, act}`：`data` 是新副本（入参不动，照 `ensure` 先出副本再改），`act` 是与之等价的声明式动作（`set` 或 `apply`）——只实现 act 的平台重放这一次写回，两条路等价，取其一即可。

## 原型流程

需求（选预置句或输入一句，看命中词、未识别子句与页 / 字段 / 用例数预览）→ 应用规格（字段 · 状态机 · 角色 · 页面 · 主数据关联 · 规则，`generate` 即确认 XQ-001 / GG-001 v0.1 并把 V1.0.0 发到测试环境 FB-001）→ 生成产物（页面清单、数据字典、接口清单、权限矩阵；推荐字段 `addField`、权限建议 `grantPermission`，每次 specVer +0.1）→ 试用（`nextScript` 三步走单或手工提交 / 流转，待办 / 我的 / 看板统计与超时标记）→ 用例（`runAllTests` 出 CS-00n，12 类逐条真实执行，警告 W-01）→ 发布（五项检查 → 冒烟 → 正式环境 FB-00n → 已上线，扫码入口）→ 追加需求（`previewDelta` 看六种变更与新增页 / 接口 / 用例数，`applyDelta` 生成 V1.1.0 与 BG-001，回到测试环境再发布）→ 交付（清单七到八项、【应用交付】JF-001 发微信给主管与应用管理员）。每次生成按 `_shared/credits.json` 扣 100 积分，一次。
