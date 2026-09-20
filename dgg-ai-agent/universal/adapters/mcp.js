#!/usr/bin/env node
/*
 * DUS-1 · MCP 适配（11 包共用同一份）
 * ------------------------------------------------------------
 * 把本 skill 的动作暴露成 MCP tools，stdio 传输、JSON-RPC 2.0、按行分隔，不依赖任何 SDK。
 *
 * 客户端配置示例（Claude Desktop / 任意 MCP 宿主）：
 *   { "mcpServers": { "ai-erp": { "command": "node", "args": ["<包路径>/adapters/mcp.js"] } } }
 *
 * 支持：initialize · notifications/initialized · ping · tools/list · tools/call
 * 工具名即动作名；tools/call 返回信封的 data（失败时 isError=true 并给出错误码）。
 */
'use strict';
const path = require('path');
const skill = require(path.join(__dirname, '..', 'index.js'));
const PROTOCOL = '2024-11-05';

function tools() {
  return skill.listActions().map((a) => ({
    name: a.name,
    description: (a.title ? a.title + '：' : '') + a.description + (a.mutates ? '（返回新的业务数据副本，请存回会话状态）' : ''),
    inputSchema: a.input && a.input.type ? a.input : { type: 'object', properties: {}, additionalProperties: true }
  }));
}

function handle(msg) {
  const id = msg.id;
  const reply = (result) => ({ jsonrpc: '2.0', id: id, result: result });
  const error = (code, message) => ({ jsonrpc: '2.0', id: id, error: { code: code, message: message } });

  switch (msg.method) {
    case 'initialize':
      return reply({
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: skill.manifest.id, version: skill.manifest.version },
        instructions: skill.manifest.name + '：' + skill.manifest.summary + ' 纯规则、确定性、可离线。'
      });
    case 'notifications/initialized':
    case 'initialized':
      return null;
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: tools() });
    case 'tools/call': {
      const p = msg.params || {};
      const env = skill.invoke(p.name, p.arguments || {});
      const text = JSON.stringify(env.ok ? env.data : { errors: env.errors }, null, 2);
      return reply({ content: [{ type: 'text', text: text }], isError: !env.ok });
    }
    default:
      return id === undefined ? null : error(-32601, '未实现的方法：' + msg.method);
  }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (e) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON 解析失败' } }) + '\n'); continue; }
    let out = null;
    try { out = handle(msg); } catch (e) { out = { jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: e.message } }; }
    if (out) process.stdout.write(JSON.stringify(out) + '\n');
  }
});
/* 标准输入关闭后自然退出：不要 process.exit(0)，大结果（几十 KB）会在 stdout 冲刷前被截断 */
process.stdin.on('end', () => { process.exitCode = 0; });
