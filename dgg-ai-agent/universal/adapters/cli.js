#!/usr/bin/env node
/*
 * DUS-1 · 命令行适配（11 包共用同一份，逐字拷贝进包内 adapters/cli.js）
 * ------------------------------------------------------------
 *   node adapters/cli.js list                         列出动作
 *   node adapters/cli.js describe                     打印 manifest
 *   node adapters/cli.js health                       自检
 *   node adapters/cli.js run --dataset make           跑一次成型动作
 *   node adapters/cli.js ask '{"question":"为什么晚","step":"order","dataset":"make"}'   动作名后直接跟一段 JSON
 *   node adapters/cli.js <action> --input in.json     用文件作输入
 *   node adapters/cli.js <action> --data state.json --orderId SO-2609-0129
 *   公共开关：--out out.json（写文件）  --pretty（缩进）  --quiet（只出 data）
 *
 * 退出码：0 成功 · 1 动作失败（信封 ok:false）· 2 用法错误。任何语言都能靠它调用本 skill。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const skill = require(path.join(__dirname, '..', 'index.js'));

function parse(argv) {
  const out = { action: null, flags: {}, fields: {}, json: [] };
  let i = 0;
  if (argv[i] && argv[i].indexOf('--') !== 0) out.action = argv[i++];
  for (; i < argv.length; i++) {
    const a = argv[i];
    /* 动作名之后的位置参：以 { 或 [ 开头的当成整包入参（SKILL.md / references 正文教的就是这个写法），
     * 其余位置参是用法错误 —— 早年这里直接 continue 丢掉，正文命令因此永远拿到空入参 */
    if (a.indexOf('--') !== 0) { out.json.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    const val = next === undefined || next.indexOf('--') === 0 ? true : (i++, next);
    if (key === 'input' || key === 'data' || key === 'out' || key === 'dataset' || key === 'pretty' || key === 'quiet') out.flags[key] = val;
    else out.fields[key] = val;
  }
  return out;
}
function readJSON(p) { return JSON.parse(fs.readFileSync(p === '-' ? 0 : p, 'utf8')); }   // '-' 表示从标准输入读，便于其它语言管道调用
function coerce(v) {
  if (typeof v !== 'string') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v !== '' && !isNaN(Number(v))) return Number(v);
  if ((v[0] === '{' && v[v.length - 1] === '}') || (v[0] === '[' && v[v.length - 1] === ']')) { try { return JSON.parse(v); } catch (e) { return v; } }
  return v;
}

const argv = process.argv.slice(2);
const q = parse(argv);

if (!q.action || q.action === 'help' || q.flags.help) {
  const m = skill.manifest;
  console.log(m.name + ' · ' + m.id + ' v' + m.version + '（' + m.summary + '）');
  console.log('\n用法： node adapters/cli.js <action> [\'<JSON>\'] [--字段 值 …] [--input in.json|-] [--data state.json] [--dataset key] [--out out.json] [--pretty]');
  console.log('\n动作：');
  skill.listActions().forEach((a) => console.log('  ' + a.name.padEnd(22) + a.title + '  ' + (a.mutates ? '[返回新数据副本] ' : '') + a.description));
  if ((m.datasets || []).length) console.log('\n预置数据集： ' + m.datasets.map((d) => d.key + '（' + d.label + '）').join('  '));
  process.exit(q.action ? 0 : 2);
}

let input = {};
try {
  if (q.flags.input) input = readJSON(q.flags.input);
  /* 位置参里的 JSON 并进入参（可以和 --字段 混用，后者覆盖前者） */
  q.json.forEach((raw) => {
    const t = raw.trim();
    if (t.charAt(0) !== '{' && t.charAt(0) !== '[') throw new Error('多余的参数「' + raw + '」：动作名之后只收一段以 { 或 [ 开头的 JSON，其余用 --字段 值');
    const v = JSON.parse(t);
    if (Array.isArray(v) || v === null || typeof v !== 'object') throw new Error('位置参里的 JSON 必须是对象：' + raw.slice(0, 40));
    Object.keys(v).forEach((k) => { input[k] = v[k]; });
  });
  if (q.flags.data) input.data = readJSON(q.flags.data);
  if (q.flags.dataset && q.flags.dataset !== true) input.dataset = q.flags.dataset;
  Object.keys(q.fields).forEach((k) => { input[k] = coerce(q.fields[k]); });
} catch (e) {
  console.error('输入读取失败：' + e.message);
  process.exit(2);
}

if (q.action === 'list') { console.log(JSON.stringify(skill.listActions(), null, 2)); process.exit(0); }

const env = skill.invoke(q.action, input);
const body = q.flags.quiet ? env.data : env;
const text = JSON.stringify(body, null, q.flags.pretty ? 2 : 0);
if (q.flags.out && q.flags.out !== true) { fs.writeFileSync(q.flags.out, text + '\n'); console.error((env.ok ? '✔ ' : '✘ ') + q.action + ' → ' + q.flags.out); }
else console.log(text);
if (!env.ok) { env.errors.forEach((e) => console.error('  ' + e.code + ' ' + e.message)); process.exit(1); }
