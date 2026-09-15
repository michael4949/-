# 薯片AI智能体 · 能力内核（skill）+ 展台高保真原型

一个内核，两个壳：每个模块只写一次「输入 → 离线计算 → 一处 LLM → 结构化输出」，
skill 是这份定义加一个面向 AI OS 的清单，原型是这份定义加一层界面。

```
skills/
  _shared/                 企业画像 schema · 6↔12 行业映射 · 积分表 · 禁忌词表 · lint
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
node scripts/gen-benchmark.js     # 重新生成参考带（业务侧抽样到位后改为直接替换 data/benchmark.json）

cd ../../prototype
node build.js                     # 构建 dist/index.html
NODE_PATH=$(npm root -g) node test/screenshot.js   # 需要 playwright + chromium
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

| # | 模块 | skill | 原型 | 状态 |
|---|---|---|---|---|
| 1 | 企业AI成熟度评估 | ✔ | ✔ | 屏幕与内核逐字一致（test/screenshot.js） |
