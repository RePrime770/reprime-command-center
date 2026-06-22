// Live event stream — Terminal-side activity (logins, RSVPs, opens, invites,
// agent events, tier1 alerts, meeting-now). Newest on top.
// Dispatch panel #9. Did NOT exist in rejected v5.0 build.

export const terminalFeed = [
  { id: 'tf-001', when: '09:42', type: 'tier1', who: 'Bay Valley',         what: 'PSA pulse <7d to DD end' },
  { id: 'tf-002', when: '09:38', type: 'login', who: 'Doron Sagiv',        what: 'opened Bay Valley invite' },
  { id: 'tf-003', when: '09:31', type: 'rsvp',  who: 'Daniel Schuchalter',       what: 'confirmed 10:00 Zoom' },
  { id: 'tf-004', when: '09:25', type: 'open',  who: 'Daniel Schuchalter',        what: 'viewed Service FCU card' },
  { id: 'tf-005', when: '09:18', type: 'agent', who: 'C2',                 what: 'completed OSINT pull (4 min)' },
  { id: 'tf-006', when: '09:12', type: 'invite',who: 'Captain',            what: 'sent invite to Amir Shenkman' },
  { id: 'tf-007', when: '09:04', type: 'login', who: 'Amir Shenkman',       what: 'opened PSA draft' },
  { id: 'tf-008', when: '08:55', type: 'meet',  who: 'Meeting Now',        what: '5-min countdown to Yossi call' },
  { id: 'tf-009', when: '08:47', type: 'agent', who: 'Google2',            what: 'finished Calcalist research' },
  { id: 'tf-010', when: '08:33', type: 'open',  who: 'Bryan Morjain',    what: 'opened Magna Southfield card' },
  { id: 'tf-011', when: '08:21', type: 'rsvp',  who: 'Amir Shenkman',    what: 'confirmed 15:30 Zoom' },
  { id: 'tf-012', when: '08:09', type: 'agent', who: 'C3',                 what: 'started Pipedrive cleanup' },
  { id: 'tf-013', when: '07:55', type: 'login', who: 'Bruce Smoler',       what: 'opened escrow doc' },
  { id: 'tf-014', when: '07:42', type: 'invite',who: 'Captain',            what: 'sent meeting invite to Doron' },
  { id: 'tf-015', when: '07:30', type: 'open',  who: 'Amir Shenkman',       what: 'viewed pipeline deck (HE)' }
];

export const ACTIVITY_TYPE_COLOR = {
  login:  '#1E88E5',
  rsvp:   '#43A047',
  open:   '#26A69A',
  invite: '#FFCC33',
  agent:  '#7B1FA2',
  tier1:  '#D32F2F',
  meet:   '#FF6F00'
};

export const ACTIVITY_TYPE_LABEL = {
  login:  'LOGIN',
  rsvp:   'RSVP',
  open:   'OPENED',
  invite: 'INVITE',
  agent:  'AGENT',
  tier1:  'TIER 1',
  meet:   'MEET'
};
