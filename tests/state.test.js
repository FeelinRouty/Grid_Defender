import { describe, test, assert } from './harness.js';
import { initialState, reduce, canNext, startingRules } from '../engine/state.js';

// A tiny fake content object, independent of data/levels.json.
const content = {
  levels: [
    { id: 'L1', boardId: 'b', rounds: [{ id: '1.1' }, { id: '1.2' }] },
    { id: 'L2', boardId: 'b', rounds: [{ id: '2.1' }] },
  ],
  boardsById: { b: { conduits: [{ id: 'A' }] } },
};
const step = (s, ...actions) => actions.reduce((acc, a) => reduce(acc, a, content), s);
const loaded = () => step(initialState(), { type: 'loaded' });
const briefed = () => step(loaded(), { type: 'chooseLevel', levelIndex: 0 });
const inRound = () => step(briefed(), { type: 'start' });

describe('State · US1', () => {
  test('fresh session opens on the level select', () => {
    const s = loaded();
    assert.equal(s.view, 'select');
  });
  test('choosing a level opens that level\'s briefing', () => {
    const s = step(loaded(), { type: 'chooseLevel', levelIndex: 1 });
    assert.equal(s.view, 'briefing');
    assert.equal(s.levelIndex, 1);
    assert.equal(step(loaded(), { type: 'chooseLevel', levelIndex: 9 }).view, 'select');
  });
  test('Start opens round 1.1 with empty rule lists (FR-008a)', () => {
    const s = inRound();
    assert.equal(s.view, 'round');
    assert.equal(s.roundIndex, 0);
    assert.deepEqual(s.rulesByConduit, { A: [] });
  });
  test('C13 invalid input leaves attempts unchanged', () => {
    const s = step(inRound(), { type: 'runWave', result: { status: 'invalid-input' } });
    assert.equal(s.rounds['1.1'], undefined);
    assert.equal(s.lastResult.status, 'invalid-input');
  });
  test('a wrong run adds one attempt and keeps the round open', () => {
    const s = step(inRound(), { type: 'runWave', result: { status: 'incorrect' } });
    assert.equal(s.rounds['1.1'].attempts, 1);
    assert.equal(s.rounds['1.1'].completed, false);
    assert.equal(canNext(s, content), false);
  });
  test('a correct run completes the round and enables Next', () => {
    const s = step(inRound(), { type: 'runWave', result: { status: 'incorrect' } }, { type: 'runWave', result: { status: 'correct' } });
    assert.equal(s.rounds['1.1'].attempts, 2);
    assert.equal(s.rounds['1.1'].completed, true);
    assert.equal(canNext(s, content), true);
  });
  test('rules persist across retries within a round', () => {
    const rules = [{ action: 'permit', src: 'any', dst: 'any', service: 'any' }];
    const s = step(inRound(), { type: 'editRules', conduitId: 'A', rules }, { type: 'runWave', result: { status: 'incorrect' } });
    assert.deepEqual(s.rulesByConduit.A, rules);
  });
  test('Next is ignored until the round is completed', () => {
    const s = step(inRound(), { type: 'next' });
    assert.equal(s.roundIndex, 0);
  });
  test('Next opens the next round with empty rules', () => {
    const s = step(inRound(),
      { type: 'editRules', conduitId: 'A', rules: [{ action: 'deny', src: 'any', dst: 'any', service: 'any' }] },
      { type: 'runWave', result: { status: 'correct' } }, { type: 'next' });
    assert.equal(s.view, 'round');
    assert.equal(s.roundIndex, 1);
    assert.deepEqual(s.rulesByConduit, { A: [] });
  });
});

const solve = s => step(s, { type: 'runWave', result: { status: 'correct' } });

describe('State · US2', () => {
  test('US2-2 Run Wave after success replays without changing counters', () => {
    const s = step(solve(inRound()), { type: 'runWave', result: { status: 'incorrect' } });
    assert.equal(s.rounds['1.1'].attempts, 1);
    assert.equal(s.rounds['1.1'].completed, true);
    assert.equal(s.lastResult.status, 'incorrect');
  });
  test('Next goes round → next level briefing → round → summary', () => {
    let s = solve(inRound());
    s = solve(step(s, { type: 'next' }));
    s = step(s, { type: 'next' });
    assert.equal(s.view, 'briefing');
    assert.equal(s.levelIndex, 1);
    s = solve(step(s, { type: 'start' }));
    assert.equal(s.rounds['2.1'].completed, true);
    s = step(s, { type: 'next' });
    assert.equal(s.view, 'summary');
  });
  test('FR-024 rounds open strictly in order: Start always opens the first round of the level', () => {
    const s = step(briefed(), { type: 'start' });
    assert.equal(s.roundIndex, 0);
    assert.equal(step(s, { type: 'next' }).roundIndex, 0);
  });
  test('Restart then Cancel leaves the session unchanged', () => {
    const before = solve(inRound());
    const s = step(before, { type: 'requestRestart' }, { type: 'cancelRestart' });
    assert.deepEqual(s, before);
  });
  test('Restart then Confirm returns a fresh session on the level select', () => {
    const s = step(solve(inRound()), { type: 'next' }, { type: 'requestRestart' }, { type: 'confirmRestart' });
    assert.equal(s.view, 'select');
    assert.equal(s.levelIndex, 0);
    assert.deepEqual(s.rounds, {});
    assert.equal(s.confirmRestart, false);
  });
  test('Confirm without a pending request does nothing', () => {
    const before = solve(inRound());
    assert.deepEqual(step(before, { type: 'confirmRestart' }), before);
  });
});

