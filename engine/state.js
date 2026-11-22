// Pure session reducer (data-model.md Session state). No DOM, timers or storage.

export function initialState() {
  return { view: 'loading', levelIndex: 0, roundIndex: 0, rulesByConduit: {}, carriedFrom: null, lastResult: null, rounds: {}, errors: null, confirmRestart: false };
}

function roundAt(content, state) {
  const level = content.levels[state.levelIndex];
  return level ? level.rounds[state.roundIndex] || null : null;
}

function emptyRules(content, levelIndex) {
  const board = content.boardsById[content.levels[levelIndex].boardId];
  return Object.fromEntries(board.conduits.map(c => [c.id, []]));
}

const copyRule = r => ({ ...r, ...(Array.isArray(r.fcs) ? { fcs: [...r.fcs] } : {}) });

function findRoundById(content, roundId) {
  for (const level of content.levels) {
    const round = (level.rounds || []).find(r => r.id === roundId);
    if (round) return { level, round };
  }
  return null;
}

function endpointUsable(selector, board, availableAssets) {
  if (!selector || selector === 'any') return true;
  const [kind, id] = selector.split(':');
  if (kind === 'zone') return board.zones.some(z => z.id === id);
  if (kind === 'asset') return availableAssets.includes(id);
  return false;
}

/**
 * Rules a round opens with (rounds build on each other).
 * A round the player already solved reopens with their solved rules. Otherwise, with carryOver, it opens with the
 * player's solved rules from the earlier round, or that round's reference solution if they skipped it via level select.
 * @returns {{ rules: Object<string, RuleCard[]>, origin: 'empty'|'own'|'player'|'reference', fromRoundId: string|null }}
 */
export function startingRules(content, rounds, levelIndex, roundIndex) {
  const rules = emptyRules(content, levelIndex);
  const level = content.levels[levelIndex];
  const round = level.rounds[roundIndex];
  const board = content.boardsById[level.boardId];
  const own = rounds[round.id] && rounds[round.id].solvedRules;
  if (own) {
    for (const cid of Object.keys(rules)) rules[cid] = (own[cid] || []).map(copyRule);
    return { rules, origin: 'own', fromRoundId: round.id };
  }
  const carry = round.carryOver;
  if (!carry) return { rules, origin: 'empty', fromRoundId: null };
  const from = findRoundById(content, carry.from);
  const solved = rounds[carry.from] && rounds[carry.from].solvedRules;
  const source = solved || (from && from.round.solution) || {};
  const map = carry.conduitMap || {};
  const available = round.availableAssets || [];
  for (const [cid, list] of Object.entries(source)) {
    const target = map[cid] || cid;
    if (!rules[target]) continue;
    for (const r of list) if (endpointUsable(r.src, board, available) && endpointUsable(r.dst, board, available)) rules[target].push(copyRule(r));
  }
  for (const [cid, list] of Object.entries(carry.add || {})) if (rules[cid]) rules[cid].push(...list.map(copyRule));
  return { rules, origin: solved ? 'player' : 'reference', fromRoundId: carry.from };
}

function enterRound(state, content, levelIndex, roundIndex) {
  const start = startingRules(content, state.rounds, levelIndex, roundIndex);
  return { ...state, view: 'round', levelIndex, roundIndex, rulesByConduit: start.rules, carriedFrom: { origin: start.origin, roundId: start.fromRoundId }, lastResult: null };
}

export function roundRecord(state, roundId) {
  return state.rounds[roundId] || { completed: false, attempts: 0, helpTier: 0 };
}

export function canNext(state, content) {
  if (state.view !== 'round') return false;
  const round = roundAt(content, state);
  return Boolean(round && state.rounds[round.id] && state.rounds[round.id].completed);
}

export function reduce(state, action, content) {
  switch (action.type) {
    case 'loaded':
      return { ...initialState(), view: 'select' };

    // Level select (any level may be chosen; rounds inside a level still open in order).
    case 'chooseLevel':
      if (!['select', 'briefing', 'summary'].includes(state.view) || !content.levels[action.levelIndex]) return state;
      return { ...state, view: 'briefing', levelIndex: action.levelIndex, roundIndex: 0, rulesByConduit: {}, carriedFrom: null, lastResult: null };

    case 'showSummary':
      if (state.view !== 'select') return state;
      return { ...state, view: 'summary' };

    case 'showLevels':
      if (state.view === 'loading' || state.view === 'content-error') return state;
      return { ...state, view: 'select', rulesByConduit: {}, carriedFrom: null, lastResult: null };

    case 'failed':
      return { ...state, view: 'content-error', errors: action.errors };

    case 'start':
      if (state.view !== 'briefing') return state;
      return enterRound(state, content, state.levelIndex, 0);

    case 'editRules':
      if (state.view !== 'round') return state;
      return { ...state, rulesByConduit: { ...state.rulesByConduit, [action.conduitId]: action.rules } };

    case 'runWave': {
      if (state.view !== 'round') return state;
      const round = roundAt(content, state);
      const result = action.result;
      // Invalid input and content errors never count as attempts (FR-022).
      if (result.status === 'invalid-input' || result.status === 'content-error') return { ...state, lastResult: result };
      const rec = roundRecord(state, round.id);
      // After success the wave may replay, but counters never change (US2-2).
      if (rec.completed) return { ...state, lastResult: result };
      const completed = result.status === 'correct';
      const next = { ...rec, attempts: rec.attempts + 1, completed,
        ...(completed ? { solvedRules: Object.fromEntries(Object.entries(state.rulesByConduit).map(([k, v]) => [k, v.map(copyRule)])) } : {}) };
      return { ...state, lastResult: result, rounds: { ...state.rounds, [round.id]: next } };
    }

    case 'next': {
      if (!canNext(state, content)) return state;
      const level = content.levels[state.levelIndex];
      if (state.roundIndex + 1 < level.rounds.length) {
        return enterRound(state, content, state.levelIndex, state.roundIndex + 1);
      }
      if (state.levelIndex + 1 < content.levels.length) {
        return { ...state, view: 'briefing', levelIndex: state.levelIndex + 1, roundIndex: 0, rulesByConduit: {}, carriedFrom: null, lastResult: null };
      }
      return { ...state, view: 'summary', rulesByConduit: {}, carriedFrom: null, lastResult: null };
    }

    // Help tiers 1–3 (method, worked step, solution) are recorded as assistance; they never complete a round (FR-021).
    case 'help': {
      if (state.view !== 'round' || ![1, 2, 3].includes(action.tier)) return state;
      const round = roundAt(content, state);
      const rec = roundRecord(state, round.id);
      if (action.tier <= rec.helpTier) return state;
      return { ...state, rounds: { ...state.rounds, [round.id]: { ...rec, helpTier: action.tier } } };
    }

    // Restart needs confirmation; Cancel changes nothing (FR-025).
    case 'requestRestart':
      if (state.view === 'loading' || state.view === 'content-error') return state;
      return { ...state, confirmRestart: true };

    case 'cancelRestart':
      return state.confirmRestart ? { ...state, confirmRestart: false } : state;

    case 'confirmRestart':
      if (!state.confirmRestart) return state;
      return { ...initialState(), view: 'select' };

    default:
      return state;
  }
}
