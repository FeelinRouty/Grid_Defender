// 8×8 visual board (aria-hidden) plus the always-visible Board details text equivalent (FR-001, FR-028).
import { zoneOf, effectiveSlt, zoneSlt } from '../engine/flows.js';

const COLS = 'ABCDEFGH';
const ROLE_LABELS = { master: 'SCADA master', hmi: 'HMI', outstation: 'RTU / outstation', engineering: 'Engineering workstation', vendor: 'Vendor laptop', rogue: 'Rogue device' };

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c) node.append(c);
  return node;
}

/** Short description of a zone's cells: "rows 1–3", "A1–C3", or a list. */
export function summarizeCells(cells) {
  const pos = cells.map(c => ({ c: COLS.indexOf(c[0]), r: Number(c.slice(1)) }));
  const minC = Math.min(...pos.map(p => p.c)), maxC = Math.max(...pos.map(p => p.c));
  const minR = Math.min(...pos.map(p => p.r)), maxR = Math.max(...pos.map(p => p.r));
  if ((maxC - minC + 1) * (maxR - minR + 1) !== cells.length) return cells.join(', ');
  if (minC === 0 && maxC === 7) return minR === maxR ? `row ${minR}` : `rows ${minR}–${maxR}`;
  return `${COLS[minC]}${minR}–${COLS[maxC]}${maxR}`;
}

function table(caption, headers, rows) {
  return el('table', {},
    el('caption', { text: caption }),
    el('thead', {}, el('tr', {}, ...headers.map(h => el('th', { scope: 'col', text: h })))),
    el('tbody', {}, ...rows.map(r => el('tr', {}, ...r.map((v, i) => (i === 0 ? el('th', { scope: 'row', text: v }) : el('td', { text: v })))))));
}

export function renderBoard(board, availableAssets, sltOverrides = {}) {
  const assets = board.assets.filter(a => availableAssets.includes(a.id));
  const zoneByCell = new Map();
  for (const z of board.zones) for (const cell of z.cells) zoneByCell.set(cell, z);
  const assetByCell = new Map(assets.map(a => [a.cell, a]));
  const conduitByCell = new Map(board.conduits.map(c => [c.cell, c]));

  const grid = el('div', { class: 'board', 'aria-hidden': 'true' });
  grid.append(el('span', { class: 'label' }));
  for (const col of COLS) grid.append(el('span', { class: 'label', text: col }));
  for (let row = 1; row <= 8; row++) {
    grid.append(el('span', { class: 'label', text: String(row) }));
    for (const col of COLS) {
      const cell = `${col}${row}`;
      const zone = zoneByCell.get(cell);
      const node = el('span', { class: `cell${zone ? ` ${zone.color}` : ''}`, title: cell, 'data-cell': cell });
      const asset = assetByCell.get(cell);
      const conduit = conduitByCell.get(cell);
      if (asset) node.append(el('span', { class: 'glyph', text: asset.glyph }));
      if (conduit) { node.classList.add('conduit'); node.textContent = `◆${conduit.id}`; }
      grid.append(node);
    }
  }

  grid.append(el('span', { class: 'packet-layer' }));

  const legend = el('ul', { class: 'legend', 'aria-hidden': 'true' },
    ...board.zones.map(z => el('li', {}, el('span', { class: `swatch cell ${z.color}` }), `${z.name} · SL-T ${zoneSlt(board, z.id, sltOverrides)}`)),
    el('li', { text: '◆ = conduit' }));

  const zoneName = id => (board.zones.find(z => z.id === id) || {}).name || id;
  const details = el('section', { class: 'board-details', 'aria-labelledby': 'board-details-h' },
    el('h3', { id: 'board-details-h', text: 'Board details' }),
    table('Zones', ['Zone', 'SL-T', 'Cells'], board.zones.map(z => [z.name, String(zoneSlt(board, z.id, sltOverrides)), summarizeCells(z.cells)])),
    table('Assets', ['Asset', 'Name', 'Role', 'Cell', 'Zone'], assets.map(a => [a.glyph, a.name, ROLE_LABELS[a.role] || a.role, a.cell, zoneName(zoneOf(board, a.id))])),
    table('Conduits', ['Conduit', 'Cell', 'Joins', 'Effective SL-T'], board.conduits.map(c => [c.id, c.cell, c.joins.map(zoneName).join(' ↔ '), String(effectiveSlt(board, c, sltOverrides))])));

  return el('div', { class: 'board-wrap' }, grid, legend, details);
}
