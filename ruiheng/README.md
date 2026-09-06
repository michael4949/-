# 企金智脑 · 企业金融客户经理 AI 助手平台（高保真原型）

面向银行企业金融客户经理的 AI 赋能产品原型。纯前端、离线可演示、数据全部虚构。

```bash
cd ruiheng
npm install
npm run dev        # http://localhost:5173
npm run build      # 产物在 dist/，base 为相对路径，可放任何静态目录
npm run build:single   # 单文件：dist-single/index.html，JS/CSS/数据全部内联，可用 file:// 或 U 盘离线打开
npm run data -- <catalog-dir>   # 把功能目录 JSON 合并为 src/data/capabilities.json 并校验 688 个能力点全覆盖
```

## 结构

| 目录 | 说明 |
|---|---|
| `src/styles/theme.css` | 幻彩视觉体系：浅色底、金融红 / 金 / 钞票绿渐变，所有卡片与条目均为渐变 |
| `src/data/plan.json` | 客户 xlsx 的三级 × 五能力域 × 模块 × 课程 × 能力点层级（唯一真源） |
| `src/data/capabilities.json` | 由脚本生成的产品功能目录（14 个产品 → 功能 → 结果面板 → 来源能力点） |
| `src/data/companies.ts` 等 | 虚构银行、人物、企业、团队数据 |
| `src/pages/Dashboard.tsx` | 首页驾驶舱：中心城市地图 + 环绕图表 |
| `src/scenes/*` | 六个深度示范场景 |
| `src/pages/ProductPage.tsx` | 通用产品页，由功能目录驱动 |
| `scripts/build-capabilities.mjs` | 合并功能目录并校验覆盖率 |

## 约定

- 银行现场只允许离线回放或本机模型，界面常驻模式指示器；本原型不发起任何网络请求。
- 数字类输出（比率、额度、定价、收益）由前端确定性计算；AI 输出一律标注"AI 生成 · 辅助建议 · 需人工复核"。
- 不替代行内内评、五级分类与审批；不做人脸、声纹、形象识别。
