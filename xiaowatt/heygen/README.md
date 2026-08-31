# HeyGen 数字人素材工具箱

由用户在自己能联网的机器上执行（Node 18+，无需安装依赖）。开发侧只需关心「到货接入」。

## 用户侧流程
```
export HEYGEN_API_KEY=xxx        # Windows: set HEYGEN_API_KEY=xxx
node heygen-kit.js looks         # 列 v3 形象与抠像(matting)能力——透明 WebM 必须用支持抠像的形象
node heygen-kit.js voices zh     # 列中文音色
#（把三个角色 avatar_id / voice_id 填入 heygen-kit.js 顶部 CAST）
node heygen-kit.js test          # 试渲一条
node heygen-kit.js render        # 批量 117 条（lines.json）→ clips/*.webm + manifest.json
node heygen-kit.js render --resume   # 断点续跑
```
接口策略：OPT.api='auto' → 先 POST /v3/videos（output_format:webm 即透明），被拒自动回退 v2（background:{type:"transparent"}）。旧 WebM 端点不支持自定义形象，这是回退存在的原因。

## 开发侧：clips 到货接入（见 CLAUDE.md「数字人」节）
1. clips/ 放到 peilian/dist/ 同级；
2. manifest.json 内联进 player.js 的 HEYGEN_MANIFEST（建议在 build.py 里加自动内联步骤）;
3. HEYGEN_CFG.mode 默认改 'clips'；
4. 重建，file:// 双击验证：视频可播、缺片段降级 builtin、无报错。

⚠️ 台词文本是匹配键（按 text.trim() 精确匹配）。改 UI 台词前先查 lines.json 是否有该条，改了就要补渲染或接受该句降级为内置渲染。
