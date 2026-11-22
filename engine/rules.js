// Pure firewall evaluator (contracts/evaluator.md). No DOM, timers, randomness or network.
import { zoneOf, enumerateUniverse, flowPath, flowKey, classify, effectiveSlt } from './flows.js';
import { expandTicket } from './content.js';

const CARD_FIELDS = ['action', 'src', 'dst', 'service'];
const FAILURE_ORDER = ['required-blocked', 'wrong-conduit', 'attack-allowed', 'over-permissive'];

/** Missing fields on a rule card (data-model.md RuleCard). */
export function cardErrors(card) {
  const errors = [];
  for (const field of CARD_FIELDS) if (!card || !card[field]) errors.push(field);
  if (card && card.service === 'dnp3') {
    const fcs = card.fcs;
    if (!(fcs === 'any' || (Array.isArray(fcs) && fcs.length > 0))) errors.push('fcs');
  }
  return errors;
}

function endpointMatches(selector, assetId, board) {
  if (selector === 'any') return true;
  const [kind, id] = selector.split(':');
  if (kind === 'asset') return id === assetId;
  if (kind === 'zone') return zoneOf(board, assetId) === id;
  return false;
}

function serviceMatches(card, flow) {
  switch (card.service) {
    case 'any': return true;
    case 'port-20000': return flow.variant === 'dnp3' || flow.variant === 'non-dnp3-20000';
    case 'other-tcp': return flow.variant === 'other-tcp';
    case 'dnp3': return flow.variant === 'dnp3' && (card.fcs === 'any' || card.fcs.includes(flow.fc));
    default: return false;
  }
}

export function matches(card, flow, board) {
  return endpointMatches(card.src, flow.src, board)
    && endpointMatches(card.dst, flow.dst, board)
    && serviceMatches(card, flow);
}

/** First match wins; no match is the implicit deny (FR-009). ruleIndex is 1-based or null. */
export function decide(rules, flow, board) {
  for (let i = 0; i < rules.length; i++) {
    if (matches(rules[i], flow, board)) return { action: rules[i].action, ruleIndex: i + 1 };
  }
  return { action: 'deny', ruleIndex: null };
}

const stripFlow = ({ src, dst, variant, fc }) => (fc ? { src, dst, variant, fc } : { src, dst, variant });

export function evaluateRound(round, board, rulesByConduit, sltOverrides = {}) {
  const rulesOf = id => (rulesByConduit && rulesByConduit[id]) || [];

  // 1. Input validity
  const inputErrors = [];
  for (const conduit of board.conduits) {
    rulesOf(conduit.id).forEach((card, i) => {
      for (const field of cardErrors(card)) inputErrors.push({ conduitId: conduit.id, ruleIndex: i + 1, field });
    });
  }
  if (inputErrors.length) return { status: 'invalid-input', inputErrors, failures: [], shadowed: [], packets: [] };

  // 2–4. Universe, per-conduit decisions and classification
  const required = expandTicket(round);
  const universe = enumerateUniverse(board, round.availableAssets);
  const slt = Object.fromEntries(board.conduits.map(c => [c.id, effectiveSlt(board, c, sltOverrides)]));
  const evals = universe.map(flow => {
    const steps = flow.path.map(conduitId => ({
      conduitId,
      ...decide(rulesOf(conduitId), flow, board),
      cls: classify(flow, required, slt[conduitId]),
    }));
    return { flow, steps, allowed: steps.every(s => s.action === 'permit') };
  });
  const byKey = new Map(evals.map(e => [flowKey(e.flow), e]));

  // 5. Failures
  const groups = Object.fromEntries(FAILURE_ORDER.map(code => [code, []]));
  for (const e of evals) {
    const isRequired = e.steps.length > 0 && e.steps[0].cls === 'required';
    if (isRequired) {
      const denied = e.steps.filter(s => s.action !== 'permit');
      if (denied.length === e.steps.length) {
        groups['required-blocked'].push({ flow: e.flow, conduitId: denied[0].conduitId, ruleIndex: denied[0].ruleIndex });
      } else if (denied.length > 0) {
        groups['wrong-conduit'].push({ flow: e.flow, conduitId: denied[0].conduitId, ruleIndex: denied[0].ruleIndex });
      }
    }
    for (const s of e.steps) {
      if (s.cls === 'forbidden' && s.action === 'permit') {
        groups['over-permissive'].push({ flow: e.flow, conduitId: s.conduitId, ruleIndex: s.ruleIndex });
      }
    }
  }
  // attack-allowed examples follow wave order, so the example is a packet the player saw.
  for (const p of round.wave) {
    if (p.kind !== 'new') continue;
    const e = byKey.get(flowKey(p.flow));
    if (!e || !e.allowed) continue;
    const forbiddenStep = e.steps.find(s => s.cls === 'forbidden');
    if (forbiddenStep) {
      groups['attack-allowed'].push({ flow: e.flow, conduitId: forbiddenStep.conduitId, ruleIndex: forbiddenStep.ruleIndex, packetId: p.id });
    }
  }
  const failures = FAILURE_ORDER.filter(code => groups[code].length).map(code => {
    const first = groups[code][0];
    const failure = { code, flow: stripFlow(first.flow), conduitId: first.conduitId, ruleIndex: first.ruleIndex, count: groups[code].length };
    if (first.packetId) failure.packetId = first.packetId;
    return failure;
  });

  // Shadowed / never-matching rules (research R6)
  const shadowed = [];
  for (const conduit of board.conduits) {
    const rules = rulesOf(conduit.id);
    if (!rules.length) continue;
    const crossing = universe.filter(f => f.path.includes(conduit.id));
    rules.forEach((card, j) => {
      const matched = crossing.filter(f => matches(card, f, board));
      if (!matched.length) {
        shadowed.push({ conduitId: conduit.id, ruleIndex: j + 1, byRuleIndex: null, kind: 'never-matches' });
        return;
      }
      const earlier = new Set();
      for (const f of matched) {
        const d = decide(rules, f, board);
        if (d.ruleIndex - 1 >= j) return; // this rule decides at least one flow: not shadowed
        earlier.add(d.ruleIndex);
      }
      shadowed.push({ conduitId: conduit.id, ruleIndex: j + 1, byRuleIndex: earlier.size === 1 ? [...earlier][0] : null, kind: 'shadowed' });
    });
  }

  // 7. Packet verdicts in authored order
  const verdicts = new Map();
  const packets = round.wave.map(p => {
    let out;
    if (p.kind === 'in-session') {
      const parent = verdicts.get(p.parent);
      out = { packetId: p.id, verdict: parent === 'allowed' ? 'in-session' : 'no-session', conduitId: null, ruleIndex: null, path: flowPath(board, p.flow) || [], hops: [] };
    } else {
      const path = flowPath(board, p.flow) || [];
      let verdict = 'allowed';
      let conduitId = null;
      let ruleIndex = null;
      const hops = [];
      for (const cid of path) {
        const d = decide(rulesOf(cid), p.flow, board);
        conduitId = cid;
        ruleIndex = d.ruleIndex;
        hops.push({ conduitId: cid, action: d.action, ruleIndex: d.ruleIndex });
        if (d.action !== 'permit') { verdict = 'denied'; break; }
      }
      if (p.kind === 'limit') verdict = 'out-of-reach';
      out = { packetId: p.id, verdict, conduitId, ruleIndex, path, hops };
    }
    verdicts.set(p.id, out.verdict);
    return out;
  });

  return { status: failures.length ? 'incorrect' : 'correct', inputErrors: [], failures, shadowed, packets };
}
