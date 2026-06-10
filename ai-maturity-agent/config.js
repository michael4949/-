/* ============================================================
   企业AI成熟度评估智能体 · 本地配置文件
   ------------------------------------------------------------
   使用方法：
   1. 用记事本 / VS Code 打开本文件；
   2. 在下方 apiKey 的引号内，粘贴您的 Anthropic API Key
      （在 https://console.anthropic.com → API Keys 创建，以 sk-ant- 开头）；
   3. 保存本文件，双击打开同目录下的 HTML 即可使用，无需再次输入。

   说明：
   - Key 只保存在您本机的这个文件里，页面直接连接 Anthropic 官方
     API（api.anthropic.com），不经过任何第三方服务器；
   - 本文件必须与 HTML 文件放在同一个文件夹内。
   ============================================================ */

window.AIM2_CONFIG = {

  /* ↓↓↓ 在引号内粘贴您的 API Key ↓↓↓ */
  apiKey: "",

  /* 底座模型（默认 Claude Opus 4.8，一般无需修改） */
  model: "claude-opus-4-8",

  /* 是否允许智能体联网检索行业数据（true=允许 / false=关闭） */
  enableWebSearch: true

  /* 高级（可选）：如贵司使用兼容 Anthropic 协议的企业网关/中转服务，
     去掉下一行开头的 // 并改为该服务的 messages 接口地址：
  ,apiUrl: "https://api.anthropic.com/v1/messages"
  */

};
