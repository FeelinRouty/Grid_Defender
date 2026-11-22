// Pure feedback assembly: RoundResult + round text → items and log lines.
// It never adds a reason the evaluator did not report (Principle VI).
import { assetById, zoneOf, FC_HEX } from './flows.js';

export const CODE_TITLES = {
  'required-blocked': 'Required flow blocked',
  'wrong-conduit': 'Blocked on one conduit of its path',
  'attack-allowed': 'Attack allowed',
  'over-permissive': 'Over-permissive',
};

const FIELD_LABELS = { action: 'an action', src: 'a source', dst: 'a destination', service: 'a service', fcs: 'at least one function code' };

const DEFAULT_TEXT = {
  'required-blocked': 'The ticket flow {flow} was blocked at conduit {conduit} by {rule}.',
  'wrong-conduit': 'The ticket flow {flow} is blocked at conduit {conduit} by {rule}, although another conduit on its path permits it.',
  'attack-allowed': '{flow} got through conduit {conduit} via {rule}.',
  'over-permissive': 'Your rules permit {count} flow(s) the ticket does not need, for example {flow} via {rule} at conduit {conduit}.',
};

const DEFAULT_LIMIT_TEXT = {
  'intra-zone': 'This packet stayed inside one zone, so it never crossed a conduit and no conduit rule could see it.',
  'spoofed-source': 'This packet forged a permitted source address, so at the conduit it looked identical to an allowed flow.',
};

export function serviceLabel(flow) {
  if (flow.variant === 'dnp3') return `DNP3 ${flow.fc}${FC_HEX[flow.fc] ? ` (${FC_HEX[flow.fc]})` : ''}`;
  if (flow.variant === 'non-dnp3-20000') return 'non-DNP3 on tcp/20000';
  return 'other TCP';
}

export function endpointLabel(board, assetId) {
  const asset = assetById(board, assetId);
  return asset ? `${asset.id}(${asset.cell})` : assetId;
}

export function describeFlow(board, flow) {
  return `${endpointLabel(board, flow.src)} → ${endpointLabel(board, flow.dst)} ${serviceLabel(flow)}`;
}

export function ruleText(ruleIndex) {
  return ruleIndex ? `rule ${ruleIndex}` : 'the implicit deny';
}

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function inputGuidance(error) {
  return `Rule ${error.ruleIndex} on conduit ${error.conduitId} needs ${FIELD_LABELS[error.field] || error.field}.`;
}

/** Feedback items for the result panel. */
export function explain(result, round, board) {
  if (result.status === 'invalid-input') {
    return result.inputErrors.map(e => ({ kind: 'guidance', text: inputGuidance(e) }));
  }
  const items = [];
  if (result.status === 'correct') {
    items.push({ kind: 'correct', text: (round.feedback && round.feedback.correct) || 'Your policy permits exactly the ticketed flows.' });
  }
  for (const f of result.failures) {
    const template = (round.feedback && round.feedback[f.code]) || DEFAULT_TEXT[f.code];
    const vars = { flow: describeFlow(board, f.flow), conduit: f.conduitId, rule: ruleText(f.ruleIndex), count: f.count };
    items.push({ kind: 'failure', code: f.code, title: CODE_TITLES[f.code], text: fill(template, vars) });
  }
  // Limit packets: shown as "out of reach", never as failures (FR-017, US4).
  for (const p of result.packets) {
    if (p.verdict !== 'out-of-reach') continue;
    const packet = round.wave.find(w => w.id === p.packetId);
    const n = round.wave.indexOf(packet) + 1;
    items.push({
      kind: 'limit', code: packet.limit, title: `Out of reach (packet #${n})`,
      text: packet.explanation || DEFAULT_LIMIT_TEXT[packet.limit] || 'No conduit rule can stop this packet.',
      sourceIds: packet.sourceIds || [],
    });
  }
  for (const s of result.shadowed) {
    const text = s.kind === 'never-matches'
      ? `Rule ${s.ruleIndex} on conduit ${s.conduitId} matches no traffic that crosses this conduit.`
      : `Rule ${s.ruleIndex} on conduit ${s.conduitId} can never match: ${s.byRuleIndex ? `rule ${s.byRuleIndex} above it already matches` : 'earlier rules above it already match'} all of its traffic. Move it up, or narrow the earlier rule.`;
    items.push({ kind: 'info', code: s.kind, text });
  }
  return items;
}

/** One-line announcement for the live region (contracts/ui.md). */
export function announcement(result, round) {
  if (result.status === 'invalid-input') return inputGuidance(result.inputErrors[0]);
  if (result.status === 'correct') return `Round ${round.id}: correct.`;
  const n = result.failures.length;
  const names = result.failures.map(f => CODE_TITLES[f.code].toLowerCase()).join(', ');
  return `Round ${round.id}: not yet — ${n} problem${n === 1 ? '' : 's'}: ${names}.`;
}

const VERDICT_LABELS = { allowed: 'ALLOW', denied: 'DENY', 'in-session': 'IN-SESSION', 'no-session': 'NO SESSION', 'out-of-reach': 'OUT OF REACH' };

/** Wave log line (contracts/ui.md format). */
export function logLine(board, round, packetResult) {
  const index = round.wave.findIndex(p => p.id === packetResult.packetId);
  const packet = round.wave[index];
  const num = n => `#${n + 1}`;
  let tail;
  switch (packetResult.verdict) {
    case 'allowed':
    case 'denied': {
      const hops = packetResult.hops || [];
      tail = hops.length > 1
        ? hops.map(h => `${h.action === 'permit' ? 'passed' : 'stopped at'} conduit ${h.conduitId} · ${ruleText(h.ruleIndex)}`).join('; ')
        : `at conduit ${packetResult.conduitId} · ${ruleText(packetResult.ruleIndex)}`;
      break;
    }
    case 'in-session':
      tail = `· reply inside connection ${num(round.wave.findIndex(p => p.id === packet.parent))}`;
      break;
    case 'no-session':
      tail = `· connection ${num(round.wave.findIndex(p => p.id === packet.parent))} was never allowed`;
      break;
    case 'out-of-reach': {
      if (packet.limit === 'intra-zone') {
        const zoneId = zoneOf(board, packet.flow.src);
        const zone = board.zones.find(z => z.id === zoneId);
        tail = `· stays inside ${zone ? zone.name : 'one zone'}`;
      } else {
        const real = packet.actualSrc ? ` (really sent by ${endpointLabel(board, packet.actualSrc)})` : '';
        tail = `· forged source${real}, passed conduit ${packetResult.conduitId} via ${ruleText(packetResult.ruleIndex)}`;
      }
      break;
    }
    default:
      tail = '';
  }
  const label = packet.label ? ` — ${packet.label}` : '';
  return `${num(index)} ${VERDICT_LABELS[packetResult.verdict]}  ${describeFlow(board, packet.flow)}  ${tail}${label}`;
}
