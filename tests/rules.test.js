import { describe, test, assert, getContent } from './harness.js';
import { CASES } from './cases.js';
import { evaluateRound } from '../engine/rules.js';
import { loadContent, findRound } from '../engine/content.js';
import { explain, announcement } from '../engine/feedback.js';

const strip = f => (f ? { src: f.src, dst: f.dst, variant: f.variant, ...(f.fc ? { fc: f.fc } : {}) } : f);

function checkCase(cs) {
  const content = loadContent(getContent());
  const ctx = findRound(content, cs.round);
  assert.ok(ctx, `round ${cs.round} not in content`);
  const r = evaluateRound(ctx.round, ctx.board, cs.rules, ctx.sltOverrides);
  const e = cs.expect;
  assert.equal(r.status, e.status, 'status');
  if (e.inputErrors) assert.deepEqual(r.inputErrors, e.inputErrors, 'inputErrors');
  if (e.codes) assert.deepEqual(r.failures.map(f => f.code), e.codes, 'failure codes');
  for (const [code, ex] of Object.entries(e.examples || {})) {
    const f = r.failures.find(x => x.code === code);
    assert.ok(f, `missing failure ${code}`);
    assert.deepEqual(strip(f.flow), ex.flow, `${code} example flow`);
    if ('ruleIndex' in ex) assert.equal(f.ruleIndex, ex.ruleIndex, `${code} ruleIndex`);
    if ('conduitId' in ex) assert.equal(f.conduitId, ex.conduitId, `${code} conduit`);
  }
  for (const [pid, verdict] of Object.entries(e.packets || {})) {
    const p = r.packets.find(x => x.packetId === pid);
    assert.ok(p, `missing packet ${pid}`);
    assert.equal(p.verdict, verdict, `packet ${pid} verdict`);
  }
  for (const [pid, ruleIndex] of Object.entries(e.packetRules || {})) {
    assert.equal(r.packets.find(x => x.packetId === pid).ruleIndex, ruleIndex, `packet ${pid} rule`);
  }
  if (e.shadowed) assert.deepEqual(r.shadowed, e.shadowed, 'shadowed');
}

describe('Evaluator · hand-checked cases', () => {
  for (const cs of CASES) test(`${cs.id} ${cs.title}`, () => checkCase(cs));
});

describe('Evaluator · limit packets (US4-3)', () => {
  test('C14 lateral R1→R2 is out of reach with an empty path', () => {
    const content = loadContent(getContent());
    const ctx = findRound(content, '1.2');
    const r = evaluateRound(ctx.round, ctx.board, CASES.find(x => x.id === 'C14').rules, ctx.sltOverrides);
    const p = r.packets.find(x => ctx.round.wave.find(w => w.id === x.packetId).limit === 'intra-zone');
    assert.equal(p.verdict, 'out-of-reach');
    assert.deepEqual(p.path, []);
  });
  test('C6 spoofed packet is out of reach but still walked through conduit A', () => {
    const content = loadContent(getContent());
    const ctx = findRound(content, '2.2');
    const r = evaluateRound(ctx.round, ctx.board, CASES.find(x => x.id === 'C6').rules, ctx.sltOverrides);
    const p = r.packets.find(x => ctx.round.wave.find(w => w.id === x.packetId).limit === 'spoofed-source');
    assert.equal(p.verdict, 'out-of-reach');
    assert.deepEqual(p.path, ['A']);
    assert.equal(p.ruleIndex, 1);
  });
});

