// Calendar events for today + this week.
// Includes Shabbat row (success-500 stripe), pre-shutdown row (warm-500 stripe),
// third-party observance row (peach stripe).

export const today = '2026-05-11';

export const events = [
  {
    id: 'evt-001',
    date: '2026-05-11',
    time: '07:00',
    duration: 30,
    title: 'Morning Brief readout',
    type: 'standard',
    location: 'cockpit'
  },
  {
    id: 'evt-002',
    date: '2026-05-11',
    time: '10:00',
    duration: 45,
    title: 'Zoom — Daniel Schuchalter (Watermills DD)',
    type: 'zoom',
    tier: 'L6',
    contactId: 'inv-002',
    location: 'zoom',
    language: 'he'
  },
  {
    id: 'evt-003',
    date: '2026-05-11',
    time: '11:30',
    duration: 30,
    title: 'שיחה עם אבי מזרחי — PSA',
    type: 'call',
    tier: 'L6',
    contactId: 'inv-006',
    location: 'phone',
    language: 'he'
  },
  {
    id: 'evt-004',
    date: '2026-05-11',
    time: '13:00',
    duration: 60,
    title: 'Lunch / break',
    type: 'block',
    location: 'home'
  },
  {
    id: 'evt-005',
    date: '2026-05-11',
    time: '14:30',
    duration: 30,
    title: 'Call — broker on Magna Southfield',
    type: 'call',
    location: 'phone'
  },
  {
    id: 'evt-006',
    date: '2026-05-11',
    time: '15:30',
    duration: 60,
    title: 'Zoom — Amir Shenkman (intro)',
    type: 'zoom',
    tier: 'L5',
    contactId: 'inv-004',
    location: 'zoom'
  },
  {
    id: 'evt-007',
    date: '2026-05-11',
    time: '17:00',
    duration: 45,
    title: 'Brainstorm — 500 West Monroe OSINT',
    type: 'work',
    location: 'cockpit'
  },
  // Friday Shabbat onset (success-500 stripe in Calendar pillar)
  {
    id: 'evt-008',
    date: '2026-05-15',
    time: '19:48',
    duration: 0,
    title: 'Shabbat begins (Postville, IA)',
    type: 'shabbat',
    locked: true
  },
  // Friday 3-hour pre-shutdown lock (warm-500 stripe)
  {
    id: 'evt-009',
    date: '2026-05-15',
    time: '16:48',
    duration: 180,
    title: 'Pre-shutdown lock — wrap day',
    type: 'pre-shutdown',
    locked: true
  },
  // Third-party observance row (peach stripe)
  {
    id: 'evt-010',
    date: '2026-05-13',
    time: 'all-day',
    duration: 0,
    title: 'Eid al-Fitr (a contact observes)',
    type: 'third-party-observance',
    locked: false
  }
];

export const reminders = [
  {
    id: 'rem-001',
    tier: 'L7',
    title: 'Wire Bay Valley earnest by EOD',
    due: '2026-05-11T17:00:00Z'
  },
  {
    id: 'rem-002',
    tier: 'L6',
    title: 'Counter the Doron 30-day DD extension request',
    due: '2026-05-11T15:00:00Z'
  },
  {
    id: 'rem-003',
    tier: 'L5',
    title: 'Confirm Watermills inspector Tuesday 9 AM',
    due: '2026-05-11T16:00:00Z'
  },
  {
    id: 'rem-004',
    tier: 'L4',
    title: 'Send Magna Southfield underwriting deck to Bryan Morjain',
    due: '2026-05-11T20:00:00Z'
  },
  {
    id: 'rem-005',
    tier: 'L4',
    title: 'Follow up Yaron Sitbon on Freeport Plaza',
    due: '2026-05-11T18:00:00Z'
  },
  {
    id: 'rem-006',
    tier: null,
    title: 'Nudge Adir on Pipedrive cleanup',
    due: '2026-05-12T10:00:00Z'
  },
  {
    id: 'rem-007',
    tier: null,
    title: 'תזכורת — להחזיר לאיתן פרץ באמצע השבוע',
    due: '2026-05-13T11:00:00Z',
    language: 'he'
  }
];
