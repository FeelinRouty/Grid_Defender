// Hand-derived expected results for contracts/evaluator.md C1–C14.
// These are written from the spec and contract by hand. They are NEVER computed by the engine.
// Rule-card shorthand: c(action, src, dst, service, fcs?)

export const c = (action, src, dst, service, fcs) =>
  (fcs === undefined ? { action, src, dst, service } : { action, src, dst, service, fcs });

const dnp3 = (src, dst, fc) => ({ src, dst, variant: 'dnp3', fc });
const other = (src, dst) => ({ src, dst, variant: 'other-tcp' });

export const CASES = [
  {
    id: 'C1', round: '1.1', title: 'Correct: permit M → R1 tcp/20000',
    rules: { A: [c('permit', 'asset:M', 'asset:R1', 'port-20000')] },
    expect: { status: 'correct', codes: [], packets: { p1: 'allowed', p2: 'in-session', p3: 'denied', p4: 'denied' },
      packetRules: { p3: null, p4: null } },
  },
  {
    id: 'C2', round: '1.1', title: 'Zone-wide permit is too broad',
    rules: { A: [c('permit', 'zone:control', 'zone:substation', 'any')] },
    expect: { status: 'incorrect', codes: ['attack-allowed', 'over-permissive'],
      examples: { 'attack-allowed': { flow: dnp3('H', 'R1', 'READ'), ruleIndex: 1, conduitId: 'A' } },
      packets: { p1: 'allowed', p3: 'allowed', p4: 'allowed' } },
  },
  {
    id: 'C3', round: '1.1', title: 'Deny everything blocks the ticket',
    rules: { A: [c('deny', 'any', 'any', 'any')] },
    expect: { status: 'incorrect', codes: ['required-blocked'],
      examples: { 'required-blocked': { flow: dnp3('M', 'R1', 'READ'), ruleIndex: 1, conduitId: 'A' } },
      packets: { p1: 'denied', p2: 'no-session', p3: 'denied', p4: 'denied' } },
  },
  {
    id: 'C4', round: '1.1', title: 'Finer than SL-T 2 requires is accepted',
    rules: { A: [c('permit', 'asset:M', 'asset:R1', 'dnp3', ['READ'])] },
    expect: { status: 'correct', codes: [], packets: { p1: 'allowed', p4: 'denied' } },
  },
  {
    id: 'C5', round: '2.1', title: 'Both directions admits the outstation-initiated connection',
    rules: { A: [c('permit', 'asset:M', 'asset:R1', 'port-20000'), c('permit', 'asset:R1', 'asset:M', 'port-20000')] },
    expect: { status: 'incorrect', codes: ['attack-allowed', 'over-permissive'],
      examples: { 'attack-allowed': { flow: dnp3('R1', 'M', 'READ'), ruleIndex: 2, conduitId: 'A' } } },
  },
  {
    id: 'C6', round: '2.2', title: 'Inbound rule for unsolicited admits X',
    rules: { A: [c('permit', 'asset:M', 'asset:R1', 'port-20000'), c('permit', 'asset:M', 'asset:R2', 'port-20000'),
      c('permit', 'zone:substation', 'asset:M', 'port-20000')] },
    expect: { status: 'incorrect', codes: ['attack-allowed', 'over-permissive'],
      examples: { 'attack-allowed': { flow: dnp3('X', 'M', 'READ'), ruleIndex: 3, conduitId: 'A' } } },
  },
  {
    id: 'C7', round: '3.1', title: 'Port-only at SL-T 3 lets dangerous FCs through',
    rules: { 2: [c('permit', 'asset:M', 'asset:R1', 'port-20000')] },
    expect: { status: 'incorrect', codes: ['attack-allowed', 'over-permissive'],
      examples: { 'attack-allowed': { flow: dnp3('M', 'R1', 'DIRECT_OPERATE'), ruleIndex: 1, conduitId: '2' } } },
  },
  {
    id: 'C8', round: '3.1', title: 'Correct select-before-operate',
    rules: { 2: [c('permit', 'asset:M', 'asset:R1', 'dnp3', ['READ', 'SELECT', 'OPERATE'])] },
    expect: { status: 'correct', codes: [] },
  },
  {
    id: 'C9', round: '3.2', title: 'Only the conduit nearest the destination',
    rules: { 2: [c('permit', 'asset:M', 'asset:R1', 'dnp3', ['READ']), c('permit', 'asset:M', 'asset:R2', 'dnp3', ['READ', 'DIRECT_OPERATE']),
      c('permit', 'asset:E', 'asset:R2', 'dnp3', ['READ'])] },
    expect: { status: 'incorrect', codes: ['wrong-conduit'],
      examples: { 'wrong-conduit': { flow: dnp3('E', 'R2', 'READ'), ruleIndex: null, conduitId: '1' } } },
  },
  {
    id: 'C10', round: '3.1', title: 'Deny below a broad permit is shadowed',
    rules: { 2: [c('permit', 'asset:M', 'asset:R1', 'dnp3', 'any'), c('deny', 'asset:M', 'asset:R1', 'dnp3', ['DIRECT_OPERATE', 'COLD_RESTART'])] },
    expect: { status: 'incorrect', codes: ['attack-allowed', 'over-permissive'],
      shadowed: [{ conduitId: '2', ruleIndex: 2, byRuleIndex: 1, kind: 'shadowed' }] },
  },
  {
    id: 'C11', round: '3.2', title: 'Port-only on the SL-T 2 conduit is accepted',
    rules: { 1: [c('permit', 'asset:E', 'asset:R2', 'port-20000')],
      2: [c('permit', 'asset:M', 'asset:R1', 'dnp3', ['READ']), c('permit', 'asset:M', 'asset:R2', 'dnp3', ['READ', 'DIRECT_OPERATE']),
        c('permit', 'asset:E', 'asset:R2', 'dnp3', ['READ'])] },
    expect: { status: 'correct', codes: [] },
  },
  // C12 (content error) is a content.test.js case: a ticket referencing "R3".
  {
    id: 'C13', round: '1.1', title: 'Incomplete card is invalid input',
    rules: { A: [c('permit', 'asset:M', 'asset:R1', 'dnp3', [])] },
    expect: { status: 'invalid-input', inputErrors: [{ conduitId: 'A', ruleIndex: 1, field: 'fcs' }] },
  },
  {
    id: 'C14', round: '1.2', title: 'Correct 1.2; lateral packet is out of reach',
    rules: { A: [c('permit', 'asset:M', 'asset:R1', 'port-20000'), c('permit', 'asset:M', 'asset:R2', 'port-20000')] },
    expect: { status: 'correct', codes: [] },
  },
];

export { dnp3, other };
