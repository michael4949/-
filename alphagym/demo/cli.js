#!/usr/bin/env node
/**
 * 演示：在真实历史行情上，让几种不同"能力画像"的交易者跑一遍完整评估。
 *
 * 用法:
 *   node demo/cli.js                    # 全部画像
 *   node demo/cli.js 入场技能            # 指定一种
 *   node demo/cli.js 无技能 --json       # 输出喂给大模型的 payload
 */
import { makeRng } from '../src/rng.js';
import { A_SHARE } from '../src/trades.js';
import { analyzeSession } from '../src/engine.js';
import { renderText, toLlmPayload, LLM_SYSTEM_PROMPT } from '../src/report.js';
import { GOOG } from '../src/fixture.js';
import {
  randomTrader, directionSkillTrader, entrySkillTrader,
  exitSkillTrader, sizingSkillTrader,
} from '../src/simulate.js';

const fx = GOOG();
const bars = fx.bars;
const INSTRUMENT = { ...A_SHARE, symbol: fx.symbol };

const PROFILES = {
  '无技能': (rng) => randomTrader(rng, bars.length, { K: 40, meanDur: 14 }),
  // 最贴近真实用户的画像：略强于抛硬币，但优势被噪音淹没 —— 这正是复盘训练要解决的处境
  '微弱优势': (rng) => directionSkillTrader(rng, bars, { K: 40, meanDur: 14, skill: 0.56 }),
  '方向技能': (rng) => directionSkillTrader(rng, bars, { K: 40, meanDur: 14, skill: 0.7 }),
  '入场技能': (rng) => entrySkillTrader(rng, bars, { K: 40, meanDur: 14, candidates: 8 }),
  '出场技能': (rng) => exitSkillTrader(rng, bars, { K: 40, meanDur: 14, candidates: 8 }),
  '仓位技能': (rng) => sizingSkillTrader(rng, bars, { K: 40, meanDur: 14 }),
  '样本太少': () => ([
    { entry: 300, exit: 340, dir: 1, size: 2 },
    { entry: 500, exit: 520, dir: -1, size: 1 },
    { entry: 800, exit: 860, dir: 1, size: 3 },
    { entry: 1100, exit: 1130, dir: 1, size: 2 },
  ]),
};

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const wanted = args.filter(a => !a.startsWith('--'));
const names = wanted.length ? wanted : Object.keys(PROFILES);

console.log(`数据：${fx.symbol} ${fx.timeframe} · ${fx.count} 根 · ${fx.source}\n`);

for (const name of names) {
  const gen = PROFILES[name];
  if (!gen) { console.error(`未知画像: ${name}（可选：${Object.keys(PROFILES).join(' / ')}）`); continue; }

  const trades = gen(makeRng(20260725));
  if (!trades) { console.error(`${name}: 无法生成交易`); continue; }

  const t0 = Date.now();
  const report = analyzeSession({
    bars, trades, instrument: INSTRUMENT, seed: 20260725, iterations: 2000,
  });
  const ms = Date.now() - t0;

  if (asJson) {
    console.log(`\n──── ${name} · 喂给大模型的 payload ────`);
    console.log(JSON.stringify(toLlmPayload(report), null, 2));
  } else {
    console.log(`\n\n▌交易者画像：${name}   （评估耗时 ${ms} ms）`);
    console.log(renderText(report));
  }
}

if (asJson) {
  console.log('\n──── 配套系统提示 ────');
  console.log(LLM_SYSTEM_PROMPT);
}
