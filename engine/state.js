// Pure session reducer (data-model.md Session state). No DOM, timers or storage.

export function initialState() {
  return { view: 'loading', levelIndex: 0, roundIndex: 0, rulesByConduit: {}, lastResult: null, rounds: {}, errors: null, confirmRestart: false };
}

function roundAt(content, state) {
  const level = content.levels[state.levelIndex];
  return level ? level.rounds[state.roundIndex] || null : null;
}

function emptyRules(content, levelIndex) {
  const board = content.boardsById[content.levels[levelIndex].boardId];
  return Object.fromEntries(board.conduits.map(c => [c.id, []]));
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
      return { ...initialState(), view: 'briefing' };

    case 'failed':
      return { ...state, view: 'content-error', errors: action.errors };

    case 'start':
      if (state.view !== 'briefing') return state;
      return { ...state, view: 'round', roundIndex: 0, rulesByConduit: emptyRules(content, state.levelIndex), lastResult: null };

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
      const next = { ...rec, attempts: rec.attempts + 1, completed: result.status === 'correct' };
      return { ...state, lastResult: result, rounds: { ...state.rounds, [round.id]: next } };
    }

    case 'next': {
      if (!canNext(state, content)) return state;
      const level = content.levels[state.levelIndex];
      if (state.roundIndex + 1 < level.rounds.length) {
        return { ...state, roundIndex: state.roundIndex + 1, rulesByConduit: emptyRules(content, state.levelIndex), lastResult: null };
      }
      if (state.levelIndex + 1 < content.levels.length) {
        return { ...state, view: 'briefing', levelIndex: state.levelIndex + 1, roundIndex: 0, rulesByConduit: {}, lastResult: null };
      }
      return { ...state, view: 'summary', rulesByConduit: {}, lastResult: null };
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
      return { ...initialState(), view: 'briefing' };

    default:
      return state;
  }
}
