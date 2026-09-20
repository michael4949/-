/*
 * DUS-1 · HTTP 适配（11 包共用同一份）
 * ------------------------------------------------------------
 * 两种用法：
 *   1) 直接起服务： node adapters/http.js            （PORT 环境变量，默认 8711）
 *   2) 挂到现有服务：
 *        const { nodeHandler, fetchHandler } = require('./adapters/http.js');
 *        http.createServer(nodeHandler).listen(8711);           // Node http / express 中间件
 *        export default { fetch: fetchHandler };                 // Workers / Deno / Bun
 *
 * 路由（前缀可通过 BASE_PATH 环境变量设置，默认无前缀）：
 *   GET  /health            自检
 *   GET  /manifest          机器可读清单
 *   GET  /actions           动作列表
 *   POST /actions/<name>    调用动作，body = JSON 输入，返回信封
 *   POST /invoke            body = { action, input }
 *
 * 任何语言（Python / Java / Go）都可以用这一层接入，不需要 JS 运行时以外的依赖。
 */
'use strict';
const path = require('path');
const skill = require(path.join(__dirname, '..', 'index.js'));

const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };

function route(method, pathname, body) {
  let p = pathname;
  if (BASE && p.indexOf(BASE) === 0) p = p.slice(BASE.length) || '/';
  if (method === 'OPTIONS') return { status: 204, body: '' };
  if (method === 'GET' && (p === '/' || p === '/health')) return { status: 200, body: skill.invoke('health', {}) };
  if (method === 'GET' && p === '/manifest') return { status: 200, body: skill.manifest };
  if (method === 'GET' && p === '/actions') return { status: 200, body: skill.listActions() };
  if (method === 'POST' && p === '/invoke') {
    const action = body && body.action;
    const env = skill.invoke(action, (body && body.input) || {});
    return { status: env.ok ? 200 : 400, body: env };
  }
  if (method === 'POST' && p.indexOf('/actions/') === 0) {
    const name = decodeURIComponent(p.slice('/actions/'.length));
    const env = skill.invoke(name, body || {});
    return { status: env.ok ? 200 : (env.errors[0] && env.errors[0].code === 'E_ACTION' ? 404 : 400), body: env };
  }
  return { status: 404, body: { ok: false, spec: 'dus-1', errors: [{ code: 'E_ACTION', message: '无此路由：' + method + ' ' + p }] } };
}

function nodeHandler(req, res) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    let body = null;
    if (chunks.length) { try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { res.writeHead(400, JSON_HEADERS); return res.end(JSON.stringify({ ok: false, errors: [{ code: 'E_INPUT', message: 'body 不是合法 JSON：' + e.message }] })); } }
    const pathname = (req.url || '/').split('?')[0];
    const r = route((req.method || 'GET').toUpperCase(), pathname, body);
    res.writeHead(r.status, JSON_HEADERS);
    res.end(r.status === 204 ? '' : JSON.stringify(r.body));
  });
}

async function fetchHandler(request) {
  let body = null;
  if (request.method === 'POST') { try { body = await request.json(); } catch (e) { body = null; } }
  const r = route(request.method.toUpperCase(), new URL(request.url).pathname, body);
  return new Response(r.status === 204 ? '' : JSON.stringify(r.body), { status: r.status, headers: JSON_HEADERS });
}

module.exports = { nodeHandler, fetchHandler, route, skill };

if (require.main === module) {
  const http = require('http');
  const port = Number(process.env.PORT || 8711);
  http.createServer(nodeHandler).listen(port, () => {
    const m = skill.manifest;
    console.error(m.name + ' · ' + m.id + ' v' + m.version + ' → http://127.0.0.1:' + port + BASE);
    console.error('  GET  ' + BASE + '/health   ' + BASE + '/manifest   ' + BASE + '/actions');
    console.error('  POST ' + BASE + '/actions/<name>   ' + BASE + '/invoke');
  });
}
