/* ==========================================================================
   docparse.js · 原型侧的薄包装
   ------------------------------------------------------------------
   真正的解析在 skills/_shared/docparse.js（平台中立、全同步、零依赖），
   这一层只干两件事：
     1）把浏览器的 File 用 FileReader 读成字节；
     2）把共用件的同步结果包成 Promise，保持原型既有的调用方式不变。
   现场观众选的文件依旧全部在本机解析：不发网络请求、不落任何存储。

   对外：window.DGG.docparse = {
           ACCEPT, kindOf(name), label(kind), sizeText(n),
           parse(file) → Promise<结果>,      // 原型用这个
           parseBytes({name,bytes}) → 结果,  // 共用件的同步口径，原样透出
           core                              // 共用件本体
         }
   结果结构见 skills/_shared/docparse.js 的注释；失败不抛异常，返回 { ok:false, note:'原因' }。
   ========================================================================== */
(function () {
  'use strict';
  var G = (typeof window !== 'undefined') ? window : this;
  G.DGG = G.DGG || {};

  /* 共用件先于本文件加载（构建时内联在前；Node 下退回 require） */
  var core = G.DGG.docparse;
  if (!core && typeof require === 'function') {
    try { core = require('../../skills/_shared/docparse.js'); } catch (e) { core = null; }
  }
  if (!core || typeof core.parse !== 'function') {
    throw new Error('缺少共用件 skills/_shared/docparse.js');
  }

  function readBytes(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(new Uint8Array(r.result)); };
      r.onerror = function () { rej(new Error('文件读取失败')); };
      r.readAsArrayBuffer(file);
    });
  }

  function parse(file) {
    var name = (file && file.name) || '', size = (file && file.size) || 0;
    return readBytes(file).then(function (bytes) {
      return core.parse({ name: name, bytes: bytes, size: size });
    }, function (e) {
      var r = core.parse({ name: name, bytes: new Uint8Array(0), size: size });
      r.ok = false; r.note = (e && e.message) || '文件读取失败';
      return r;
    });
  }

  G.DGG.docparse = {
    ACCEPT: core.ACCEPT,
    kindOf: core.kindOf,
    label: core.label,
    sizeText: core.sizeText,
    parse: parse,
    parseBytes: core.parse,
    core: core
  };
})();