describe('State · US3 help', () => {
  test('help raises helpTier to the highest tier reached', () => {
    const s = step(inRound(), { type: 'help', tier: 1 }, { type: 'help', tier: 3 }, { type: 'help', tier: 2 });
    assert.equal(s.rounds['1.1'].helpTier, 3);
  });
  test('help never completes the round or changes attempts', () => {
    const s = step(inRound(), { type: 'help', tier: 3 });
    assert.equal(s.rounds['1.1'].completed, false);
    assert.equal(s.rounds['1.1'].attempts, 0);
    assert.equal(canNext(s, content), false);
  });
  test('help is ignored outside a round and for invalid tiers', () => {
    assert.deepEqual(step(briefed(), { type: 'help', tier: 1 }).rounds, {});
    assert.equal(step(inRound(), { type: 'help', tier: 4 }).rounds['1.1'], undefined);
  });
  test('help tier survives completion and retries; solving after tier 3 keeps "solution viewed"', () => {
    const s = step(inRound(), { type: 'help', tier: 3 }, { type: 'runWave', result: { status: 'incorrect' } }, { type: 'runWave', result: { status: 'correct' } });
    assert.equal(s.rounds['1.1'].helpTier, 3);
    assert.equal(s.rounds['1.1'].completed, true);
    assert.equal(s.rounds['1.1'].attempts, 2);
  });
});

// Rounds build on each other: a fake content set with carry-over, a conduit map and seeded rules.
const P = (src, dst) => ({ action: 'permit', src: `asset:${src}`, dst: `asset:${dst}`, service: 'port-20000' });
const carryContent = {
  levels: [
    { id: 'L1', boardId: 'two', rounds: [
      { id: '1.1', availableAssets: ['M', 'R1'], solution: { A: [P('M', 'R1')] } },
      { id: '1.2', availableAssets: ['M', 'R1', 'X'], carryOver: { from: '1.1', add: { A: [P('X', 'M')] } }, solution: { A: [P('M', 'R1')] } },
    ] },
    { id: 'L2', boardId: 'three', rounds: [
      { id: '2.1', availableAssets: ['M', 'R1'], carryOver: { from: '1.2', conduitMap: { A: '2' } }, solution: { 1: [], 2: [P('M', 'R1')] } },
    ] },
  ],
  boardsById: {
    two: { zones: [{ id: 'control' }, { id: 'substation' }], conduits: [{ id: 'A' }] },
    three: { zones: [{ id: 'engineering' }, { id: 'control' }, { id: 'substation' }], conduits: [{ id: '1' }, { id: '2' }] },
  },
};
const cstep = (s, ...actions) => actions.reduce((acc, a) => reduce(acc, a, carryContent), s);

describe('State · rules carry over between rounds', () => {
  test('a first round with no carryOver starts empty', () => {
    const start = startingRules(carryContent, {}, 0, 0);
    assert.deepEqual(start.rules, { A: [] });
    assert.equal(start.origin, 'empty');
  });
  test('Next carries the player\'s solved rules forward, then appends seeded rules', () => {
    const mine = [P('M', 'R1'), { action: 'deny', src: 'any', dst: 'any', service: 'other-tcp' }];
    const s = cstep(initialState(), { type: 'loaded' }, { type: 'chooseLevel', levelIndex: 0 }, { type: 'start' },
      { type: 'editRules', conduitId: 'A', rules: mine }, { type: 'runWave', result: { status: 'correct' } }, { type: 'next' });
    assert.deepEqual(s.rulesByConduit, { A: [...mine, P('X', 'M')] });
    assert.deepEqual(s.carriedFrom, { origin: 'player', roundId: '1.1' });
  });
  test('a level chosen directly starts from the skipped round\'s reference solution, mapped to the new conduit', () => {
    const s = cstep(initialState(), { type: 'loaded' }, { type: 'chooseLevel', levelIndex: 1 }, { type: 'start' });
    assert.deepEqual(s.rulesByConduit, { 1: [], 2: [P('M', 'R1')] });
    assert.deepEqual(s.carriedFrom, { origin: 'reference', roundId: '1.2' });
  });
  test('carried rules naming an asset not in the new round are dropped', () => {
    const rounds = { '1.2': { completed: true, solvedRules: { A: [P('X', 'M'), P('M', 'R1')] } } };
    assert.deepEqual(startingRules(carryContent, rounds, 1, 0).rules, { 1: [], 2: [P('M', 'R1')] });
  });
  test('a round solved before reopens with its own solved rules', () => {
    const rounds = { '1.1': { completed: true, solvedRules: { A: [P('M', 'R1')] } } };
    const start = startingRules(carryContent, rounds, 0, 0);
    assert.deepEqual(start.rules, { A: [P('M', 'R1')] });
    assert.equal(start.origin, 'own');
  });
  test('carried rules are copies: editing them never changes the earlier round\'s record', () => {
    const rounds = { '1.1': { completed: true, solvedRules: { A: [{ ...P('M', 'R1'), fcs: ['READ'] }] } } };
    const start = startingRules(carryContent, rounds, 0, 1);
    start.rules.A[0].fcs.push('WRITE');
    assert.deepEqual(rounds['1.1'].solvedRules.A[0].fcs, ['READ']);
  });
  test('Levels returns to the select screen and keeps progress', () => {
    const s = cstep(initialState(), { type: 'loaded' }, { type: 'chooseLevel', levelIndex: 0 }, { type: 'start' },
      { type: 'runWave', result: { status: 'correct' } }, { type: 'showLevels' });
    assert.equal(s.view, 'select');
    assert.equal(s.rounds['1.1'].completed, true);
    assert.equal(cstep(s, { type: 'showSummary' }).view, 'summary');
  });
});
