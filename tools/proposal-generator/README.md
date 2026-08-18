# 方案文档生成器

生成《AI 智能投研平台_商务技术方案与模块报价书_V1.0.docx》的全套脚本。
文档 41 页（封面 1 + 目录 2 + 正文 38），所有配图与 3D 标题栏均由脚本生成。

## 依赖

```bash
npm install docx                      # Word 文档生成
pip install pillow numpy matplotlib pypdfium2   # 配图生成 / 渲染校验
apt-get install -y libreoffice-writer # 仅用于渲染校验（可选）
```

中文字体使用 `/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc`（配图内嵌）。
Word 文档内的正文字体指定为「微软雅黑」，在 Windows Word 中显示最佳。

## 构建

```bash
python3 gen_bars.py        # 10 条 3D 彩色凸浮章节标题栏 → img/bar*.png
python3 gen_figs.py        # 8 张信息图（架构/闭环/舆情/报价/甘特等）→ img/fig_*.png
python3 gen_cover_a4.py    # 封面装饰底图 → img/banner*.png（需手动裁切，见文件末尾）
node main.js               # 组装输出 docx
```

## 目录页码的两遍构建

目录页码是静态的，由两遍构建得到：

1. 删除 `pagemap.json`，`node main.js` 生成不含页码的版本
2. 转成 PDF，逐页提取文字，定位每个小节所在页
3. 写回 `pagemap.json`，再次 `node main.js`

正文大幅增删后需重跑这个流程，否则页码会失准。
（若不想维护静态页码，可改用 Word 域代码 TOC，代价是部分阅读器首次打开需手动更新域。）

## 文件说明

| 文件 | 作用 |
|---|---|
| `build.js` | 设计令牌（配色/字体）与全部排版构件：标题、表格、强调框、KPI 卡、图注 |
| `content.js` | 正文第 01–05 章 |
| `content2.js` | 正文第 06–10 章 |
| `content3.js` | 补充章节 5.7 / 6.6 / 8.5 / 10.5 |
| `toc.js` | 目录条目定义（10 章 47 节） |
| `main.js` | 封面、封底、目录、页眉页脚与文档组装 |
| `pagemap.json` | 目录页码映射（由构建流程生成） |

## 已知的坑

- **docx-js 的段落边框顺序不合 OOXML 规范**：它按 `top→bottom→left→right` 输出，
  而 schema 要求 `top→left→bottom→right`。同时使用多个方向的段落边框会触发校验错误。
  当前 H2 标题只用 `left` 单边框规避。表格边框（`tblBorders`）无此问题。
- **单元格 `margins` 的 key 顺序即输出顺序**，必须写成 `top, left, bottom, right`。
- **文档级默认行距会裁切图片**：`styles.default.document.paragraph.spacing.line`
  一旦设置，图片段落会被压成细条。当前不设全局行距，改为在各文本构件上单独指定。
- **表格行跨页会截断内容**，所有 `TableRow` 均设 `cantSplit: true`。
- **分节不会自动继承空页眉页脚**：封面与封底必须显式传入空的 Header/Footer，
  否则正文的页眉页脚会压在整页图上。