describe('Evaluator · limit packets never graded (US4-3, T048)', () => {
  const limitIds = round => round.wave.filter(w => w.kind === 'limit').map(w => w.id);
  for (const [roundId, label, rules] of [
    ['1.2', 'C14 correct rules', CASES.find(x => x.id === 'C14').rules],
    ['1.2', 'zone-wide any', { A: [{ action: 'permit', src: 'any', dst: 'any', service: 'any' }] }],
    ['2.2', 'C6 inbound rule', CASES.find(x => x.id === 'C6').rules],
    ['2.2', 'deny everything', { A: [{ action: 'deny', src: 'any', dst: 'any', service: 'any' }] }],
  ]) {
    test(`${roundId} ${label}: limit packets are out of reach and absent from failures`, () => {
      const content = loadContent(getContent());
      const ctx = findRound(content, roundId);
      const r = evaluateRound(ctx.round, ctx.board, rules, ctx.sltOverrides);
      for (const id of limitIds(ctx.round)) {
        assert.equal(r.packets.find(p => p.packetId === id).verdict, 'out-of-reach', `${id} verdict`);
        assert.ok(!r.failures.some(f => f.packetId === id), `${id} appears in failures`);
      }
    });
  }
  test('2.2 with correct rules is graded correct even though the spoofed packet passes the conduit', () => {
    const content = loadContent(getContent());
    const ctx = findRound(content, '2.2');
    const rules = { A: [{ action: 'permit', src: 'asset:M', dst: 'asset:R1', service: 'port-20000' }, { action: 'permit', src: 'asset:M', dst: 'asset:R2', service: 'port-20000' },
      { action: 'permit', src: 'asset:H', dst: 'asset:R2', service: 'port-20000' }] };
    const r = evaluateRound(ctx.round, ctx.board, rules, ctx.sltOverrides);
    assert.equal(r.status, 'correct');
  });
});

describe('Feedback · limit explanations (US4-1, US4-2)', () => {
  test('1.2 explains the intra-zone packet as out of reach with a remedy', () => {
    const content = loadContent(getContent());
    const ctx = findRound(content, '1.2');
    const r = evaluateRound(ctx.round, ctx.board, CASES.find(x => x.id === 'C14').rules, ctx.sltOverrides);
    const items = explain(r, ctx.round, ctx.board).filter(i => i.kind === 'limit');
    assert.equal(items.length, 1);
    assert.ok(/zone/i.test(items[0].text), items[0].text);
  });
  test('2.2 explains the spoofed packet with Secure Authentication and switch anti-spoofing, each with a read source', () => {
    const content = loadContent(getContent());
    const ctx = findRound(content, '2.2');
    const r = evaluateRound(ctx.round, ctx.board, CASES.find(x => x.id === 'C6').rules, ctx.sltOverrides);
    const [item] = explain(r, ctx.round, ctx.board).filter(i => i.kind === 'limit');
    assert.ok(/Secure Authentication/.test(item.text) && /IP Source Guard/.test(item.text), item.text);
    assert.deepEqual(item.sourceIds, ['oxford-sav5', 'extreme-ipsg']);
  });
  test('limit items never count as failures in the announcement', () => {
    const content = loadContent(getContent());
    const ctx = findRound(content, '1.2');
    const r = evaluateRound(ctx.round, ctx.board, CASES.find(x => x.id === 'C14').rules, ctx.sltOverrides);
    assert.equal(announcement(r, ctx.round), 'Round 1.2: correct.');
  });
});

describe('Evaluator · performance (SC-005)', () => {
  test('round 3.2 evaluates in under 100 ms', () => {
    const content = loadContent(getContent());
    const ctx = findRound(content, '3.2');
    const rules = CASES.find(x => x.id === 'C11').rules;
    const t0 = performance.now();
    evaluateRound(ctx.round, ctx.board, rules, ctx.sltOverrides);
    const ms = performance.now() - t0;
    assert.ok(ms < 100, `took ${ms.toFixed(1)} ms`);
  });
});

describe('Evaluator · purity', () => {
  test('same inputs give the same result and inputs are not mutated', () => {
    const content = loadContent(getContent());
    const ctx = findRound(content, '1.1');
    const rules = CASES.find(x => x.id === 'C2').rules;
    const before = JSON.stringify(rules);
    const a = evaluateRound(ctx.round, ctx.board, rules, ctx.sltOverrides);
    const b = evaluateRound(ctx.round, ctx.board, rules, ctx.sltOverrides);
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(rules), before, 'rules mutated');
  });
});
