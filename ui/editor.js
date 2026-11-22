// Rule-card editor (contracts/ui.md). Chip-style controls built on native radios and checkboxes,
// so keyboard use (Tab between groups, arrow keys inside a group, Space to tick) and accessible names come for free.
import { FCS, FC_HEX, effectiveSlt } from '../engine/flows.js';
import { icon } from './icons.js';

export const MAX_RULES = 8;
const SERVICES = [
  ['dnp3', 'DNP3', 'protocol-checked, by function code'],
  ['port-20000', 'tcp/20000', 'port only'],
  ['other-tcp', 'Other TCP', 'any other port'],
  ['any', 'Any service', 'everything'],
];
const SERVICE_SHORT = { dnp3: 'DNP3', 'port-20000': 'tcp/20000', 'other-tcp': 'other TCP', any: 'any service' };
const FIELD_ORDER = ['action', 'src', 'dst', 'service', 'fcs'];

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

/** A chip: a native input (visually hidden, still focusable) followed by its styled label. */
function chip({ type, name, id, value, checked, disabled, label, sub, iconName, cls = '' }) {
  const input = el('input', { type, name, id, value, class: 'chip-input', checked: Boolean(checked), disabled: Boolean(disabled) });
  const text = el('span', { class: 'chip-text' }, el('span', { class: 'chip-main', text: label }), sub ? el('span', { class: 'chip-sub', text: sub }) : null);
  const lab = el('label', { for: id, class: `chip ${cls}` }, iconName ? icon(iconName, 'chip-icon') : null, text);
  return [input, lab];
}

export function endpointShort(board, selector) {
  if (!selector) return '?';
  if (selector === 'any') return 'Any';
  const [kind, id] = selector.split(':');
  if (kind === 'zone') return `Zone ${(board.zones.find(z => z.id === id) || {}).name || id}`;
  return id;
}

/** "M → R1  ·  DNP3 · READ, SELECT" (the action is shown separately as a tag). */
export function flowSummary(board, rule) {
  let service = rule.service ? SERVICE_SHORT[rule.service] : 'choose a service';
  if (rule.service === 'dnp3') {
    service += rule.fcs === 'any' ? ' · any FC' : Array.isArray(rule.fcs) && rule.fcs.length ? ` · ${rule.fcs.join(', ')}` : ' · no codes yet';
  }
  return `${endpointShort(board, rule.src)} → ${endpointShort(board, rule.dst)}  ·  ${service}`;
}

export function ruleSummary(board, rule) {
  return `${rule.action ? rule.action.toUpperCase() : 'No action yet'}  ${flowSummary(board, rule)}`;
}

/**
 * @returns {{ element, showErrors(errors), clearErrors(), focusField(conduitId, ruleIndex, field) }}
 */
