// Pure flow-universe logic: zones, paths, port classes, classification.
// No DOM, timers, randomness or network. See research R2–R4, R7 and data-model.md Flow.

export const FCS = ['READ', 'WRITE', 'SELECT', 'OPERATE', 'DIRECT_OPERATE', 'COLD_RESTART', 'STOP_APPL'];
export const FC_HEX = {
  READ: '0x01', WRITE: '0x02', SELECT: '0x03', OPERATE: '0x04', DIRECT_OPERATE: '0x05',
  COLD_RESTART: '0x0D', STOP_APPL: '0x12', RESPONSE: '0x81', UNSOLICITED_RESPONSE: '0x82',
};
export const VARIANTS = ['dnp3', 'non-dnp3-20000', 'other-tcp'];

export function assetById(board, id) {
  return board.assets.find(a => a.id === id) || null;
}

export function zoneOfCell(board, cell) {
  const zone = board.zones.find(z => z.cells.includes(cell));
  return zone ? zone.id : null;
}

export function zoneOf(board, assetId) {
  const asset = assetById(board, assetId);
  return asset ? zoneOfCell(board, asset.cell) : null;
}

/** Ordered conduit IDs between two zones ([] within one zone, null if unreachable). */
export function conduitPath(board, srcZone, dstZone) {
  if (srcZone === dstZone) return [];
  const prev = new Map([[srcZone, null]]);
  const queue = [srcZone];
  while (queue.length) {
    const zone = queue.shift();
    if (zone === dstZone) break;
    for (const conduit of board.conduits) {
      if (!conduit.joins.includes(zone)) continue;
      const other = conduit.joins[0] === zone ? conduit.joins[1] : conduit.joins[0];
      if (!prev.has(other)) {
        prev.set(other, { zone, conduit: conduit.id });
        queue.push(other);
      }
    }
  }
  if (!prev.has(dstZone)) return null;
  const path = [];
  for (let z = dstZone; prev.get(z); z = prev.get(z).zone) path.unshift(prev.get(z).conduit);
  return path;
}

export function flowPath(board, flow) {
  return conduitPath(board, zoneOf(board, flow.src), zoneOf(board, flow.dst));
}

export function portClass(flow) {
  return flow.variant === 'other-tcp' ? 'other' : '20000';
}

export function flowKey(flow) {
  return `${flow.src}>${flow.dst}|${flow.variant}|${flow.fc ?? ''}`;
}

/** Every cross-zone flow among the round's assets, in canonical order (research R7). */
export function enumerateUniverse(board, availableAssets) {
  const assets = board.assets.filter(a => !availableAssets || availableAssets.includes(a.id));
  const universe = [];
  for (const s of assets) {
    for (const d of assets) {
      if (s.id === d.id) continue;
      const zs = zoneOf(board, s.id);
      const zd = zoneOf(board, d.id);
      if (zs === zd) continue;
      const path = conduitPath(board, zs, zd);
      for (const fc of FCS) universe.push({ src: s.id, dst: d.id, variant: 'dnp3', fc, path });
      universe.push({ src: s.id, dst: d.id, variant: 'non-dnp3-20000', path });
      universe.push({ src: s.id, dst: d.id, variant: 'other-tcp', path });
    }
  }
  return universe;
}

export function zoneSlt(board, zoneId, sltOverrides = {}) {
  if (sltOverrides && Object.prototype.hasOwnProperty.call(sltOverrides, zoneId)) return sltOverrides[zoneId];
  return board.zones.find(z => z.id === zoneId).slt;
}

/** A conduit enforces the higher SL-T of the two zones it joins (FR-015). */
export function effectiveSlt(board, conduit, sltOverrides = {}) {
  return Math.max(...conduit.joins.map(z => zoneSlt(board, z, sltOverrides)));
}

/**
 * Classify a flow at a conduit it crosses (FR-013, research R4).
 * required: on the ticket. dont-care: SL-T ≤ 2 and same src/dst/port class as a required flow.
 */
export function classify(flow, required, slt) {
  const key = flowKey(flow);
  if (required.some(r => flowKey(r) === key)) return 'required';
  if (slt <= 2 && required.some(r => r.src === flow.src && r.dst === flow.dst && portClass(r) === portClass(flow))) {
    return 'dont-care';
  }
  return 'forbidden';
}
