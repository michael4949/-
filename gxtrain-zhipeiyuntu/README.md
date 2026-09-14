# 智培云图 · 南方电网广西电网有限责任公司人才培养数智平台（高保真原型）

单文件 HTML 高保真原型，用于向广西电网人力资源部培训科现场演示。

- **接手开发前请先读 [`CLAUDE.md`](./CLAUDE.md)**，里面有客户已明确的硬性规则，违反需返工。
- `docs/01-客户与项目背景.md` — 客户事实、六模块闭环、已被否决的功能点
- `docs/02-原型设计规范.md` — 配色、页面结构、元素库、动效体系、陪练数据结构、中枢分级页面
- `docs/03-待办与下一步.md` — 报价包、场景卡、原型待打磨点
- `docs/99-原始会话记录.txt` — 从穿透分析到原型定稿的完整过程记录
- `reference-deliverables/` — 已交付客户的 xlsx 与 docx
- `bundle.html` — 当前版本原型成品，双击即可打开

## 快速开始

```bash
pnpm install
pnpm dev
```

打包成单文件：

```bash
npx parcel build index.html --dist-dir dist --no-source-maps
npx html-inline -i dist/index.html -o bundle.html
```
