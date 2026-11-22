import { describe, test, assert, getContent } from './harness.js';
import { validateContent, loadContent, findRound } from '../engine/content.js';
import { evaluateRound } from '../engine/rules.js';
import { getFixture } from './harness.js';

const clone = () => JSON.parse(JSON.stringify(getContent()));
const level = (doc, id) => doc.levels.find(l => l.id === id);
const round = (doc, id) => doc.levels.flatMap(l => l.rounds).find(r => r.id === id);
const board = (doc, id) => doc.boards.find(b => b.id === id);

function expectError(doc, code, roundId) {
  const res = validateContent(doc);
  assert.equal(res.ok, false, `expected ${code} but content validated`);
  const hit = res.errors.find(e => e.code === code && (roundId === undefined || e.roundId === roundId));
  assert.ok(hit, `expected ${code}${roundId ? ` for ${roundId}` : ''}, got ${JSON.stringify(res.errors.map(e => [e.code, e.roundId]))}`);
}

describe('Content · shipped file', () => {
  test('data/levels.json validates', () => {
    const res = validateContent(clone());
    assert.ok(res.ok, JSON.stringify(res.errors));
  });
  test('every source record has been read and checked (Principle I)', () => {
    const doc = clone();
    for (const src of doc.sources) assert.ok(src.verified === true && src.checked, `${src.id} not checked`);
  });
  test('ships 3 levels and 6 rounds in order', () => {
    const doc = clone();
    assert.deepEqual(doc.levels.map(l => l.id), ['L1', 'L2', 'L3']);
    assert.deepEqual(doc.levels.flatMap(l => l.rounds.map(r => r.id)), ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2']);
  });
});

describe('Content · validation errors', () => {
  test('C12 ticket referencing unknown asset R3 → unknown-asset', () => {
    const doc = clone();
    round(doc, '1.1').required[0].dst = 'R3';
    expectError(doc, 'unknown-asset', '1.1');
  });
  test('schemaVersion other than 1 → schema', () => {
    const doc = clone();
    doc.schemaVersion = 2;
    expectError(doc, 'schema');
  });
  test('duplicate round id → duplicate-id', () => {
    const doc = clone();
    round(doc, '1.2').id = '1.1';
    expectError(doc, 'duplicate-id');
  });
  test('overlapping zones → zone-overlap', () => {
    const doc = clone();
    board(doc, 'two-zone').zones[1].cells.push('A1');
    expectError(doc, 'zone-overlap');
  });
  test('asset on a cell outside the board → asset-off-board', () => {
    const doc = clone();
    board(doc, 'two-zone').assets[0].cell = 'J9';
    expectError(doc, 'asset-off-board');
  });
  test('asset outside every zone → asset-outside-zone', () => {
    const doc = clone();
    board(doc, 'two-zone').assets[0].cell = 'A4';
    expectError(doc, 'asset-outside-zone');
  });
  test('conduit on a zone cell → conduit-in-zone', () => {
    const doc = clone();
    board(doc, 'two-zone').conduits[0].cell = 'D3';
    expectError(doc, 'conduit-in-zone');
  });
  test('conduit joining one zone twice → conduit-joins', () => {
    const doc = clone();
    board(doc, 'two-zone').conduits[0].joins = ['control', 'control'];
    expectError(doc, 'conduit-joins');
  });
  test('zones with no conduit path → zone-graph', () => {
    const doc = clone();
    board(doc, 'three-zone').conduits.pop();
    expectError(doc, 'zone-graph');
  });
  test('required flow inside one zone → same-zone-required', () => {
    const doc = clone();
    round(doc, '1.2').required.push({ src: 'R1', dst: 'R2', variant: 'dnp3', fcs: ['READ'] });
    expectError(doc, 'same-zone-required', '1.2');
  });
  test('SL-T 3 ticket without function codes → slt-ticket', () => {
    const doc = clone();
    round(doc, '3.1').required = [{ src: 'M', dst: 'R1', variant: 'non-dnp3-20000' }];
    expectError(doc, 'slt-ticket', '3.1');
  });
  test('spoofed packet that is not a required flow → limit-stoppable', () => {
    const doc = clone();
    const p = round(doc, '2.2').wave.find(w => w.limit === 'spoofed-source');
    p.flow = { src: 'M', dst: 'R2', variant: 'other-tcp' };
    expectError(doc, 'limit-stoppable', '2.2');
  });
  test('intra-zone packet that crosses a conduit → limit-stoppable', () => {
    const doc = clone();
    const p = round(doc, '1.2').wave.find(w => w.limit === 'intra-zone');
    p.flow.dst = 'M';
    expectError(doc, 'limit-stoppable', '1.2');
  });
  test('in-session packet with a missing parent → bad-parent', () => {
    const doc = clone();
    round(doc, '1.1').wave.find(w => w.kind === 'in-session').parent = 'nope';
    expectError(doc, 'bad-parent', '1.1');
  });
  test('unknown source id → unknown-source', () => {
    const doc = clone();
    level(doc, 'L1').sourceIds.push('no-such-source');
    expectError(doc, 'unknown-source');
  });
  test('two hints instead of three → hint-count', () => {
    const doc = clone();
    round(doc, '2.1').hints.pop();
    expectError(doc, 'hint-count', '2.1');
  });
});

// T057 / SC-007: a new round that reuses the existing mechanic needs content only.
// Expected results are hand-derived: the ticket is H → R2 DNP3 READ on the SL-T 2 conduit A.
describe('Content · trial round added by data only (T057, SC-007)', () => {
  const withTrial = () => {
    const doc = clone();
    const { levelId, round: trial } = getFixture('trial-round');
    level(doc, levelId).rounds.push(JSON.parse(JSON.stringify(trial)));
    return doc;
  };
  test('content with trial round 1.3 validates', () => {
    const res = validateContent(withTrial());
    assert.ok(res.ok, JSON.stringify(res.errors));
  });
  test('trial 1.3: permit H → R2 DNP3 {READ} is correct', () => {
    const ctx = findRound(loadContent(withTrial()), '1.3');
    const r = evaluateRound(ctx.round, ctx.board, { A: [{ action: 'permit', src: 'asset:H', dst: 'asset:R2', service: 'dnp3', fcs: ['READ'] }] }, ctx.sltOverrides);
    assert.equal(r.status, 'correct');
    assert.deepEqual(r.packets.map(p => p.verdict), ['allowed', 'in-session', 'denied']);
  });
  test('trial 1.3: permit H → Substation tcp/20000 is attack-allowed + over-permissive', () => {
    const ctx = findRound(loadContent(withTrial()), '1.3');
    const r = evaluateRound(ctx.round, ctx.board, { A: [{ action: 'permit', src: 'asset:H', dst: 'zone:substation', service: 'port-20000' }] }, ctx.sltOverrides);
    assert.deepEqual(r.failures.map(f => f.code), ['attack-allowed', 'over-permissive']);
    assert.deepEqual(r.failures[0].flow, { src: 'H', dst: 'R1', variant: 'dnp3', fc: 'READ' });
  });
});
