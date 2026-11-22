// Tiny dependency-free test harness shared by the browser and Node runners.
const suites = [];
let collecting = null;
let content = null;
const fixtures = {};

export function setContent(json) { content = json; }
export function setFixture(name, json) { fixtures[name] = json; }
export function getFixture(name) {
  if (!fixtures[name]) throw new Error(`Fixture ${name} not loaded by the runner`);
  return fixtures[name];
}
export function getContent() {
  if (!content) throw new Error('Content not loaded by the runner');
  return content;
}

export function describe(name, fn) { suites.push({ name, fn }); }
export function test(id, fn) {
  if (!collecting) throw new Error('test() must be called inside describe()');
  collecting.push({ id, fn });
}

function fmt(v) { return JSON.stringify(v); }
export const assert = {
  ok(value, msg = 'expected truthy value') { if (!value) throw new Error(msg); },
  equal(actual, expected, msg = '') {
    if (actual !== expected) throw new Error(`${msg} expected ${fmt(expected)}, got ${fmt(actual)}`);
  },
  deepEqual(actual, expected, msg = '') {
    if (fmt(actual) !== fmt(expected)) throw new Error(`${msg} expected ${fmt(expected)}, got ${fmt(actual)}`);
  },
};

export async function run() {
  const results = { total: 0, passed: 0, failed: [], suites: [] };
  for (const suite of suites) {
    collecting = [];
    suite.fn();
    const tests = collecting;
    collecting = null;
    const summary = { name: suite.name, total: tests.length, passed: 0 };
    for (const t of tests) {
      results.total += 1;
      try {
        await t.fn();
        results.passed += 1;
        summary.passed += 1;
      } catch (err) {
        results.failed.push({ suite: suite.name, id: t.id, message: err.message });
      }
    }
    results.suites.push(summary);
  }
  // Zero discovered tests is a failure (research R10).
  results.ok = results.total > 0 && results.failed.length === 0;
  return results;
}
