Manrope-var.woff2 —— Manrope 可变字重（200–800）拉丁子集，SIL Open Font License 1.1（Google Fonts 分发版）。
NotoSansSC-900.css —— Noto Sans SC Black（900）中文标题字，SIL OFL 1.1；按两个 demo 源码实际用到的 1,651 个汉字与符号子集化（Google Fonts 切片各自 pyftsubset 后 base64 内联，带 unicode-range），约 300 KB。
两个 demo 的 build.py 构建时把本目录的 *.woff2 与 *.css 一并内联到样式头部（/*__FONTS__*/）；中文正文仍走系统字体，标题用 'Noto Sans SC' 900。
新增用字（源码里出现新汉字）后需重新子集化：会话 scratchpad/fonts 下的脚本以 used_chars.txt 为准。
