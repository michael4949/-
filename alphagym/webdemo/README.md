# Demo

自包含单文件 HTML（约 2.9 MB），双击即开，无需服务器、无需联网。

```bash
python3 tools/gen_demo_data.py   # 生成 A 股 / 国内期货 / 财报的演示数据
node webdemo/build.js            # 生成 dist/alphagym-demo.html 与 dist/alphagym-artifact.html
node webdemo/smoke.js            # 用 Chromium 真的点一遍并截图
```

## 结构

```
ui/styles.css     设计令牌与全部样式（浅色/深色双主题）
ui/markup.html    页面骨架
ui/core.js        工具 · 主题 · 路由 · 图表封装 · 数据目录
ui/site.js        营销站
ui/accounts.js    多模拟账户 · 导入导出
ui/trade.js       行情回放 · 模拟交易 · 双盲测试 · 交易分析
ui/drills.js      专项训练（对应归因四个维度）
ui/screener.js    条件筛选
ui/formula.js     自定义指标公式
ui/fundamental.js 财务选股 · 财报时光机
ui/battle.js      K 线对战
ui/classroom.js   交易课堂
ui/coach.js       回放页内的 AI 教练栏
ui/ai.js          能力评估 · 相似行情
ui/chat.js        智能助手（问数 / 文件 / 语音）
ui/boot.js        事件绑定 · 文件上传 · 语音输入 · 启动
build.js          内联引擎 + 数据 + KLineCharts + UI → 单文件
smoke.js          浏览器端冒烟测试
```

## 页面

**营销站**：首页 / 选拔赛 / 版本与价格 / 常见问题。

**应用**：行情回放 · 专项训练 · K 线对战 · 交易课堂 · 双盲测试 ·
交易分析 · 能力评估 · 相似行情 · 条件筛选 · 自定义指标公式 · 财务选股 · 财报时光机。

## 每一项能力的计算内核

| 页面 | 内核 | 说明 |
|---|---|---|
| 行情回放 | `src/replay.js` + `src/matching.js` | 真撮合：限价/停损/止损止盈、手续费滑点、合约乘数、保证金强平 |
| 专项训练 | `src/replay.js` + `src/engine.js` | 四个维度各练一项，其余三个维度由系统固定 |
| K 线对战 | `src/contest.js` | 陪练逐根做决策，与你共用同一份 K 线与成本模型 |
| 双盲测试 | `src/replay.js` | 结果由真实后续行情算出；价格保形变换 + 时间轴平移 |
| 交易分析 | `src/trades.js` + `src/behavior.js` | 权益曲线、多空/时段/持仓时长归因、R 分布、MAE/MFE、账户评级 |
| 能力评估 | `src/engine.js` | 5 个条件随机化零模型 × 2000 次蒙特卡洛 + Holm 校正 |
| 相似行情 | `src/similar.js` | 形态向量检索，输出条件分布而非方向结论 |
| 条件筛选 | `src/query.js` | 表单与自然语言编译成同一份查询 AST，同一个执行器 |
| 指标公式 | `src/formula.js` | 手写词法 + Pratt 解析 + 求值，**不使用 `eval`**；窗口不足返回 NaN 而非 0 |
| 财务选股 | `src/fundamentals.js` | 所有取数走 `visibleAt(code, asOfTs)`，只返回披露日早于时点的报表 |
| 智能助手 | `src/query.js` | 自然语言 → 查询 AST → 真实数据上确定性执行 |

页面里跑的引擎与 Node 端跑单元测试、跑统计校准的是**同一份源码**。
`build.js` 只去掉 `import`/`export` 把模块拼进同一作用域，没有为演示改过一行逻辑。

## 智能助手

固定在右下角，任何页面都能用 Ctrl+K 呼出。

- **智能问数**：把中文查询翻译成查询结构并展示出来，在真实数据上执行。
  解析不出来就明确说解析不出来，并给出可用写法——**绝不回退到一个「差不多」的预设答案**。
- **文件上传**：交易记录 CSV / Excel 直接进评估引擎（表头中英文都认，日期自动对齐到 K 线）；
  PDF 与文本类文件本地提取正文；图片会说明当前 demo 的处理边界。
- **语音输入**：Web Speech API（Chrome / Edge），中文识别，实时回填输入框；
  云端识别不可用时降级为录音 + 手动输入，麦克风电平表照常工作。

## 数据

当前打包的 A 股、国内期货行情与全部财务报表都是 `tools/gen_demo_data.py`
合成的**演示数据**，公司名称与财务数字均为虚构，页面上有常驻横幅说明这一点。
合成时保留了真实市场的统计特征（波动率聚集、厚尾、板块共振、涨跌停约束、
披露滞后），因此各项功能的表现形态与真实数据一致。
接真实数据源时按同一 schema 替换 JSON 即可，业务代码一行不用改。

## 唯一的妥协

静态单文件意味着行情数据必须随文件下发，打开控制台能翻到后续 K 线。
`GuardedBarSource` 已把越界读取做成抛异常，但纯前端环境里这道闸只能挡住代码，挡不住人。
生产环境中它必须部署在服务端，客户端只拿已揭晓的分片，撮合也在服务端权威判定。
