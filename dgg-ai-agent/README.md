# 薯片AI智能体 · 能力内核（skill）+ 展台高保真原型

一个内核，两个壳：每个模块只写一次「输入 → 离线计算 → 一处 LLM → 结构化输出」，
skill 是这份定义加一个面向 AI OS 的清单，原型是这份定义加一层界面。

```
skills/
  _shared/                 企业画像字段表 + 生成的 JSON Schema · 14 大类 / 54 细分行业表 · 积分表 · 禁忌词表 · lint
  01-ai-maturity/          企业AI成熟度评估（SKILL.md · schema · data · core · prompts · examples · scripts）
prototype/
  src/                     外壳（tokens.css · shell.css · shell.js）+ 模块视图（module-01.js）+ 模板
  build.js                 全部内联 → dist/index.html（file:// 双击即开，零外部请求）
  test/screenshot.js       Chromium 走一遍流程：横屏 / 竖屏 / 打印，并把屏上数字与内核 golden 输出比对
  dist/index.html          交付物
```

## 常用命令

```bash
cd skills/01-ai-maturity
node scripts/run-examples.js      # 四套样例企业跑内核，写 examples/*.output.json
node scripts/lint.js              # 禁忌词扫描
node scripts/validate-schema.js   # 契约校验：样例过 schema · 画像 schema 与数据表一致 · 常量与内核一致 · 反例被拒
node scripts/gen-profile-schema.js  # 画像字段或行业表改动后重新生成 _shared/company-profile.schema.json
node scripts/gen-benchmark.js     # 重新生成参考带（业务侧抽样到位后改为直接替换 data/benchmark.json）

cd ../../prototype
node build.js                     # 构建 dist/index.html
NODE_PATH=$(npm root -g) node test/screenshot.js   # 需要 playwright + chromium：走完整流程、截图、比对内核、导出 PDF
NODE_PATH=$(npm root -g) node test/measure.js      # 打印模拟下量每页高度，找 A4 溢出
```

## 原型的 URL 参数

| 参数 | 作用 |
|---|---|
| `?station=1` | 左端竖屏一体机：直接落到体验版输入页，字号档放大 |
| `?station=2` | 中央大横屏：开机即待机页 |
| `?station=3`（默认） | 右侧横屏一体机：首页 11 宫格 |
| `&wx=<url>` | 「结果发送到微信」二维码内容（承接方式定下来后改默认值） |
| `&llm=<endpoint>&model=<id>` | 可选：LLM 薄代理，`POST {model, prompt} → {text}`；不填则全程模板 |

## 已完成模块

| # | 模块 | 内核 + 数据 | 原型 | SKILL.md 契约 | 状态 |
|---|---|---|---|---|---|
| 1 | 企业AI成熟度评估 | v2 | v3 | v2（已与内核、原型同步） | 屏幕与内核逐字一致；咨询报告风格 33 页 / 速览 5 页，A4 逐页无溢出；契约校验全部通过 |

### 模块 1 · v2 规模

- 企业画像 13 项（两级行业 14 大类 / 54 细分）
- 36 题 · 六维十八项 · 总分 108
- 报告 33 页（咨询报告信息图风格，参照铁达电子样例）：封面主视觉 / 导航 / 01 结论速览 ×2 / 02 企业画像 / 03 总体成熟度 ×3 / 04 六维详解 ×12 / 05 优势与短板 / 06 AI 优先方向 / 07 推荐场景 ×2 / 08 升级路线图 ×3 / 09 投入与回报 / 10 风险与合规 / 11 90 天清单 / 附录 A 评分明细 / 附录 B 信息来源与置信度 / 封底
- 版面语言：章节横幅 · 信息图面板（结论式标题 + 灰色副题 + 来源脚注）· 总体判断横幅 · 六问卡 · 方向卡 · 诊断发现（加粗引导句）· 结论框
- 报告色板：海军蓝 / 青 / 绿 / 橙 / 紫（与外壳的 DM 品牌蓝并存）；六维各一色，已过色觉校验
- 12 种图表：封面主视觉（数据驱动六边形）· 雷达 · 渐变条 + 说明 · 竖条 + 参考带区间 · 等级刻度 · 堆叠条 · 同行分布曲线 · 环图 · 进度环 · 十八项排序 · 12 月路线图 · 价值难度矩阵
- 内容库：60 条结构化行动（负责人 / 三步 / 交付物 / 周期 / 投入档 / 验收指标）· 54 段子维度诊断 · 70 个场景 · 16 条风险规则 · 270 格参考带
- 契约 v2：`schema/input.json`（profile 13 项 + answers 36 × 0–3）· `schema/output.json`（success / failure 两种形态，definitions 内含全部子结构）· `_shared/company-profile.schema.json` 由字段表与行业表生成 · `SKILL.md` 写明追问顺序、计算规则表、对话回复格式、`render` 表与 33 页报告页表、降级表
