// Pure content helpers and validation (data-model.md, contracts/evaluator.md validateContent).
import { FCS, VARIANTS, zoneOfCell, conduitPath, flowKey } from './flows.js';

const CELL = /^[A-H][1-8]$/;
const ROLES = ['master', 'hmi', 'outstation', 'engineering', 'vendor', 'rogue'];
const IN_SESSION_FCS = ['RESPONSE', 'UNSOLICITED_RESPONSE'];

function duplicates(ids) {
  const seen = new Set();
  return ids.filter(id => (seen.has(id) ? true : (seen.add(id), false)));
}

/**
 * Validate the whole content document before play (FR-005, Principle VI).
 * @returns {{ ok: true, errors: [] } | { ok: false, errors: {levelId, roundId, code, detail}[] }}
 */
export function validateContent(doc) {
  const errors = [];
  const err = (code, detail, levelId = null, roundId = null) => errors.push({ levelId, roundId, code, detail });

  // Content.schemaVersion, sources, boards, levels
  if (!doc || typeof doc !== 'object') { err('schema', 'content is not an object'); return { ok: false, errors }; }
  if (doc.schemaVersion !== 1) err('schema', `schemaVersion must be 1, got ${doc.schemaVersion}`);
  for (const key of ['sources', 'boards', 'levels']) {
    if (!Array.isArray(doc[key]) || !doc[key].length) err('schema', `${key} must be a non-empty array`);
  }
  if (errors.length) return { ok: false, errors };

  // Source.id
  for (const id of duplicates(doc.sources.map(s => s.id))) err('duplicate-id', `source id "${id}" is used twice`);
  const sourceIds = new Set(doc.sources.map(s => s.id));
  const checkSources = (ids, levelId, roundId) => {
    if (!Array.isArray(ids) || !ids.length) { err('schema', 'sourceIds must be a non-empty array', levelId, roundId); return; }
    for (const id of ids) if (!sourceIds.has(id)) err('unknown-source', `source "${id}" is not defined`, levelId, roundId);
  };

  // Boards: Board.id, Board.zones, Zone.cells, Zone.slt, Board.assets, Asset.id, Asset.cell, Board.conduits, Conduit.cell, Conduit.joins
  for (const id of duplicates(doc.boards.map(b => b.id))) err('duplicate-id', `board id "${id}" is used twice`);
  const boardOk = new Map();
  for (const board of doc.boards) {
    const before = errors.length;
    const where = `board ${board.id}`;
    const zones = board.zones || [];
    if (zones.length < 2) err('schema', `${where}: needs at least two zones`);
    for (const id of duplicates(zones.map(z => z.id))) err('duplicate-id', `${where}: zone id "${id}" is used twice`);
    const owner = new Map();
    for (const z of zones) {
      if (![1, 2, 3].includes(z.slt)) err('schema', `${where}: zone ${z.id} SL-T must be 1–3`);
      for (const cell of z.cells || []) {
        if (!CELL.test(cell)) err('schema', `${where}: zone ${z.id} has invalid cell ${cell}`);
        if (owner.has(cell)) err('zone-overlap', `${where}: cell ${cell} is in zones ${owner.get(cell)} and ${z.id}`);
        else owner.set(cell, z.id);
      }
    }
    for (const id of duplicates((board.assets || []).map(a => a.id))) err('duplicate-id', `${where}: asset id "${id}" is used twice`);
    for (const a of board.assets || []) {
      if (!ROLES.includes(a.role)) err('schema', `${where}: asset ${a.id} has unknown role ${a.role}`);
      if (!CELL.test(a.cell || '')) err('asset-off-board', `${where}: asset ${a.id} cell ${a.cell} is not on the 8×8 board`);
      else if (!owner.has(a.cell)) err('asset-outside-zone', `${where}: asset ${a.id} at ${a.cell} is not inside any zone`);
    }
    const zoneIds = new Set(zones.map(z => z.id));
    for (const id of duplicates((board.conduits || []).map(c => c.id))) err('duplicate-id', `${where}: conduit id "${id}" is used twice`);
    for (const c of board.conduits || []) {
      if (!CELL.test(c.cell || '')) err('schema', `${where}: conduit ${c.id} cell ${c.cell} is not on the board`);
      else if (owner.has(c.cell)) err('conduit-in-zone', `${where}: conduit ${c.id} at ${c.cell} sits inside zone ${owner.get(c.cell)}`);
      const j = c.joins || [];
      if (j.length !== 2 || j[0] === j[1] || !zoneIds.has(j[0]) || !zoneIds.has(j[1])) {
        err('conduit-joins', `${where}: conduit ${c.id} must join exactly two different existing zones`);
      }
    }
    // Zone graph must be connected and acyclic: exactly one path between any two zones.
    if (errors.length === before) {
      const connected = zones.every(z => conduitPath(board, zones[0].id, z.id) !== null);
      if (!connected || board.conduits.length !== zones.length - 1) {
        err('zone-graph', `${where}: zones must be connected by conduits with exactly one path between any two zones`);
      }
    }
    boardOk.set(board.id, errors.length === before);
  }
  const boardsById = new Map(doc.boards.map(b => [b.id, b]));

  // Levels: Level.id, Level.rounds, Round.id
  for (const id of duplicates(doc.levels.map(l => l.id))) err('duplicate-id', `level id "${id}" is used twice`);
  for (const id of duplicates(doc.levels.flatMap(l => (l.rounds || []).map(r => r.id)))) err('duplicate-id', `round id "${id}" is used twice`);

  for (const level of doc.levels) {
    const board = boardsById.get(level.boardId);
    if (!board) { err('schema', `unknown board "${level.boardId}"`, level.id); continue; }
    if (!boardOk.get(board.id)) continue; // board errors already reported
    if (!Array.isArray(level.rounds) || !level.rounds.length) { err('schema', 'level needs at least one round', level.id); continue; }
    const slt = { ...Object.fromEntries(board.zones.map(z => [z.id, z.slt])), ...(level.sltOverrides || {}) };
    for (const [zoneId, value] of Object.entries(level.sltOverrides || {})) {
      if (!board.zones.some(z => z.id === zoneId) || ![1, 2, 3].includes(value)) err('schema', `bad sltOverrides entry ${zoneId}`, level.id);
    }
    const b = level.briefing || {};
    if (!Array.isArray(b.paragraphs) || !b.paragraphs.length || !b.workedExample || !Array.isArray(b.simplifications)) {
      err('schema', 'briefing needs paragraphs, workedExample and simplifications', level.id);
    }
    checkSources(b.sourceIds, level.id, null);
    checkSources(level.sourceIds, level.id, null);
    const conduitSlt = Object.fromEntries(board.conduits.map(c => [c.id, Math.max(slt[c.joins[0]], slt[c.joins[1]])]));
    const assetZone = id => { const a = board.assets.find(x => x.id === id); return a ? zoneOfCell(board, a.cell) : null; };

    for (const round of level.rounds) {
      const E = (code, detail) => err(code, detail, level.id, round.id);
      const available = new Set(round.availableAssets || []);
      for (const id of available) if (!board.assets.some(a => a.id === id)) E('unknown-asset', `available asset "${id}" is not on the board`);
      const known = id => available.has(id) && assetZone(id);
      if (!round.ticketText || !round.title) E('schema', 'round needs a title and ticketText');

      // Round.required
      if (!Array.isArray(round.required) || !round.required.length) E('schema', 'round needs at least one required flow');
      const required = [];
      for (const r of round.required || []) {
        if (!known(r.src) || !known(r.dst)) { E('unknown-asset', `required flow ${r.src} → ${r.dst} uses an asset not available in this round`); continue; }
        if (!VARIANTS.includes(r.variant)) { E('schema', `required flow has unknown variant ${r.variant}`); continue; }
        if (assetZone(r.src) === assetZone(r.dst)) { E('same-zone-required', `required flow ${r.src} → ${r.dst} stays inside one zone`); continue; }
        const path = conduitPath(board, assetZone(r.src), assetZone(r.dst));
        if (path.some(cid => conduitSlt[cid] >= 3) && (r.variant !== 'dnp3' || !(r.fcs || []).length)) {
          E('slt-ticket', `required flow ${r.src} → ${r.dst} crosses an SL-T 3 conduit without naming DNP3 function codes`);
        }
        if (r.variant === 'dnp3') {
          for (const fc of r.fcs || []) {
            if (!FCS.includes(fc)) E('schema', `unknown function code ${fc}`);
            else required.push(flowKey({ src: r.src, dst: r.dst, variant: 'dnp3', fc }));
          }
        } else required.push(flowKey({ src: r.src, dst: r.dst, variant: r.variant }));
      }

      // Round.wave: WavePacket.id, WavePacket.kind, WavePacket.parent, WavePacket.limit, WavePacket.actualSrc
      if (!Array.isArray(round.wave) || !round.wave.length) E('schema', 'round needs at least one wave packet');
      for (const id of duplicates((round.wave || []).map(p => p.id))) E('duplicate-id', `packet id "${id}" is used twice`);
      const seen = new Map();
      for (const p of round.wave || []) {
        const f = p.flow || {};
        if (!known(f.src) || !known(f.dst)) { E('unknown-asset', `packet ${p.id} uses an asset not available in this round`); seen.set(p.id, p); continue; }
        const sameZone = assetZone(f.src) === assetZone(f.dst);
        if (p.kind === 'in-session') {
          const parent = seen.get(p.parent);
          if (!parent || parent.kind !== 'new' || parent.flow.src !== f.dst || parent.flow.dst !== f.src || !IN_SESSION_FCS.includes(f.fc)) {
            E('bad-parent', `in-session packet ${p.id} must reply on an earlier new connection in the opposite direction with RESPONSE or UNSOLICITED_RESPONSE`);
          }
        } else if (p.kind === 'new' || p.kind === 'limit') {
          if (!VARIANTS.includes(f.variant) || (f.variant === 'dnp3' && !FCS.includes(f.fc))) E('schema', `packet ${p.id} has an invalid service or function code`);
          if (p.kind === 'new' && sameZone) E('schema', `new packet ${p.id} stays inside one zone; mark it as an intra-zone limit packet`);
          if (p.kind === 'limit') {
            if (p.limit === 'intra-zone') {
              if (!sameZone) E('limit-stoppable', `intra-zone packet ${p.id} crosses a conduit, so a rule could stop it`);
            } else if (p.limit === 'spoofed-source') {
              const identical = required.includes(flowKey(f));
              const sameOrigin = known(p.actualSrc) && assetZone(p.actualSrc) === assetZone(f.src);
              if (!identical || !sameOrigin) E('limit-stoppable', `spoofed packet ${p.id} must match a required flow and come from the forged source's zone`);
            } else E('schema', `limit packet ${p.id} needs limit "intra-zone" or "spoofed-source"`);
          }
        } else E('schema', `packet ${p.id} has unknown kind ${p.kind}`);
        if (p.explanation !== undefined && typeof p.explanation !== 'string') E('schema', `packet ${p.id} explanation must be text`);
        if (p.sourceIds !== undefined) checkSources(p.sourceIds, level.id, round.id);
        seen.set(p.id, p);
      }

      // Round.hints, Round.feedback, Round.sourceIds
      if (!Array.isArray(round.hints) || round.hints.length !== 3) E('hint-count', 'round needs exactly 3 hints (method, worked step, solution)');
      if (!round.feedback || !round.feedback.correct) E('schema', 'round needs feedback text, including "correct"');
      checkSources(round.sourceIds, level.id, round.id);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
}

/** Expand ticket entries with fcs[] into one Flow per function code (data-model.md Round.required). */
export function expandTicket(round) {
  const flows = [];
  for (const r of round.required) {
    if (r.variant === 'dnp3') {
      const fcs = r.fcs ?? (r.fc ? [r.fc] : []);
      for (const fc of fcs) flows.push({ src: r.src, dst: r.dst, variant: 'dnp3', fc });
    } else {
      flows.push({ src: r.src, dst: r.dst, variant: r.variant });
    }
  }
  return flows;
}

export function loadContent(doc) {
  return {
    doc,
    levels: doc.levels,
    boardsById: Object.fromEntries(doc.boards.map(b => [b.id, b])),
    sourcesById: Object.fromEntries(doc.sources.map(s => [s.id, s])),
  };
}

export function roundContext(content, levelIndex, roundIndex) {
  const level = content.levels[levelIndex];
  const round = level && level.rounds[roundIndex];
  if (!round) return null;
  return { level, round, board: content.boardsById[level.boardId], sltOverrides: level.sltOverrides || {} };
}

export function findRound(content, roundId) {
  for (let li = 0; li < content.levels.length; li++) {
    const ri = content.levels[li].rounds.findIndex(r => r.id === roundId);
    if (ri >= 0) return roundContext(content, li, ri);
  }
  return null;
}
