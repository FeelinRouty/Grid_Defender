// Wave log (FR-019) and packet animation (FR-029, contracts/ui.md Motion).
// The result panel and log are filled BEFORE animate() runs, so motion never delays feedback.
import { logLine } from '../engine/feedback.js';
import { assetById } from '../engine/flows.js';

const BADGES = {
  allowed: '✓',
  denied: '✕',
  'in-session': '↩',
  'no-session': '⊘',
  'out-of-reach': '◌',
};

export function renderLog(list, board, round, result) {
  list.replaceChildren(...result.packets.map(p => {
    const li = document.createElement('li');
    li.className = p.verdict;
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = `${BADGES[p.verdict] || ''} `;
    li.append(badge, logLine(board, round, p));
    return li;
  }));
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const TOTAL_MS = 3000;
let running = [];

function cancelRunning(layer) {
  for (const a of running) a.cancel();
  running = [];
  if (layer) layer.replaceChildren();
}

function centerOf(boardEl, cellId) {
  const cell = boardEl.querySelector(`[data-cell="${cellId}"]`);
  if (!cell) return null;
  return { x: cell.offsetLeft + cell.offsetWidth / 2, y: cell.offsetTop + cell.offsetHeight / 2 };
}

/** Cells a packet visits: sender → each conduit reached (→ destination if it got through). */
function waypoints(board, round, packetResult) {
  const packet = round.wave.find(w => w.id === packetResult.packetId);
  const senderId = packet.limit === 'spoofed-source' && packet.actualSrc ? packet.actualSrc : packet.flow.src;
  const sender = assetById(board, senderId);
  const dest = assetById(board, packet.flow.dst);
  const conduitCell = id => board.conduits.find(c => c.id === id).cell;
  if (packetResult.verdict === 'in-session' || packetResult.verdict === 'no-session') {
    const reached = packetResult.verdict === 'in-session' ? packetResult.path.map(conduitCell) : [];
    return [sender.cell, ...reached, ...(packetResult.verdict === 'in-session' ? [dest.cell] : [])];
  }
  const hops = packetResult.hops || [];
  const cells = [sender.cell, ...hops.map(h => conduitCell(h.conduitId))];
  const blocked = hops.some(h => h.action !== 'permit');
  if (!blocked || packetResult.verdict === 'out-of-reach') cells.push(dest.cell);
  return cells;
}

/**
 * Animate wave packets as dots moving across the board. Skipped entirely under reduced motion.
 * Never awaited by anything that gates controls; a new wave cancels the previous one.
 */
export function animate(boardEl, board, round, result) {
  const layer = boardEl && boardEl.querySelector('.packet-layer');
  cancelRunning(layer);
  if (!layer || prefersReducedMotion() || result.status === 'invalid-input' || !result.packets.length) return Promise.resolve();

  const n = result.packets.length;
  const slot = Math.min(700, TOTAL_MS / n);
  const finished = [];
  result.packets.forEach((p, i) => {
    const points = waypoints(board, round, p).map(c => centerOf(boardEl, c)).filter(Boolean);
    if (points.length < 2) return;
    const dot = document.createElement('span');
    dot.className = `packet ${p.verdict}`;
    dot.textContent = BADGES[p.verdict] || '';
    layer.append(dot);
    // Every keyframe states opacity explicitly: fade in at the sender, stay visible, fade out at the end.
    const frames = points.map((pt, k) => ({ transform: `translate(${pt.x}px, ${pt.y}px) translate(-50%, -50%)`, opacity: k === 0 ? 0 : 1 }));
    frames.push({ ...frames[frames.length - 1], opacity: 0 });
    const anim = dot.animate(frames, { duration: slot * 1.6, delay: i * slot, easing: 'ease-in-out', fill: 'both' });
    running.push(anim);
    finished.push(anim.finished.then(() => dot.remove(), () => dot.remove()));
  });
  return Promise.all(finished).then(() => undefined);
}
