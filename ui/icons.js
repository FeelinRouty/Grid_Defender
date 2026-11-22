// Inline SVG icons for board pieces and chips. Decorative only: every use sits beside a text label.
const PATHS = {
  // SCADA master: a rack server with status lights
  master: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01M12 6.5h5M12 17.5h5"/>',
  // Operator HMI: a monitor with a trend line
  hmi: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4M6 12l3-3 3 2 4-4 2 2"/>',
  // RTU / outstation: a cabinet with a lightning bolt
  outstation: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M13 6l-3 6h4l-3 6"/>',
  // Engineering workstation: a wrench
  engineering: '<path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  // Vendor laptop
  vendor: '<rect x="5" y="5" width="14" height="10" rx="1"/><path d="M3 19h18l-2-4H5z"/>',
  // Unknown / rogue device: a question mark in a circle
  rogue: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  // Conduit firewall: a shield
  conduit: '<path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  // Zone: a fence of four squares
  zone: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  // Any: a globe
  any: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
};

export function icon(name, cls = 'icon') {
  const span = document.createElement('span');
  span.className = cls;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] || PATHS.any}</svg>`;
  return span;
}
