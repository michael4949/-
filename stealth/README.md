# 飞机隐身涂装配比智能体 ✈️🛡️

一个**基于真实电磁物理**的 Web 智能体：输入雷达频段与厚度/重量约束，它自动设计出
**雷达吸波涂层（RAM）的逐层材料配比**，并给出**模拟天空的天蓝伪装面漆配色**。

> 入口页面：`stealth.html`（与仓库原有「AI 爆款工厂」`index.html` 并存，互不影响）。

---

## 两条核心需求如何被满足

**① 无限接近真实** —— 不是查表猜数，而是跑真实物理：

| 模块 | 用到的真实理论 | 文件 |
|---|---|---|
| 反射损耗 RL(f) | 金属背衬**多层传输线模型**（Dallenbach/Jaumann 设计的标准工具） | `core/physics.ts` |
| 复合材料 ε、μ | **有效介质理论**（Maxwell–Garnett / Bruggeman 自洽混合） | `core/physics.ts` |
| 材料参数 | X 波段**公开文献代表值**（羰基铁/铁氧体/碳纳米管/石墨烯/导电聚合物…） | `core/materials.ts` |
| 配比寻优 | **差分进化**全局优化（无梯度、抗局部最优） | `core/de.ts` `core/optimizer.ts` |
| 天空颜色 | **瑞利散射 ∝1/λ⁴ + 气溶胶 + 普朗克太阳谱 → CIE 1931 → sRGB** | `core/color.ts` |
| 颜料调色 | **Kubelka–Munk** 单常数减色混合模型 | `core/camouflage.ts` |

物理引擎自带数值自检（`npx tsx stealth/core/selftest.ts`）：裸金属全反射、无源被动性
（RL≤0）、Dallenbach 吸收谷、**1/4 波长定律**（厚度×2→谐振频率÷2，实测比值 2.00）、
阻抗匹配深吸收、EMT 端点——全部通过。

**② 配色天蓝色底（模拟天空）** ——

- 页面背景直接用**物理算出的天空色**生成「天顶深蓝→地平线浅蓝」渐变，真·模拟天空；
- 面漆色由瑞利散射算出的天空色反推颜料配比，**色相吻合 ≈1.5°**；
- 关键真实洞察：晴空是**自发光**，亮度/彩度远超被动涂料反照——亮度差物理上无法消除
  （二战因此发明 **Yehudi 主动补光灯**）。故智能体对齐**色相**而非亮度，并如实报告彩度差。

---

## 智能体怎么「想」

它按真实 RAM 工程范式生成候选结构，逐一用差分进化优化每层（填料体积分数 + 厚度），
再按 **「全带吸收达标 + 深吸收 + 宽带 − 厚度/面密度/成本」** 综合评分择优：

1. **Dallenbach 单层** —— 最薄最轻，窄带强吸收；
2. **双层阻抗梯度** —— 外层弱损耗做阻抗匹配（让波进入），内层强磁损耗贴金属耗散；
3. **三层梯度宽带** —— 介电→磁损耗逐级过渡，覆盖 X–Ku 宽带。

> 典型结果（X 波段，限厚 3mm / 面密度 6kg·m⁻²）：双层梯度（聚苯胺匹配层 + 镍锌铁氧体磁损耗层），
> 全带 ≤ −10 dB（90% 吸收），最深 −27 dB，2.5 mm / 5.6 kg·m⁻²。

最外统一覆 0.08 mm 天蓝面漆（强制非导电颜料，避免炭黑抬高表层损耗/RCS）。

---

## 运行

```bash
npm install
npm run dev          # 打开 http://localhost:3000/stealth.html
npm run build        # 产物含 dist/stealth.html 与 dist/index.html
```

命令行体验内核（无需浏览器）：

```bash
npx tsx stealth/core/selftest.ts   # 物理引擎自检
npx tsx stealth/core/e2e.ts        # 跑一遍智能体，打印方案 + 伪装配色
```

---

## 目录

```
stealth/
├── stealth.html (在仓库根)        多页面入口
├── main.tsx                       挂载 React 应用
├── worker.ts                      Web Worker：后台跑寻优，不卡界面
├── StealthApp.tsx                 主界面（天蓝主题、控制面板、指标、布局）
├── ui/
│   ├── SpectrumChart.tsx          反射损耗频谱（recharts，含 −10/−20dB 参考线）
│   ├── LayerStack.tsx             涂层剖面 SVG（入射波→面漆→吸波层→金属）
│   └── CamouflageCard.tsx         天空↔漆色对比 + 颜料配方 + 雷达告警
└── core/                          纯计算内核（与 UI 解耦，可单独 tsx 运行）
    ├── complex.ts  de.ts  color.ts
    ├── materials.ts  physics.ts  camouflage.ts  optimizer.ts  agent.ts
    ├── types.ts
    └── selftest.ts  e2e.ts        测试/演示
```

---

## ⚠️ 重要声明

本工具是面向**教学与科研的物理仿真**：材料电磁参数取自**公开学术文献的代表性数量级**，
并非任何机密配方或某型号的实测数据；真实工程中 ε/μ 随频率、工艺、温度显著色散，且涂层
性能还取决于制造、固化、与机体集成、维护等本仿真未覆盖的因素。**不含任何机密或受控信息。**
