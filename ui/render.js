// Views: briefing, round, summary, content error (contracts/ui.md). Focus moves to each view's heading.
import { renderBoard } from './board.js';
import { createEditor } from './editor.js';
import { renderLog, animate } from './wave.js';
import { explain, announcement, describeFlow, inputGuidance } from '../engine/feedback.js';
import { expandTicket } from '../engine/content.js';
import { FC_HEX, assetById } from '../engine/flows.js';
import { icon } from './icons.js';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children) if (c) node.append(c);
  return node;
}

export function announce(text) {
  const live = document.getElementById('announcer');
  live.textContent = '';
  // Clear, then set after a tick so repeated identical messages are re-announced.
  // setTimeout (not requestAnimationFrame) so it still fires in background tabs.
  setTimeout(() => { live.textContent = text; }, 50);
}

function focusHeading(root) {
  const h = root.querySelector('h2');
  if (h) h.focus();
}

function sourceList(sourceIds, sourcesById) {
  return el('ul', { class: 'sources' }, ...sourceIds.map(id => {
    const s = sourcesById[id];
    if (!s) return null;
    const title = s.url ? el('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.title }) : el('span', { text: s.title });
    return el('li', {}, title, ` — ${s.section}${s.verified ? '' : ' (section not yet verified)'}: ${s.claim}`);
  }));
}

/** Level select: every level with what it teaches and the session's progress in it. */
export function renderSelect(root, content, state, onChoose, onSummary) {
  const done = content.levels.flatMap(l => l.rounds).filter(r => state.rounds[r.id] && state.rounds[r.id].completed).length;
  const total = content.levels.reduce((n, l) => n + l.rounds.length, 0);
  const cards = content.levels.map((level, i) => {
    const solved = level.rounds.filter(r => state.rounds[r.id] && state.rounds[r.id].completed).length;
    const btn = el('button', { type: 'button', class: i === 0 && !done ? 'primary' : '', text: solved === level.rounds.length ? `Replay Level ${i + 1}` : `Play Level ${i + 1}` });
    btn.setAttribute('aria-label', `${btn.textContent}: ${level.title}`);
    btn.addEventListener('click', () => onChoose(i));
    return el('li', { class: `level-card${solved === level.rounds.length ? ' complete' : ''}` },
      el('p', { class: 'level-num', text: `Level ${i + 1}` }),
      el('h3', { text: level.title }),
      el('p', { class: 'level-teaches', text: level.teaches }),
      el('p', { class: 'muted level-progress', text: `${solved} of ${level.rounds.length} rounds complete${solved === level.rounds.length ? ' ✓' : ''}` }),
      btn);
  });
  const summaryBtn = done ? el('button', { type: 'button', text: 'Session summary' }) : null;
  if (summaryBtn) summaryBtn.addEventListener('click', onSummary);
  root.replaceChildren(el('section', { class: 'select', 'aria-labelledby': 'select-h' },
    el('div', { class: 'hero panel' },
      el('p', { class: 'kicker' }, icon('bolt', 'kicker-icon'), 'Prairie Ridge Electric Cooperative · SCADA network operations'),
      el('h2', { id: 'select-h', tabindex: '-1', text: 'Keep the lights on' }),
      el('p', { class: 'hero-lede', text: 'Behind every light switch is a substation, and behind every substation is a SCADA network that can open breakers miles away. You write the conduit firewall rules that decide who may talk to that network, and what they may tell it to do.' }),
      el('p', { class: 'muted', text: `Choose a level. Rounds inside a level open in order, and each round starts with the rules from the round before it. ${done} of ${total} rounds complete this session.` }),
      el('p', { class: 'muted fiction-note', text: 'Prairie Ridge, Cedar Creek and their people are fictional. The networking rules are not.' })),
    el('ol', { class: 'level-grid' }, ...cards),
    summaryBtn));
  focusHeading(root);
}

export function renderBriefing(root, level, content, onStart) {
  const b = level.briefing;
  const start = el('button', { type: 'button', class: 'primary', text: 'Start' });
  start.addEventListener('click', onStart);
  root.replaceChildren(el('section', { class: 'panel briefing', 'aria-labelledby': 'briefing-h' },
    el('p', { class: 'muted', text: `Level ${level.id.slice(1)} briefing` }),
    el('h2', { id: 'briefing-h', tabindex: '-1', text: level.title }),
    el('blockquote', { class: 'story' }, icon('bolt', 'story-icon'), el('p', { text: level.story })),
    el('p', { class: 'teaches' }, el('strong', { text: 'You will learn: ' }), level.teaches),
    ...b.paragraphs.map(p => el('p', { text: p })),
    el('h3', { text: 'Worked example' }),
    el('p', { text: b.workedExample }),
    el('h3', { text: 'What this game simplifies' }),
    el('ul', {}, ...b.simplifications.map(s => el('li', { text: s }))),
    el('h3', { text: 'Sources' }),
    sourceList(b.sourceIds, content.sourcesById),
    start));
  focusHeading(root);
}

function assetChip(board, id) {
  const a = assetById(board, id);
  if (!a) return el('span', { class: 'asset-chip', text: id });
  return el('span', { class: `asset-chip role-${a.role}` }, icon(a.role, 'chip-icon'),
    el('strong', { text: a.id }), el('span', { class: 'asset-name', text: a.name }),
    el('span', { class: 'cell-tag', title: `Grid cell ${a.cell}`, text: a.cell }));
}

/** One ticket line: source chip → destination chip, then the service or each function code as its own tag. */
function flowRow(board, line, isNew) {
  const fcs = line.variant === 'dnp3' ? (line.fcs ?? (line.fc ? [line.fc] : [])) : [];
  const service = line.variant === 'dnp3'
    ? el('span', { class: 'service-tags' }, el('span', { class: 'svc', text: 'DNP3' }), ...fcs.map(fc => el('span', { class: 'fc-tag' }, fc, el('small', { text: FC_HEX[fc] }))))
    : el('span', { class: 'service-tags' }, el('span', { class: 'svc', text: line.variant === 'non-dnp3-20000' ? 'non-DNP3 on tcp/20000' : 'other TCP' }));
  const text = `${line.src} to ${line.dst}, ${line.variant === 'dnp3' ? `DNP3 ${fcs.join(', ')}` : line.variant}${isNew ? ', new in this round' : ''}`;
  return el('li', { class: 'flow-row', 'aria-label': text },
    el('span', { class: 'flow-ends', 'aria-hidden': 'true' }, assetChip(board, line.src), el('span', { class: 'flow-arrow', text: '→' }), assetChip(board, line.dst)),
    el('span', { 'aria-hidden': 'true', class: 'flow-service' }, service, isNew ? el('span', { class: 'new-tag', text: 'NEW' }) : null));
}

/** A ticket line is new if the round it carries over from had no line with the same ends and at least these codes. */
function isNewLine(ctx, line) {
  const from = ctx.round.carryOver && ctx.allRounds && ctx.allRounds.find(r => r.id === ctx.round.carryOver.from);
  if (!from) return false;
  const want = line.variant === 'dnp3' ? (line.fcs || []) : [];
  return !from.required.some(r => r.src === line.src && r.dst === line.dst && r.variant === line.variant
    && want.every(fc => (r.fcs || []).includes(fc)));
}

function carryNotice(carried) {
  if (!carried || !carried.roundId || carried.origin === 'empty') return null;
  const text = carried.origin === 'own'
    ? `You solved this round before, so your solved rules are back on the conduit.`
    : carried.origin === 'player'
      ? `Your rules from Round ${carried.roundId} are already on the conduit. Change only what this work order needs.`
      : `You skipped Round ${carried.roundId}, so its reference rules are on the conduit. Change only what this work order needs.`;
  return el('p', { class: 'carry-note' }, el('span', { class: 'carry-icon', 'aria-hidden': 'true', text: '⤵' }), text);
}

const STAKES = {
  correct: 'Cedar Creek is secure. The feeders stay energized and every poll gets through.',
  'required-blocked': 'The operators are blind: traffic the work order needs cannot get through.',
  'wrong-conduit': 'A required flow dies part-way along its path.',
  'attack-allowed': 'Traffic that should never reach the substation got through.',
  'over-permissive': 'The conduit is wider than the work order: there are openings no one asked for.',
};

/** Mounts the round view once; returns { update(state) } for in-place updates. */
export function mountRound(root, ctx, state, handlers) {
  const { level, round, board, sltOverrides } = ctx;
  const required = expandTicket(round);

  const editor = createEditor({
    board, availableAssets: round.availableAssets, sltOverrides, initial: state.rulesByConduit,
    onChange: (conduitId, rules) => handlers.onRulesChange(conduitId, rules),
  });

  const runBtn = el('button', { type: 'button', class: 'primary', text: 'Run Wave' });
  const nextBtn = el('button', { type: 'button', text: 'Next', disabled: true });
  const attemptsEl = el('span', { class: 'muted' });
  const status = el('p', { class: 'result-status guidance', text: 'Build your rules, then press Run Wave.' });
  const stakes = el('p', { class: 'stakes', hidden: true });
  const feedbackList = el('ul', { class: 'feedback-list' });
  const log = el('ol', { class: 'wave-log', 'aria-labelledby': 'log-h', tabindex: '0' });
  const resultPanel = el('section', { class: 'panel result', 'aria-labelledby': 'result-h' },
    el('h3', { id: 'result-h', text: 'Result' }), status, stakes, feedbackList,
    el('div', { class: 'next-row' }, nextBtn, el('span', { class: 'muted next-hint', text: 'Next unlocks when the round is graded correct.' })));
  const logPanel = el('section', { class: 'panel', 'aria-labelledby': 'log-h' },
    el('h3', { id: 'log-h', text: 'Wave log' }), log);

  // Help tiers (FR-021): method → worked step → read-only reference rules. Never touches the rule list.
  const helpBtn = el('button', { type: 'button', 'aria-controls': 'help-panel' });
  const helpList = el('ol', { class: 'help-list' });
  const helpPanel = el('section', { class: 'panel help', id: 'help-panel', 'aria-labelledby': 'help-h', hidden: true },
    el('h3', { id: 'help-h', text: 'Help' }), helpList,
    el('p', { class: 'muted', text: 'Help is recorded in the session summary. It never completes a round.' }));
  let shownTier = 0;
  helpBtn.addEventListener('click', () => {
    const next = Math.min(3, shownTier + 1);
    handlers.onHelp(next);
    announce(`Hint ${next} of 3 shown.`);
    const newest = helpList.lastElementChild;
    if (newest) newest.focus();
  });

  runBtn.addEventListener('click', async () => {
    const result = handlers.onRunWave();
    if (result.status === 'invalid-input') {
      editor.showErrors(result.inputErrors, inputGuidance);
      const first = editor.firstErrorField(result.inputErrors);
      editor.focusField(first.conduitId, first.ruleIndex, first.field);
    } else {
      editor.clearErrors();
      editor.showNotes(result.shadowed, explain({ ...result, failures: [], status: 'incorrect' }, round, board).filter(i => i.kind === 'info'));
    }
    // Announce first; the animation is decorative and never gates feedback or controls.
    announce(announcement(result, round));
    if (result.status !== 'invalid-input') animate(root.querySelector('.board'), board, round, result);
  });
  nextBtn.addEventListener('click', handlers.onNext);

  root.replaceChildren(el('section', { class: 'round', 'aria-labelledby': 'round-h' },
    el('p', { class: 'muted', text: `Level ${level.id.slice(1)} · ${level.title}` }),
    el('h2', { id: 'round-h', tabindex: '-1', text: `Round ${round.id} · ${round.title}` }),
    el('section', { class: 'panel ticket', 'aria-labelledby': 'ticket-h' },
      el('h3', { id: 'ticket-h', text: 'Work order' }),
      el('p', { text: round.ticketText }),
      carryNotice(state.carriedFrom),
      el('p', { class: 'flows-intro', text: 'Required flows (everything else must be denied):' }),
      el('ul', { class: 'flow-list' }, ...round.required.map(r => flowRow(board, r, isNewLine(ctx, r))))),
    el('div', { class: 'round-layout' },
      el('div', { class: 'col-board panel' }, el('h3', { class: 'visually-hidden', text: 'Board' }), renderBoard(board, round.availableAssets, sltOverrides)),
      el('div', { class: 'col-rules' },
        editor.element,
        el('div', { class: 'action-bar' }, runBtn, helpBtn, attemptsEl),
        helpPanel,
        resultPanel,
        logPanel))));
  focusHeading(root);

  function renderHelp(tier) {
    shownTier = tier;
    helpPanel.hidden = tier === 0;
    helpBtn.textContent = tier === 0 ? 'Help' : tier < 3 ? `Next hint (${tier + 1} of 3)` : 'All help shown';
    helpBtn.disabled = tier >= 3;
    helpList.replaceChildren(...round.hints.slice(0, tier).map((text, i) =>
      el('li', { tabindex: '-1' }, text))); // hint text carries its own label ("Method: …")
  }

  function update(s) {
    const rec = s.rounds[round.id] || { attempts: 0, completed: false, helpTier: 0 };
    if ((rec.helpTier || 0) !== shownTier) renderHelp(rec.helpTier || 0);
    attemptsEl.textContent = `Attempts: ${rec.attempts}${rec.completed ? ' · completed' : ''}`;
    nextBtn.disabled = !rec.completed;
    const hint = resultPanel.querySelector('.next-hint');
    if (hint) hint.hidden = rec.completed;
    const r = s.lastResult;
    if (!r) return;
    const labels = { correct: 'Correct', incorrect: `Not yet — ${r.failures.length} problem${r.failures.length === 1 ? '' : 's'}`, 'invalid-input': 'Check your rule cards' };
    status.textContent = r.status === 'correct' ? '✓ Correct' : r.status === 'incorrect' ? `✗ ${labels.incorrect}` : `! ${labels['invalid-input']}`;
    status.className = `result-status ${r.status === 'correct' ? 'correct' : r.status === 'incorrect' ? 'incorrect' : 'guidance'}`;
    const stakeText = r.status === 'correct' ? STAKES.correct : r.status === 'incorrect' ? r.failures.map(f => STAKES[f.code]).filter(Boolean).join(' ') : '';
    stakes.hidden = !stakeText;
    stakes.textContent = stakeText;
    stakes.className = `stakes ${r.status}`;
    feedbackList.replaceChildren(...explain(r, round, board).map(item => {
      const li = el('li', { class: item.kind === 'info' || item.kind === 'limit' ? item.kind : '' });
      if (item.kind === 'limit') {
        // Neutral styling and wording: never presented as the player's failure (US4).
        li.append(el('span', { class: 'limit-title', text: `◌ ${item.title}: ` }), item.text);
        const cites = (item.sourceIds || []).map(id => ctx.sourcesById && ctx.sourcesById[id]).filter(Boolean);
        if (cites.length) {
          li.append(el('span', { class: 'cite' }, ' Source: ', ...cites.flatMap((src, k) => [k ? '; ' : '',
            src.url ? el('a', { href: src.url, target: '_blank', rel: 'noopener', text: src.title }) : src.title,
            ` — ${src.section}${src.verified ? '' : ' (section not yet verified)'}`])));
        }
        return li;
      }
      if (item.title) li.append(el('span', { class: 'code', text: `${item.title}: ` }));
      li.append(item.kind === 'info' ? `Note: ${item.text}` : item.text);
      return li;
    }));
    if (r.status === 'invalid-input') log.replaceChildren();
    else renderLog(log, board, round, r);
  }
  renderHelp((state.rounds[round.id] || {}).helpTier || 0);
  update(state);
  return { update };
}

const HELP_LABELS = ['None', 'Method hint', 'Worked step', 'Solution viewed'];

export function renderSummary(root, content, state, onLevels) {
  const back = el('button', { type: 'button', class: 'primary', text: 'Back to levels' });
  back.addEventListener('click', onLevels);
  const rows = content.levels.flatMap(l => l.rounds.map(r => {
    const rec = state.rounds[r.id] || { completed: false, attempts: 0, helpTier: 0 };
    return el('tr', {}, el('th', { scope: 'row', text: `${r.id} ${r.title}` }), el('td', { text: rec.completed ? 'Yes' : 'No' }),
      el('td', { text: String(rec.attempts) }), el('td', { text: HELP_LABELS[rec.helpTier || 0] }));
  }));
  root.replaceChildren(el('section', { class: 'panel', 'aria-labelledby': 'summary-h' },
    el('h2', { id: 'summary-h', tabindex: '-1', text: 'Session summary' }),
    el('table', {}, el('thead', {}, el('tr', {}, el('th', { text: 'Round' }), el('th', { text: 'Completed' }), el('th', { text: 'Valid attempts' }), el('th', { text: 'Help used' }))), el('tbody', {}, ...rows)),
    el('p', { class: 'muted', text: 'Completion shows you solved each round; it is not proof of independent mastery. Use Restart to play again.' }),
    back));
  focusHeading(root);
}

export function renderContentError(root, errors, onRetry) {
  const retry = el('button', { type: 'button', text: 'Retry' });
  retry.addEventListener('click', onRetry);
  root.replaceChildren(el('section', { class: 'panel', 'aria-labelledby': 'error-h' },
    el('h2', { id: 'error-h', tabindex: '-1', text: 'Content unavailable' }),
    el('p', { text: 'The game content has errors, so the game will not start and nothing will be graded. Each unavailable level or round is listed below.' }),
    el('ul', {}, ...errors.map(e => el('li', { text: `${e.roundId ? `Round ${e.roundId} unavailable` : e.levelId ? `Level ${e.levelId} unavailable` : 'Content'}: ${e.code} — ${e.detail}` }))),
    retry));
  focusHeading(root);
}
