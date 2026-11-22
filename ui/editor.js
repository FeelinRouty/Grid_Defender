// Rule-card editor (contracts/ui.md). Native controls only, so keyboard and accessible names come for free.
import { FCS, FC_HEX, effectiveSlt } from '../engine/flows.js';

export const MAX_RULES = 8;
const SERVICES = [
  ['port-20000', 'tcp/20000 (port only)'],
  ['dnp3', 'DNP3 (protocol-checked)'],
  ['other-tcp', 'Other TCP'],
  ['any', 'Any service'],
];
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

function endpointOptions(board, availableAssets) {
  const zoneName = id => board.zones.find(z => z.id === id).name;
  const assetZone = a => board.zones.find(z => z.cells.includes(a.cell));
  return [
    ['any', 'Any'],
    ...board.zones.map(z => [`zone:${z.id}`, `Zone · ${z.name}`]),
    ...board.assets.filter(a => availableAssets.includes(a.id))
      .map(a => [`asset:${a.id}`, `Asset ${a.id} · ${a.name} (${zoneName(assetZone(a).id)})`]),
  ];
}

function select(id, label, options, value, placeholder = 'Choose…') {
  const s = el('select', { id });
  s.append(el('option', { value: '', text: placeholder }));
  for (const [v, text] of options) {
    const o = el('option', { value: v, text });
    if (v === value) o.selected = true;
    s.append(o);
  }
  // Label is a sibling (not a wrapper) so the accessible name is exactly the label text.
  return el('div', { class: 'field' }, el('label', { for: id, text: label }), s);
}

/**
 * @returns {{ element, showErrors(errors), clearErrors(), focusField(conduitId, ruleIndex, field) }}
 */
