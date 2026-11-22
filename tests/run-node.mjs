// Optional terminal runner: node tests/run-node.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setContent, setFixture, run } from './harness.js';
import { SUITES, FIXTURES } from './suites.js';

const here = dirname(fileURLToPath(import.meta.url));
setContent(JSON.parse(readFileSync(join(here, '..', 'data', 'levels.json'), 'utf8')));
for (const name of FIXTURES) setFixture(name, JSON.parse(readFileSync(join(here, 'fixtures', `${name}.json`), 'utf8')));
for (const path of SUITES) await import(path);

const r = await run();
for (const s of r.suites) console.log(`${s.name}: ${s.passed}/${s.total}`);
for (const f of r.failed) console.log(`FAIL ${f.suite} › ${f.id}: ${f.message}`);
console.log(r.ok
  ? `PASS: ${r.passed}/${r.total} tests passed.`
  : `FAIL: ${r.passed}/${r.total} passed${r.total === 0 ? ' (no tests discovered)' : ''}.`);
process.exit(r.ok ? 0 : 1);
