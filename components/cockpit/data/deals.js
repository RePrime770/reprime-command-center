// 7-deal active roster — Doc D Section 5.2
// 8-stage lifecycle: Sourced → Underwriting → LOI Out → Negotiating → DD → Closing → Closed → Stabilized
// PSA-signed deals (Stage 5+) eligible for Active Deal sub-strip chips.

export const deals = [
  {
    id: 'deal-001',
    name: 'Watermills Apartments',
    amount: 35_000_000,
    type: 'value-add multifamily',
    stage: 5,
    stageLabel: 'DD',
    tier: 'L6',
    daysToDdEnd: 12,
    extensionsAvailable: 30,
    extensionsUsed: 0,
    broker: 'Neil Bane',
    investorIds: ['inv-002'],
    psaSigned: true,
    pulseActive: false,
    counterLoi: false
  },
  {
    id: 'deal-002',
    name: 'Bay Valley Plaza',
    amount: 48_000_000,
    type: 'core-plus retail',
    stage: 5,
    stageLabel: 'DD',
    tier: 'L7',
    daysToDdEnd: 4,
    extensionsAvailable: 0,
    extensionsUsed: 1,
    broker: null,
    investorIds: ['inv-001'],
    psaSigned: true,
    pulseActive: true, // <7d to DD end
    counterLoi: true,
    counterLoiFrom: 'inv-001',
    leftmost: true // Nora-curated apex
  },
  {
    id: 'deal-003',
    name: 'Service FCU Portfolio',
    amount: 22_000_000,
    type: 'NPL acquisition',
    stage: 6,
    stageLabel: 'Closing',
    tier: 'L6',
    daysToDdEnd: 7,
    extensionsAvailable: 30,
    extensionsUsed: 0,
    broker: null,
    investorIds: ['inv-003'],
    psaSigned: true,
    pulseActive: true, // <=7d
    counterLoi: false
  },
  {
    id: 'deal-004',
    name: '500 West Monroe',
    amount: 18_000_000,
    type: 'opportunistic office',
    stage: 3,
    stageLabel: 'LOI Out',
    tier: 'L5',
    daysToDdEnd: null,
    extensionsAvailable: null,
    extensionsUsed: 0,
    broker: null,
    investorIds: [],
    psaSigned: false,
    pulseActive: false,
    counterLoi: false,
    notes: 'OSINT research mission pending'
  },
  {
    id: 'deal-005',
    name: 'Freeport Plaza',
    amount: 12_000_000,
    type: 'value-add multifamily',
    stage: 4,
    stageLabel: 'Negotiating',
    tier: 'L4',
    daysToDdEnd: null,
    extensionsAvailable: null,
    extensionsUsed: 0,
    broker: null,
    investorIds: [],
    psaSigned: false,
    pulseActive: false,
    counterLoi: false
  },
  {
    id: 'deal-006',
    name: 'Magna Southfield',
    amount: 28_000_000,
    type: 'industrial core',
    stage: 5,
    stageLabel: 'DD',
    tier: 'L5',
    daysToDdEnd: 18,
    extensionsAvailable: 30,
    extensionsUsed: 0,
    broker: null,
    investorIds: ['inv-012'],
    psaSigned: true,
    pulseActive: false,
    counterLoi: false
  },
  {
    id: 'deal-007',
    name: 'Magnolia Heights',
    amount: 8_000_000,
    type: 'value-add multifamily',
    stage: 3,
    stageLabel: 'LOI Out',
    tier: 'L4',
    daysToDdEnd: null,
    extensionsAvailable: null,
    extensionsUsed: 0,
    broker: null,
    investorIds: [],
    psaSigned: false,
    pulseActive: false,
    counterLoi: false
  }
];

// Active Deal sub-strip chips — PSA-signed only (deals 1, 2, 3, 6).
// Nora-curated order: Bay Valley LEFTMOST (counter-LOI external signal jump).
export const subStripDeals = deals
  .filter((d) => d.psaSigned)
  .sort((a, b) => (a.leftmost ? -1 : b.leftmost ? 1 : a.tier < b.tier ? -1 : 1));

// LOI Outstanding filter — Stage 3 only.
export const loiOutstanding = deals.filter((d) => d.stage === 3);

export const findDeal = (id) => deals.find((d) => d.id === id);

export const stages = [
  { num: 1, label: 'Sourced' },
  { num: 2, label: 'Underwriting' },
  { num: 3, label: 'LOI Out' },
  { num: 4, label: 'Negotiating' },
  { num: 5, label: 'DD' },
  { num: 6, label: 'Closing' },
  { num: 7, label: 'Closed' },
  { num: 8, label: 'Stabilized' }
];

export const formatAmount = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};
