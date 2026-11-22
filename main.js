// Entry point: load → validate → start. Holds the session state and wires views to the pure engine.
import { loadContent, roundContext, validateContent } from './engine/content.js';
import { evaluateRound } from './engine/rules.js';
import { initialState, reduce } from './engine/state.js';
import { renderBriefing, mountRound, renderSummary, renderContentError } from './ui/render.js';

const root = document.getElementById('app');
let content = null;
let state = initialState();
let viewKey = null;
let roundView = null;

function dispatch(action) {
  state = reduce(state, action, content);
  render();
}

const restartBtn = document.getElementById('restart');
const dialog = document.getElementById('restart-dialog');
restartBtn.addEventListener('click', () => dispatch({ type: 'requestRestart' }));
document.getElementById('restart-cancel').addEventListener('click', () => dispatch({ type: 'cancelRestart' }));
document.getElementById('restart-confirm').addEventListener('click', () => { viewKey = null; dispatch({ type: 'confirmRestart' }); });
dialog.addEventListener('cancel', () => dispatch({ type: 'cancelRestart' })); // Escape key

function syncRestart() {
  restartBtn.disabled = state.view === 'loading' || state.view === 'content-error';
  if (state.confirmRestart && !dialog.open) {
    dialog.showModal();
    document.getElementById('restart-cancel').focus();
  } else if (!state.confirmRestart && dialog.open) {
    dialog.close();
    if (state.view !== 'briefing' || state.levelIndex !== 0 || Object.keys(state.rounds).length) restartBtn.focus();
  }
}

function render() {
  syncRestart();
  const key = `${state.view}:${state.levelIndex}:${state.roundIndex}`;
  if (key === viewKey) {
    if (state.view === 'round' && roundView) roundView.update(state);
    return;
  }
  viewKey = key;
  roundView = null;
  if (state.view === 'briefing') {
    renderBriefing(root, content.levels[state.levelIndex], content, () => dispatch({ type: 'start' }));
  } else if (state.view === 'round') {
    const ctx = { ...roundContext(content, state.levelIndex, state.roundIndex), sourcesById: content.sourcesById };
    roundView = mountRound(root, ctx, state, {
      onRulesChange: (conduitId, rules) => dispatch({ type: 'editRules', conduitId, rules }),
      onRunWave: () => {
        const result = evaluateRound(ctx.round, ctx.board, state.rulesByConduit, ctx.sltOverrides);
        dispatch({ type: 'runWave', result });
        return result;
      },
      onNext: () => dispatch({ type: 'next' }),
      onHelp: tier => dispatch({ type: 'help', tier }),
    });
  } else if (state.view === 'summary') {
    renderSummary(root, content, state);
  } else if (state.view === 'content-error') {
    renderContentError(root, state.errors, boot);
  }
}

async function boot() {
  viewKey = null;
  try {
    const res = await fetch('data/levels.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} loading data/levels.json`);
    const doc = await res.json();
    const check = validateContent(doc);
    if (!check.ok) {
      state = reduce(initialState(), { type: 'failed', errors: check.errors }, null);
      render();
      return;
    }
    content = loadContent(doc);
    state = initialState();
    dispatch({ type: 'loaded' });
  } catch (err) {
    state = reduce(initialState(), { type: 'failed', errors: [{ levelId: null, roundId: null, code: 'load', detail: err.message }] }, content);
    render();
  }
}

boot();
