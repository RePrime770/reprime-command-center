// Morning Brief — 8-section conditional architecture (Doc B Section 11.2).
// Hero card at top = APEX item Nora flags for the day.
// Sections render only when they have content. Items have L1-L7 tags.

export const morningBrief = {
  date: '2026-05-11',
  greeting: 'Boker tov, Gideon.',
  apex: {
    id: 'apex-001',
    tier: 'L7',
    title: 'Bay Valley counter-LOI — 4 days to DD end',
    body:
      'Doron Sagiv pushed a 30-day DD extension overnight. Extension already used (1/1). Recommend pushing back today with a 10-day counter — losing the deal vs. losing leverage.',
    actions: ['Draft response', 'Open Bay Valley deal', 'Call Doron']
  },
  sections: [
    {
      id: 'sec-deals',
      title: 'Active Deals',
      items: [
        {
          id: 'item-001',
          tier: 'L7',
          headline: 'Bay Valley — counter-LOI overnight',
          summary: 'Doron Sagiv requests 30-day DD extension. Already used 1/1.'
        },
        {
          id: 'item-002',
          tier: 'L6',
          headline: 'Watermills — DD inspector access Tuesday',
          summary: 'Yaron confirms inspector wants Tuesday morning access.'
        },
        {
          id: 'item-003',
          tier: 'L5',
          headline: 'Service FCU — closing in 7 days',
          summary: 'Daniel Schuchalter on lead. Wire instructions due to Bruce by EOD today.'
        }
      ]
    },
    {
      id: 'sec-investors',
      title: 'Investor Pulse',
      items: [
        {
          id: 'item-101',
          tier: 'L5',
          headline: 'Yaron Sitbon — 3 weeks silent on Freeport Plaza',
          summary: 'Last said comps looked solid. Nudge today?'
        },
        {
          id: 'item-102',
          tier: null,
          headline: 'Neil Bane asking Q3 capital meeting',
          summary: '305 SMS Friday — pick a slot.'
        }
      ]
    },
    {
      id: 'sec-calendar',
      title: 'Today',
      items: [
        {
          id: 'item-201',
          tier: 'L6',
          headline: '10:00 — Zoom with Daniel Schuchalter (Watermills DD)',
          summary: 'Bring updated rent roll. Yossi backed $35M.'
        },
        {
          id: 'item-202',
          tier: null,
          headline: '14:30 — Call with broker on Magna Southfield',
          summary: 'Underwriting deck needs to ship to Bryan Morjain after.'
        }
      ]
    },
    {
      id: 'sec-tasks',
      title: 'Bucket + Delegated',
      items: [
        {
          id: 'item-301',
          tier: 'L4',
          headline: 'Adir — Pipedrive cleanup (overdue 2 days)',
          summary: '12 contacts missing observance tags. Nudge?'
        },
        {
          id: 'item-302',
          tier: 'L4',
          headline: 'Steven — Aircall log review pending',
          summary: 'Mid-week review queued.'
        }
      ]
    },
    {
      id: 'sec-religious',
      title: 'Religious calendar',
      items: [
        {
          id: 'item-401',
          tier: null,
          headline: 'Shabbat begins Friday 7:48 PM (Postville)',
          summary: 'Pre-shutdown lock 4:48 PM. Amir Shenkman signing window: Sunday AM.'
        }
      ]
    },
    {
      id: 'sec-hebrew',
      title: 'Hebrew register',
      items: [
        {
          id: 'item-501',
          tier: 'L4',
          headline: 'תזכורת — לקבוע שיחה עם איתן פרץ',
          summary: 'הבטחתי לחזור באמצע השבוע. נראה הheight של החיבור.'
        }
      ]
    },
    {
      id: 'sec-research',
      title: 'Research pings',
      items: [
        {
          id: 'item-601',
          tier: null,
          headline: 'OSINT mission on 500 West Monroe pending',
          summary: 'Brainstorm REALITY-CHECK queued for tomorrow.'
        }
      ]
    },
    {
      id: 'sec-system',
      title: 'System',
      items: [
        {
          id: 'item-701',
          tier: null,
          headline: 'All 5 status dots green',
          summary: 'Quo / HeyGen / ElevenLabs / Drive / Calendar all healthy.'
        }
      ]
    }
  ]
};
