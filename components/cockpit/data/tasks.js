// Delegated tasks (assigned to crew, L1-L7 balloon) + Bucket (Gideon's own queue).

export const delegated = [
  {
    id: 'tsk-001',
    tier: 'L6',
    title: 'Pull Bay Valley environmental report',
    assignee: 'Chaim Abrahams',
    assigneeId: 'crw-001',
    due: '2026-05-12',
    status: 'in-progress'
  },
  {
    id: 'tsk-002',
    tier: 'L5',
    title: 'Wire instructions to Bruce for Bay Valley',
    assignee: 'Nora Sterling',
    assigneeId: 'crw-nora',
    due: '2026-05-11',
    status: 'in-progress'
  },
  {
    id: 'tsk-003',
    tier: 'L4',
    title: 'Pipedrive cleanup — 12 missing observance tags',
    assignee: 'Adir Yonasi',
    assigneeId: 'crw-003',
    due: '2026-05-10',
    status: 'overdue'
  },
  {
    id: 'tsk-004',
    tier: 'L4',
    title: 'Aircall log review — broker calls week of May 5',
    assignee: 'Steven Philipp',
    assigneeId: 'crw-004',
    due: '2026-05-13',
    status: 'in-progress'
  },
  {
    id: 'tsk-005',
    tier: 'L3',
    title: 'OSINT mission — 500 West Monroe owner',
    assignee: 'Yaron Sitbon',
    assigneeId: 'crw-005',
    due: '2026-05-14',
    status: 'queued'
  },
  {
    id: 'tsk-006',
    tier: 'L7',
    title: 'Counter Doron 30-day DD extension — draft TODAY',
    assignee: 'Captain (Claude Code)',
    assigneeId: 'agt-001',
    due: '2026-05-11',
    status: 'in-progress'
  }
];

export const bucket = {
  today: [
    {
      id: 'bkt-001',
      tier: 'L7',
      title: 'Respond to Doron counter-LOI'
    },
    {
      id: 'bkt-002',
      tier: 'L6',
      title: 'Wire instructions Bruce — Bay Valley'
    },
    {
      id: 'bkt-003',
      tier: 'L5',
      title: 'Confirm Watermills Tuesday inspector access'
    },
    {
      id: 'bkt-004',
      tier: 'L4',
      title: 'Send Magna Southfield deck to Bryan Morjain'
    }
  ],
  thisWeek: [
    {
      id: 'bkt-101',
      tier: 'L5',
      title: 'Close Service FCU final docs'
    },
    {
      id: 'bkt-102',
      tier: 'L4',
      title: 'Follow-up Yaron Sitbon — Freeport Plaza'
    },
    {
      id: 'bkt-103',
      tier: 'L4',
      title: 'Schedule Avi PSA signing (post-Shabbat)'
    },
    {
      id: 'bkt-104',
      tier: null,
      title: 'Amir Shenkman — circle back mid-week'
    }
  ],
  later: [
    {
      id: 'bkt-201',
      tier: 'L3',
      title: '500 West Monroe — full underwrite after OSINT'
    },
    {
      id: 'bkt-202',
      tier: null,
      title: 'Magnolia Heights — submit revised LOI'
    },
    {
      id: 'bkt-203',
      tier: null,
      title: 'Q3 capital meeting with Neil Bane'
    }
  ]
};