export function createEditor({ board, availableAssets, sltOverrides, initial, onChange }) {
  const model = Object.fromEntries(board.conduits.map(c => [c.id, (initial[c.id] || []).map(r => ({ ...r, ...(Array.isArray(r.fcs) ? { fcs: [...r.fcs] } : {}) }))]));
  const open = new WeakSet(); // expanded cards, by rule object, so they stay open when moved
  const root = el('div', { class: 'editor' });
  const lists = {};
  const sections = {};
  const pickerLabels = {};
  const multi = board.conduits.length > 1;
  // Open on the first conduit that already has (carried) rules.
  let selected = (board.conduits.find(c => model[c.id].length) || board.conduits[0]).id;
  const zoneName = id => board.zones.find(z => z.id === id).name;
  const assets = board.assets.filter(a => availableAssets.includes(a.id));

  const emit = conduitId => onChange(conduitId, model[conduitId].map(r => ({ ...r, ...(Array.isArray(r.fcs) ? { fcs: [...r.fcs] } : {}) })));
  const fieldId = (cid, i, field) => `r-${cid}-${i}-${field}`;

  function endpointGroup(cid, i, field, legend, value) {
    const base = fieldId(cid, i, field);
    const set = el('fieldset', { class: 'chip-group endpoint', id: base }, el('legend', { text: legend }));
    const name = base;
    const [anyIn, anyLab] = chip({ type: 'radio', name, id: `${base}-any`, value: 'any', checked: value === 'any', label: 'Any', sub: 'every host', iconName: 'any', cls: 'chip-any' });
    set.append(el('div', { class: 'chip-row' }, anyIn, anyLab));
    for (const z of board.zones) {
      const row = el('div', { class: `chip-row zone-row ${z.color}` });
      const [zi, zl] = chip({ type: 'radio', name, id: `${base}-zone-${z.id}`, value: `zone:${z.id}`, checked: value === `zone:${z.id}`, label: z.name, sub: 'whole zone', iconName: 'zone', cls: `chip-zone ${z.color}` });
      row.append(zi, zl);
      for (const a of assets.filter(x => z.cells.includes(x.cell))) {
        const [ai, al] = chip({ type: 'radio', name, id: `${base}-asset-${a.id}`, value: `asset:${a.id}`, checked: value === `asset:${a.id}`, label: a.id, sub: a.name, iconName: a.role, cls: `chip-asset role-${a.role}` });
        row.append(ai, al);
      }
      set.append(row);
    }
    return set;
  }

  function renderCard(cid, i) {
    const rule = model[cid][i];
    const n = i + 1;
    const isOpen = open.has(rule);
    const bodyId = fieldId(cid, i, 'body');

    const summary = el('span', { class: 'rule-summary', text: flowSummary(board, rule) });
    const actionTag = el('span', { class: `action-tag ${rule.action || 'unset'}`, text: rule.action ? rule.action.toUpperCase() : 'NEW' });
    const toggle = el('button', { type: 'button', class: 'rule-toggle', 'data-act': 'toggle', 'aria-expanded': String(isOpen), 'aria-controls': bodyId },
      el('span', { class: 'rule-num', text: `Rule ${n}` }), actionTag, summary, el('span', { class: 'toggle-hint', 'aria-hidden': 'true', text: isOpen ? 'Done ▴' : 'Edit ▾' }));
    toggle.setAttribute('aria-label', `Rule ${n}: ${ruleSummary(board, rule)}. ${isOpen ? 'Collapse' : 'Edit'}`);
    const up = el('button', { type: 'button', class: 'icon-btn', 'data-act': 'up', 'aria-label': `Move rule ${n} up`, title: 'Move up', text: '↑', disabled: i === 0 });
    const down = el('button', { type: 'button', class: 'icon-btn', 'data-act': 'down', 'aria-label': `Move rule ${n} down`, title: 'Move down', text: '↓', disabled: i === model[cid].length - 1 });
    const del = el('button', { type: 'button', class: 'icon-btn danger', 'data-act': 'delete', 'aria-label': `Delete rule ${n}`, title: 'Delete', text: '✕' });

    const actionSet = el('fieldset', { class: 'chip-group action', id: fieldId(cid, i, 'action') }, el('legend', { text: 'Action' }));
    for (const [v, label, sub] of [['permit', 'Permit', 'let it through'], ['deny', 'Deny', 'drop it']]) {
      const [inp, lab] = chip({ type: 'radio', name: fieldId(cid, i, 'action'), id: `${fieldId(cid, i, 'action')}-${v}`, value: v, checked: rule.action === v, label, sub, cls: `chip-${v}` });
      actionSet.append(inp, lab);
    }

    const serviceSet = el('fieldset', { class: 'chip-group service', id: fieldId(cid, i, 'service') }, el('legend', { text: 'Service' }));
    for (const [v, label, sub] of SERVICES) {
      const [inp, lab] = chip({ type: 'radio', name: fieldId(cid, i, 'service'), id: `${fieldId(cid, i, 'service')}-${v}`, value: v, checked: rule.service === v, label, sub });
      serviceSet.append(inp, lab);
    }

    // Function codes: only shown for the DNP3 service. One rule can carry several codes.
    const fcBase = fieldId(cid, i, 'fcs');
    const fcSet = el('fieldset', { class: 'chip-group fc-set', id: fcBase, hidden: rule.service !== 'dnp3' },
      el('legend', { text: 'DNP3 function codes' }),
      el('p', { class: 'chip-help', text: 'Tick every code this flow needs. One rule can carry several.' }));
    const anyFc = rule.fcs === 'any';
    const [anyIn, anyLab] = chip({ type: 'checkbox', id: `${fcBase}-any`, value: 'any', checked: anyFc, label: 'Any FC', sub: 'every code', cls: 'chip-fc chip-fc-any' });
    const fcRow = el('div', { class: 'chip-row' }, anyIn, anyLab);
    for (const fc of FCS) {
      const [inp, lab] = chip({ type: 'checkbox', id: `${fcBase}-${fc}`, value: fc, checked: Array.isArray(rule.fcs) && rule.fcs.includes(fc), disabled: anyFc, label: fc, sub: FC_HEX[fc], cls: 'chip-fc' });
      fcRow.append(inp, lab);
    }
    fcSet.append(fcRow);

    const body = el('div', { class: 'rule-body', id: bodyId, hidden: !isOpen },
      actionSet,
      el('div', { class: 'endpoints' },
        endpointGroup(cid, i, 'src', 'From (source)', rule.src),
        el('span', { class: 'flow-arrow', 'aria-hidden': 'true', text: '→' }),
        endpointGroup(cid, i, 'dst', 'To (destination)', rule.dst)),
      serviceSet, fcSet);

    const error = el('p', { class: 'rule-error', id: fieldId(cid, i, 'error') });
    const note = el('p', { class: 'rule-note', id: fieldId(cid, i, 'note') });
    const card = el('li', { class: `rule-card ${rule.action || 'unset'}${isOpen ? ' open' : ''}`, 'data-index': String(i) },
      el('div', { class: 'rule-head' }, toggle, el('div', { class: 'rule-actions' }, up, down, del)),
      body, error, note);

    const refreshSummary = () => {
      const text = ruleSummary(board, rule);
      summary.textContent = flowSummary(board, rule);
      actionTag.textContent = rule.action ? rule.action.toUpperCase() : 'NEW';
      actionTag.className = `action-tag ${rule.action || 'unset'}`;
      card.className = `rule-card ${rule.action || 'unset'}${open.has(rule) ? ' open' : ''}${card.classList.contains('has-error') ? ' has-error' : ''}`;
      toggle.setAttribute('aria-label', `Rule ${n}: ${text}. ${open.has(rule) ? 'Collapse' : 'Edit'}`);
    };

    card.addEventListener('change', ev => {
      note.textContent = ''; // a shadowed note describes the rules as they were graded
      const t = ev.target;
      const field = t.name ? t.name.split('-').slice(3).join('-') : t.id.split('-').slice(3, 4)[0];
      if (t.type === 'radio' && ['action', 'src', 'dst', 'service'].includes(field)) {
        rule[field] = t.value;
        if (field === 'service') {
          if (rule.service === 'dnp3' && rule.fcs === undefined) rule.fcs = [];
          fcSet.hidden = rule.service !== 'dnp3';
        }
      } else if (t.type === 'checkbox') {
        if (t.value === 'any') {
          rule.fcs = t.checked ? 'any' : [];
          fcSet.querySelectorAll('input[type=checkbox]').forEach(b => {
            if (b.value !== 'any') { b.disabled = t.checked; b.checked = false; }
          });
        } else {
          const set = new Set(Array.isArray(rule.fcs) ? rule.fcs : []);
          if (t.checked) set.add(t.value); else set.delete(t.value);
          rule.fcs = FCS.filter(fc => set.has(fc));
        }
      }
      refreshSummary();
      emit(cid);
    });
    card.addEventListener('click', ev => {
      const btn = ev.target.closest && ev.target.closest('[data-act]');
      if (!btn || !card.contains(btn)) return;
      const act = btn.getAttribute('data-act');
      const rules = model[cid];
      if (act === 'toggle') {
        if (open.has(rule)) open.delete(rule); else open.add(rule);
        rerender(cid, () => lists[cid].children[i].querySelector('.rule-toggle'));
        return;
      }
      if (act === 'delete') {
        rules.splice(i, 1);
        rerender(cid, () => (rules.length ? lists[cid].children[Math.min(i, rules.length - 1)].querySelector('.rule-toggle') : root.querySelector(`[data-add="${cid}"]`)));
      } else {
        const j = act === 'up' ? i - 1 : i + 1;
        [rules[i], rules[j]] = [rules[j], rules[i]];
        rerender(cid, () => {
          const moved = lists[cid].children[j];
          const same = moved.querySelector(`[data-act="${act}"]`);
          return same && !same.disabled ? same : moved.querySelector(`[data-act="${act === 'up' ? 'down' : 'up'}"]`);
        });
      }
      emit(cid);
    });
    return card;
  }

  function rerender(cid, focusTarget) {
    const list = lists[cid];
    list.replaceChildren(...model[cid].map((_, i) => renderCard(cid, i)));
    const addBtn = root.querySelector(`[data-add="${cid}"]`);
    const count = root.querySelector(`[data-count="${cid}"]`);
    if (addBtn) addBtn.disabled = model[cid].length >= MAX_RULES;
    if (count) count.textContent = model[cid].length >= MAX_RULES
      ? `${MAX_RULES} of ${MAX_RULES} rules: the limit for one conduit. Delete a rule to add another.`
      : `${model[cid].length} of ${MAX_RULES} rules. Anything no rule permits is denied.`;
    if (pickerLabels[cid]) pickerLabels[cid].sub.textContent = pickerSub(cid);
    if (focusTarget) { const node = focusTarget(); if (node) node.focus(); }
  }

  const conduitById = id => board.conduits.find(c => c.id === id);
  const conduitTitle = c => `Conduit ${c.id} · ${c.joins.map(zoneName).join(' ↔ ')}`;
  function pickerSub(cid) {
    const n = model[cid].length;
    return `SL-T ${effectiveSlt(board, conduitById(cid), sltOverrides)} · ${n} rule${n === 1 ? '' : 's'}`;
  }
  // Level 3: choose which conduit's independent rule list to edit (FR-008).
  function selectConduit(cid) {
    selected = cid;
    for (const [id, section] of Object.entries(sections)) section.hidden = multi && id !== cid;
    const radio = root.querySelector(`input[name="conduit-picker"][value="${cid}"]`);
    if (radio) radio.checked = true;
  }

  for (const conduit of board.conduits) {
    const cid = conduit.id;
    const headingId = `conduit-${cid}-h`;
    lists[cid] = el('ol', { class: 'rule-list', 'aria-labelledby': headingId, tabindex: '-1' });
    const add = el('button', { type: 'button', class: 'add-rule', 'data-add': cid, text: `+ Add rule to conduit ${cid}` });
    add.addEventListener('click', () => {
      if (model[cid].length >= MAX_RULES) return;
      const rule = {};
      open.add(rule);
      model[cid].push(rule);
      rerender(cid, () => document.querySelector(`#${fieldId(cid, model[cid].length - 1, 'action')} input`));
      emit(cid);
    });
    const slt = effectiveSlt(board, conduit, sltOverrides);
    sections[cid] = el('section', { class: 'conduit-editor panel', 'aria-labelledby': headingId },
      el('h3', { id: headingId, class: 'conduit-title' }, icon('conduit', 'title-icon'),
        el('span', { text: `${conduitTitle(conduit)} · effective SL-T ${slt}` })),
      el('p', { class: 'muted conduit-rule', text: slt >= 3 ? 'SL-T 3: permits must use DNP3 and name their function codes.' : 'SL-T 2: deny by default; permit only named source → destination → service flows.' }),
      lists[cid],
      el('p', { class: 'muted', 'data-count': cid }),
      add);
    root.append(sections[cid]);
  }
  if (multi) {
    const picker = el('fieldset', { class: 'conduit-picker panel chip-group' }, el('legend', { text: 'Conduit to edit' }));
    const row = el('div', { class: 'chip-row' });
    for (const c of board.conduits) {
      const id = `pick-conduit-${c.id}`;
      const [radio, lab] = chip({ type: 'radio', name: 'conduit-picker', id, value: c.id, checked: c.id === selected, label: conduitTitle(c), sub: pickerSub(c.id), iconName: 'conduit', cls: 'chip-conduit' });
      radio.addEventListener('change', () => selectConduit(c.id));
      pickerLabels[c.id] = { sub: lab.querySelector('.chip-sub') };
      row.append(radio, lab);
    }
    picker.append(row);
    root.prepend(picker);
  }
  for (const conduit of board.conduits) rerender(conduit.id);
  selectConduit(selected);

  return {
    element: root,
    clearErrors() {
      root.querySelectorAll('.rule-card').forEach(c => c.classList.remove('has-error'));
      root.querySelectorAll('.rule-error').forEach(p => { p.textContent = ''; });
      root.querySelectorAll('[aria-invalid]').forEach(n => n.removeAttribute('aria-invalid'));
    },
    showErrors(errors, describe) {
      this.clearErrors();
      for (const cid of new Set(errors.map(e => e.conduitId))) {
        let changed = false;
        for (const e of errors.filter(x => x.conduitId === cid)) {
          const rule = model[cid] && model[cid][e.ruleIndex - 1];
          if (rule && !open.has(rule)) { open.add(rule); changed = true; }
        }
        if (changed) rerender(cid);
      }
      for (const e of errors) {
        const i = e.ruleIndex - 1;
        const card = lists[e.conduitId] && lists[e.conduitId].children[i];
        if (!card) continue;
        card.classList.add('has-error');
        const p = card.querySelector('.rule-error');
        p.textContent = [p.textContent, describe(e)].filter(Boolean).join(' ');
        const field = document.getElementById(fieldId(e.conduitId, i, e.field));
        if (field) {
          field.setAttribute('aria-invalid', 'true');
          field.setAttribute('aria-describedby', p.id);
        }
      }
    },
    /** Shadowed / never-matching notes beside the affected cards (FR-016, informational). */
    showNotes(shadowed, items) {
      root.querySelectorAll('.rule-note').forEach(p => { p.textContent = ''; });
      shadowed.forEach((s, k) => {
        const card = lists[s.conduitId] && lists[s.conduitId].children[s.ruleIndex - 1];
        if (card && items[k]) card.querySelector('.rule-note').textContent = `Note: ${items[k].text}`;
      });
    },
    focusField(conduitId, ruleIndex, field) {
      if (conduitId !== selected) selectConduit(conduitId);
      const i = ruleIndex - 1;
      let node = document.getElementById(fieldId(conduitId, i, field));
      if (node && node.tagName === 'FIELDSET') node = node.querySelector('input:checked:not(:disabled)') || node.querySelector('input:not(:disabled)');
      if (node) node.focus();
    },
    firstErrorField(errors) {
      return [...errors].sort((a, b) => a.ruleIndex - b.ruleIndex || FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field))[0];
    },
  };
}
