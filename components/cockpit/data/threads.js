// Sample Comms threads — mix of Hebrew + English across 5 channels.
// 30-40% Hebrew render (Doc D Section 2.6).
// Channel keys per src/lib/colors.js.

export const threads = [
  // 305 WhatsApp threads
  {
    id: 'th-001',
    channel: '305-WA',
    contactId: 'inv-001',
    contactName: 'Doron Sagiv',
    language: 'he',
    isInvestor: true,
    tier: 'L7',
    lastTs: '2026-05-11T08:14:00Z',
    unread: 2,
    preview: 'שינוי תנאים על Bay Valley — תוסיף 30 יום DD',
    messages: [
      {
        id: 'm-001-1',
        from: 'inv-001',
        ts: '2026-05-10T21:45:00Z',
        body: 'גידי, הסתכלנו על Bay Valley עוד פעם — היתה פגישה עם הצוות'
      },
      {
        id: 'm-001-2',
        from: 'me',
        ts: '2026-05-10T22:02:00Z',
        body: 'מה הם אומרים?'
      },
      {
        id: 'm-001-3',
        from: 'inv-001',
        ts: '2026-05-11T08:14:00Z',
        body: 'שינוי תנאים על Bay Valley — תוסיף 30 יום DD, אנחנו עוד צריכים environmental ובדיקת קרקע'
      }
    ],
    noraBlock: {
      tier: 'L7',
      content:
        'Counter-LOI on Bay Valley — 30 day DD extension requested. Existing extension already used (1/1). Tier escalated to L7 STRIKE. Suggested response: push back on extension, offer 10-day instead.',
      actions: ['Draft reply', 'Cross-reference Bay Valley DD timeline', 'Note this']
    }
  },
  {
    id: 'th-002',
    channel: '305-WA',
    contactId: 'inv-002',
    contactName: 'Daniel Schuchalter',
    language: 'he',
    isInvestor: true,
    tier: 'L5',
    lastTs: '2026-05-11T07:30:00Z',
    unread: 0,
    preview: 'תשואת קאפ ב-Watermills נראית בסדר — מתקדמים',
    messages: [
      {
        id: 'm-002-1',
        from: 'me',
        ts: '2026-05-11T06:50:00Z',
        body: 'יוסי בוקר טוב — סגרת על Watermills DD?'
      },
      {
        id: 'm-002-2',
        from: 'inv-002',
        ts: '2026-05-11T07:30:00Z',
        body: 'תשואת קאפ ב-Watermills נראית בסדר — מתקדמים. אעדכן ביום ראשון'
      }
    ]
  },
  {
    id: 'th-003',
    channel: '305-WA',
    contactId: 'inv-006',
    contactName: 'Amir Shenkman',
    language: 'he',
    isInvestor: true,
    tier: 'L6',
    lastTs: '2026-05-10T13:00:00Z',
    unread: 1,
    preview: 'מחכה לחתימה על PSA — בעז"ה השבוע',
    messages: [
      {
        id: 'm-003-1',
        from: 'inv-006',
        ts: '2026-05-10T13:00:00Z',
        body: 'גידעון, מחכה לחתימה על PSA — בעז"ה השבוע נסגור. תשלח לי טיוטה'
      }
    ],
    noraBlock: {
      tier: 'L6',
      content: 'Avi observes Shabbat — schedule signing for Sunday or post-Saturday nightfall.',
      actions: ['Schedule call Sunday AM', 'Send PSA draft']
    }
  },
  {
    id: 'th-004',
    channel: '305-WA',
    contactId: 'inv-010',
    contactName: 'Yaron Sitbon',
    language: 'en',
    isInvestor: true,
    tier: 'L5',
    lastTs: '2026-04-20T17:00:00Z',
    unread: 0,
    preview: 'Freeport Plaza comps looked solid — silence since',
    messages: [
      {
        id: 'm-004-1',
        from: 'inv-010',
        ts: '2026-04-20T17:00:00Z',
        body: 'Freeport Plaza comps looked solid — let me run by my brother and circle back'
      }
    ],
    noraBlock: {
      tier: 'L5',
      content: '3-week silence on Freeport Plaza follow-up. Nudge today?',
      actions: ['Draft follow-up', 'Move to L6']
    }
  },
  // 305 SMS
  {
    id: 'th-005',
    channel: '305-SMS',
    contactId: 'inv-005',
    contactName: 'Neil Bane',
    language: 'en',
    isInvestor: false,
    tier: null,
    lastTs: '2026-05-09T11:00:00Z',
    unread: 0,
    preview: 'Need to talk Q3 capital — when works?',
    messages: [
      {
        id: 'm-005-1',
        from: 'inv-005',
        ts: '2026-05-09T11:00:00Z',
        body: 'Gideon — need to talk Q3 capital. When works?'
      }
    ]
  },
  {
    id: 'th-006',
    channel: '305-SMS',
    contactId: 'brk-001',
    contactName: 'Watermills broker',
    language: 'en',
    isInvestor: false,
    tier: 'L4',
    lastTs: '2026-05-11T09:00:00Z',
    unread: 3,
    preview: 'Watermills inspector is asking for access Tuesday',
    messages: [
      {
        id: 'm-006-1',
        from: 'brk-001',
        ts: '2026-05-11T09:00:00Z',
        body: 'Watermills inspector is asking for access Tuesday morning — confirm?'
      }
    ]
  },
  // 718 WhatsApp
  {
    id: 'th-007',
    channel: '718-WA',
    contactId: 'fam-001',
    contactName: 'Shely',
    language: 'en',
    isInvestor: false,
    familyTag: true,
    tier: null,
    lastTs: '2026-05-11T10:30:00Z',
    unread: 1,
    preview: 'Mushka asked about the visit Sunday — confirmed?',
    messages: [
      {
        id: 'm-007-1',
        from: 'fam-001',
        ts: '2026-05-11T10:30:00Z',
        body: 'Mushka asked about the visit Sunday — confirmed?'
      }
    ]
  },
  // 718 SMS
  {
    id: 'th-008',
    channel: '718-SMS',
    contactId: 'vnd-001',
    contactName: 'Bruce Smoler',
    language: 'en',
    isInvestor: false,
    tier: 'L5',
    lastTs: '2026-05-11T08:45:00Z',
    unread: 1,
    preview: 'Escrow funded on Bay Valley — need wire instructions today',
    messages: [
      {
        id: 'm-008-1',
        from: 'vnd-001',
        ts: '2026-05-11T08:45:00Z',
        body: 'Escrow funded on Bay Valley — need wire instructions today to release'
      }
    ]
  },
  // 718 iMessage
  {
    id: 'th-009',
    channel: '718-iM',
    contactId: 'crw-001',
    contactName: 'Chaim Abrahams',
    language: 'en',
    isInvestor: false,
    staffTag: true,
    tier: 'L4',
    lastTs: '2026-05-11T11:00:00Z',
    unread: 0,
    preview: 'Pushed the Frayser model to Drive — needs your review',
    messages: [
      {
        id: 'm-009-1',
        from: 'crw-001',
        ts: '2026-05-11T11:00:00Z',
        body: 'Pushed the Frayser model to Drive — needs your review. NOI gap is 182%'
      }
    ],
    noraBlock: {
      tier: 'L4',
      content:
        'Chaim flagged a 182% NOI gap on the Frayser model. He wants your review before it goes to the lender. No deadline given.',
      actions: ['Open Frayser model', 'Reply: reviewing today']
    }
  },
  {
    id: 'th-010',
    channel: '718-iM',
    contactId: 'fam-002',
    contactName: 'Mushka',
    language: 'he-en',
    isInvestor: false,
    familyTag: true,
    tier: null,
    lastTs: '2026-05-11T07:40:00Z',
    unread: 2,
    preview: 'Abba — are you coming Sunday? Safta asked 😊',
    messages: [
      {
        id: 'm-010-1',
        from: 'fam-002',
        ts: '2026-05-11T07:40:00Z',
        body: 'Abba — are you coming Sunday? Safta asked 😊'
      }
    ]
  },
  // Staff threads (staffTag:true — routed to the Staff lane only, pulled out of 305/718)
  {
    id: 'th-011',
    channel: '718-WA',
    contactId: 'stf-001',
    contactName: 'Steven Philipp',
    language: 'en',
    isInvestor: false,
    staffTag: true,
    tier: 'L4',
    lastTs: '2026-05-11T10:50:00Z',
    unread: 2,
    preview: 'Email automation is live — 3 sequences firing on the investor list',
    messages: [
      {
        id: 'm-011-1',
        from: 'me',
        ts: '2026-05-11T09:30:00Z',
        body: 'Steven — did the new follow-up sequence go out?'
      },
      {
        id: 'm-011-2',
        from: 'stf-001',
        ts: '2026-05-11T10:50:00Z',
        body: 'Email automation is live — 3 sequences firing on the investor list. Open rate 41% so far'
      }
    ],
    noraBlock: {
      tier: 'L4',
      content:
        'Steven confirmed the follow-up email sequences are live. Open rate is 41%. Nothing needs your decision right now.',
      actions: ['Reply: nice work', 'See the sequences']
    }
  },
  {
    id: 'th-012',
    channel: '718-iM',
    contactId: 'stf-002',
    contactName: 'Adir Yonasi',
    language: 'he-en',
    isInvestor: false,
    staffTag: true,
    tier: 'L5',
    lastTs: '2026-05-11T09:55:00Z',
    unread: 1,
    preview: 'דורון רוצה שיחה לפני שבת — אני מתאם?',
    messages: [
      {
        id: 'm-012-1',
        from: 'stf-002',
        ts: '2026-05-11T09:55:00Z',
        body: 'דורון רוצה שיחה לפני שבת — אני מתאם? יש לו שאלות על Bay Valley'
      }
    ],
    noraBlock: {
      tier: 'L5',
      content:
        'Adir says Doron wants a call before Shabbat about Bay Valley. Adir is offering to set it up. Tell him yes or no on the timing.',
      actions: ['Reply: yes, set it up', 'Suggest a time']
    }
  },
  {
    id: 'th-013',
    channel: '718-WA',
    contactId: 'fam-003',
    contactName: 'Dovber',
    language: 'en',
    isInvestor: false,
    familyTag: true,
    tier: null,
    lastTs: '2026-05-11T11:20:00Z',
    unread: 1,
    preview: 'Abba can you bring my tefillin bag when you come?',
    messages: [
      {
        id: 'm-013-1',
        from: 'fam-003',
        ts: '2026-05-11T11:20:00Z',
        body: 'Abba can you bring my tefillin bag when you come?'
      }
    ]
  }
];

export const threadsByChannel = (channelFamily) => {
  // channelFamily: '305' | '718' | 'investors' | 'staff'
  // B1: newest-at-top — sort by lastTs descending
  // Exclusivity: investor and staff threads are pulled OUT of 305/718 into their own lanes.
  const filter = (t) => {
    if (channelFamily === '305') return t.channel.startsWith('305-') && !t.staffTag;
    if (channelFamily === '718') return t.channel.startsWith('718-') && !t.staffTag;
    if (channelFamily === 'investors') return t.isInvestor;
    if (channelFamily === 'staff') return t.staffTag === true;
    return true;
  };
  return [...threads].filter(filter).sort((a, b) => new Date(b.lastTs) - new Date(a.lastTs));
};

export const findThread = (id) => threads.find((t) => t.id === id);

export const findThreadByContact = (contactId) =>
  threads.find((t) => t.contactId === contactId);
