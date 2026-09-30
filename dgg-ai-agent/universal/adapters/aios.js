/*
 * DUS-1 · 自研 agent 平台（AI OS）适配（11 包共用同一份）
 * ------------------------------------------------------------
 * 这是**唯一需要按贵司平台改写的文件**，其余文件平台无关。改的也只是字段名映射，不碰业务逻辑。
 *
 * 用法一：宿主提供注册函数
 *     const { register } = require('<包路径>/adapters/aios.js');
 *     register(host);            // host.registerSkill(descriptor) 被调用一次
 *
 * 用法二：宿主自己读描述符
 *     const { descriptor } = require('<包路径>/adapters/aios.js');
 *     platform.load(descriptor());
 *
 * descriptor() 返回的对象已经是平台常见形态：
 *   { id, name, version, summary, tags, credits, capabilities, tools[], invoke(action, input, ctx) }
 *   tools[] 每一项都带 JSON Schema 参数表，可直接喂给大模型做 function calling。
 *
 * 要点：
 *   1. 本 skill 无状态。带 mutates 标记的动作返回**新的业务数据副本**，平台需把它写回会话状态，
 *      下次调用时作为 input.data 传回来；不传则用 input.dataset 指定的预置数据集重新开始。
 *   2. invoke 同步返回，不抛异常，失败时 ok=false 且 errors 非空（错误码见 SPEC.md §5）。
 *   3. 确定性：同一输入永远同一输出，平台可以安全缓存与重放。
 */
'use strict';
const path = require('path');
const skill = require(path.join(__dirname, '..', 'index.js'));

function tools() {
  return skill.listActions().map((a) => ({
    name: a.name,
    title: a.title,
    description: a.description,
    parameters: a.input && a.input.type ? a.input : { type: 'object', properties: {}, additionalProperties: true },
    returns: a.returns,
    readOnly: a.kind !== 'mutate',
    statefulOutput: !!a.mutates
  }));
}

function descriptor() {
  const m = skill.manifest;
  return {
    id: m.id,
    name: m.name,
    version: m.version,
    summary: m.summary,
    suite: m.suite,
    kind: m.kind,
    credits: m.credits,
    tags: (m.tags || []).slice(),
    locale: (m.i18n && m.i18n.default) || 'zh-CN',
    capabilities: m.capabilities,
    datasets: (m.datasets || []).map((d) => ({ key: d.key, label: d.label })),
    tools: tools(),
    manifest: m,
    invoke: (action, input, ctx) => skill.invoke(action, input, ctx),
    health: () => skill.invoke('health', {}).data
  };
}

/* 宿主注册。host 只需实现下面任意一个方法即可：registerSkill / register / addSkill / use */
function register(host) {
  const d = descriptor();
  const fn = host && (host.registerSkill || host.register || host.addSkill || host.use);
  if (typeof fn !== 'function') throw new Error('AI OS 宿主需要提供 registerSkill / register / addSkill / use 其中之一');
  return fn.call(host, d);
}

module.exports = { descriptor, register, tools, skill };
