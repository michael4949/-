// 浏览器空 shim：@anthropic-ai/sdk 的凭证链代码会动态 import node:fs / node:path
// 来读取本机 `ant auth` 配置文件——浏览器里我们始终显式传入 apiKey，这些路径不会执行。
export default {};