export function createEditor({ board, availableAssets, sltOverrides, initial, onChange }) {
  const model = Object.fromEntries(board.conduits.map(c => [c.id, (initial[c.id] || []).map(r => ({ ...r }))]));
  const endpoints = endpointOptions(board, availableAssets);
  const root = el('div', { class: 'editor' });
  const lists = {};
  const sections = {};
  const pickerLabels = {};
  const multi = board.conduits.length > 1;
  let selected = board.conduits[0].id;

  const emit = conduitId => onChange(conduitId, model[conduitId].map(r => ({ ...r, ...(Array.isArray(r.fcs) ? { fcs: [...r.fcs] } : {}) })));
  const fieldId = (cid, i, field) => `r-${cid}-${i}-${field}`;

  function renderCard(cid, i) {
    const rule = model[cid][i];
    const n = i + 1;
    const fields = el('div', { class: 'rule-fields' },
      select(fieldId(cid, i, 'action'), 'Action', [['permit', 'Permit'], ['deny', 'Deny']], rule.action),
      select(fieldId(cid, i, 'src'), 'Source', endpoints, rule.src),
      select(fieldId(cid, i, 'dst'), 'Destination', endpoints, rule.dst),
      select(fieldId(cid, i, 'service'), 'Service', SERVICES, rule.service));

    const isDnp3 = rule.service === 'dnp3';
    const anyFc = rule.fcs === 'any';
    const fcSet = el('fieldset', { class: 'fc-set', id: fieldId(cid, i, 'fcs'), disabled: !isDnp3 },
      el('legend', { text: isDnp3 ? 'Function codes' : 'Function codes (DNP3 service only)' }));
    const anyBox = el('input', { type: 'checkbox', id: `${fieldId(cid, i, 'fcs')}-any`, checked: anyFc });
    fcSet.append(el('label', { for: anyBox.id }, anyBox, 'Any FC'));
    for (const fc of FCS) {
      const box = el('input', { type: 'checkbox', id: `${fieldId(cid, i, 'fcs')}-${fc}`, value: fc,
        checked: Array.isArray(rule.fcs) && rule.fcs.includes(fc), disabled: anyFc });
      fcSet.append(el('label', { for: box.id }, box, `${fc} ${FC_HEX[fc]}`));
    }

    const up = el('button', { type: 'button', 'data-act': 'up', 'aria-label': `Move rule ${n} up`, text: 'Move up', disabled: i === 0 });
    const down = el('button', { type: 'button', 'data-act': 'down', 'aria-label': `Move rule ${n} down`, text: 'Move down', disabled: i === model[cid].length - 1 });
    const del = el('button', { type: 'button', 'data-act': 'delete', 'aria-label': `Delete rule ${n}`, text: 'Delete' });
    const error = el('p', { class: 'rule-error', id: `${fieldId(cid, i, 'error')}` });
    const note = el('p', { class: 'rule-note', id: `${fieldId(cid, i, 'note')}` });

    const card = el('li', { class: 'rule-card', 'data-index': String(i) },
      el('fieldset', {}, el('legend', { text: `Rule ${n}` }), fields, fcSet),
      el('div', { class: 'rule-actions' }, up, down, del), error, note);

    card.addEventListener('change', ev => {
      note.textContent = ''; // a shadowed note describes the rules as they were graded
      const t = ev.target;
      const field = t.id.split('-').slice(3).join('-');
      if (['action', 'src', 'dst', 'service'].includes(field)) {
        rule[field] = t.value || undefined;
        if (field === 'service') {
          if (rule.service === 'dnp3' && rule.fcs === undefined) rule.fcs = [];
          rerender(cid, () => document.getElementById(t.id));
        }
      } else if (t.type === 'checkbox') {
        if (t.id.endsWith('-any')) {
          rule.fcs = t.checked ? 'any' : [];
          rerender(cid, () => document.getElementById(t.id));
        } else {
          const set = new Set(Array.isArray(rule.fcs) ? rule.fcs : []);
          if (t.checked) set.add(t.value); else set.delete(t.value);
          rule.fcs = FCS.filter(fc => set.has(fc));
        }
      }
      emit(cid);
    });
    card.addEventListener('click', ev => {
      const act = ev.target.getAttribute && ev.target.getAttribute('data-act');
      if (!act) return;
      const rules = model[cid];
      if (act === 'delete') {
        rules.splice(i, 1);
        rerender(cid, () => (rules.length ? document.getElementById(fieldId(cid, Math.min(i, rules.length - 1), 'action')) : root.querySelector(`[data-add="${cid}"]`)));
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
      ? `${MAX_RULES} of ${MAX_RULES} rules — the limit for one conduit. Delete a rule to add another.`
      : `${model[cid].length} of ${MAX_RULES} rules. Anything no rule permits is denied.`;
    if (pickerLabels[cid]) pickerLabels[cid].textContent = pickerText(cid);
    if (focusTarget) { const node = focusTarget(); if (node) node.focus(); }
  }

  const conduitById = id => board.conduits.find(c => c.id === id);
  function pickerText(cid) {
    const c = conduitById(cid);
    const n = model[cid].length;
    return `Conduit ${cid} (${c.cell}) · ${c.joins.map(zoneName).join(' ↔ ')} · SL-T ${effectiveSlt(board, c, sltOverrides)} · ${n} rule${n === 1 ? '' : 's'}`;
  }
  // Level 3: choose which conduit's independent rule list to edit (FR-008).
  function selectConduit(cid) {
    selected = cid;
    for (const [id, section] of Object.entries(sections)) section.hidden = multi && id !== cid;
    const radio = root.querySelector(`input[name="conduit-picker"][value="${cid}"]`);
    if (radio) radio.checked = true;
  }

  const zoneName = id => board.zones.find(z => z.id === id).name;
  for (const conduit of board.conduits) {
    const cid = conduit.id;
    const headingId = `conduit-${cid}-h`;
    lists[cid] = el('ol', { class: 'rule-list', 'aria-labelledby': headingId, tabindex: '-1' });
    const add = el('button', { type: 'button', 'data-add': cid, text: `Add rule to conduit ${cid}` });
    add.addEventListener('click', () => {
      if (model[cid].length >= MAX_RULES) return;
      model[cid].push({});
      rerender(cid, () => document.getElementById(fieldId(cid, model[cid].length - 1, 'action')));
      emit(cid);
    });
    sections[cid] = el('section', { class: 'conduit-editor panel', 'aria-labelledby': headingId },
      el('h3', { id: headingId, text: `Conduit ${cid} (${conduit.cell}) · ${conduit.joins.map(zoneName).join(' ↔ ')} · effective SL-T ${effectiveSlt(board, conduit, sltOverrides)}` }),
      lists[cid],
      el('p', { class: 'muted', 'data-count': cid }),
      add);
    root.append(sections[cid]);
    rerender(cid);
  }
  if (multi) {
    const picker = el('fieldset', { class: 'conduit-picker panel' }, el('legend', { text: 'Conduit to edit' }));
    for (const c of board.conduits) {
      const id = `pick-conduit-${c.id}`;
      const radio = el('input', { type: 'radio', name: 'conduit-picker', id, value: c.id, checked: c.id === selected });
      radio.addEventListener('change', () => selectConduit(c.id));
      pickerLabels[c.id] = el('span', { text: pickerText(c.id) });
      picker.append(el('div', {}, radio, el('label', { for: id }, pickerLabels[c.id])));
    }
    root.prepend(picker);
  }
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
      if (node && node.tagName === 'FIELDSET') node = node.querySelector('input:not(:disabled)');
      if (node) node.focus();
    },
    firstErrorField(errors) {
      return [...errors].sort((a, b) => a.ruleIndex - b.ruleIndex || FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field))[0];
    },
  };
}
