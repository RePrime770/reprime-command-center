// Emails with 3-tier row height mix (Tall / Standard / Compact).
// Tall: hero priority. Standard: normal. Compact: background / archive-candidates.
// Multi-inbox (g@reprime.com, g@floridastatetrust.com, gm@cr-pro.com).

export const emails = [
  // Tall (apex / Tier-1/2)
  {
    id: 'em-001',
    height: 'tall',
    tier: 'L7',
    from: 'Doron Sagiv',
    fromAddr: 'doron@sagivholdings.co.il',
    inbox: 'g@reprime.com',
    subject: 'Bay Valley — counter-LOI attached',
    preview:
      'Gideon — attaching the revised LOI per our conversation. Key change: 30-day DD extension. The team flagged some environmental questions we want answered before committing the second tranche. PDF inside.',
    ts: '2026-05-11T07:55:00Z',
    unread: true,
    attachments: ['Bay-Valley-Counter-LOI-v2.pdf'],
    language: 'en'
  },
  {
    id: 'em-002',
    height: 'tall',
    tier: 'L6',
    from: 'Bruce Smoler',
    fromAddr: 'bruce@smolerlaw.com',
    inbox: 'g@reprime.com',
    subject: 'Bay Valley escrow — funded, awaiting wire instructions',
    preview:
      'Earnest deposit hit escrow this morning. Need wire instructions to release per the PSA. Please confirm bank + routing by 5pm CT today or we push to tomorrow.',
    ts: '2026-05-11T08:45:00Z',
    unread: true,
    language: 'en'
  },
  // Standard
  {
    id: 'em-003',
    height: 'standard',
    tier: 'L5',
    from: 'Daniel Schuchalter',
    fromAddr: 'rchen@pillarequity.com',
    inbox: 'g@reprime.com',
    subject: 'Service FCU portfolio — final closing checklist',
    preview: "Attached the closing checklist with my team's red-lines. Two open items.",
    ts: '2026-05-11T06:20:00Z',
    unread: true,
    language: 'en'
  },
  {
    id: 'em-004',
    height: 'standard',
    tier: 'L4',
    from: 'Amir Shenkman',
    fromAddr: 'eitan@peretzinv.co.il',
    inbox: 'gm@cr-pro.com',
    subject: 'תודה על הdeck',
    preview: 'גידעון, תודה על הdeck — אעבור עליו ואחזור אליך באמצע השבוע. שבוע טוב.',
    ts: '2026-05-11T05:30:00Z',
    unread: false,
    language: 'he'
  },
  {
    id: 'em-005',
    height: 'standard',
    tier: null,
    from: 'Bryan Morjain',
    fromAddr: 'j.whitfield@whitfieldam.com',
    inbox: 'g@reprime.com',
    subject: 'Magna Southfield underwriting — can you send the deck?',
    preview: 'Following our call — please send the underwriting deck for Magna Southfield when you have a moment.',
    ts: '2026-05-10T16:40:00Z',
    unread: false,
    language: 'en'
  },
  {
    id: 'em-006',
    height: 'standard',
    tier: null,
    from: 'Chaim Abrahams',
    fromAddr: 'chaim@reprime.com',
    inbox: 'g@reprime.com',
    subject: 'Frayser model uploaded — NOI gap 182%',
    preview: 'Pushed the Frayser model to Drive. Underwriting flagged a 182% NOI gap — needs your review.',
    ts: '2026-05-11T09:10:00Z',
    unread: true,
    language: 'en'
  },
  {
    id: 'em-007',
    height: 'standard',
    tier: null,
    from: 'Neil Bane',
    fromAddr: 'yaron@levinbrokers.com',
    inbox: 'g@floridastatetrust.com',
    subject: 'Watermills inspector — Tuesday access',
    preview: 'Inspector confirmed Tuesday 9 AM walkthrough. Property manager will meet on-site.',
    ts: '2026-05-11T08:00:00Z',
    unread: false,
    language: 'en'
  },
  // Compact
  {
    id: 'em-008',
    height: 'compact',
    tier: null,
    from: 'LinkedIn',
    fromAddr: 'no-reply@linkedin.com',
    inbox: 'g@reprime.com',
    subject: '3 new connection requests',
    preview: 'You have 3 new requests…',
    ts: '2026-05-11T07:00:00Z',
    unread: false,
    language: 'en'
  },
  {
    id: 'em-009',
    height: 'compact',
    tier: null,
    from: 'Calcalist',
    fromAddr: 'newsletter@calcalist.co.il',
    inbox: 'g@floridastatetrust.com',
    subject: 'דיווח שבועי — שוק הנדל"ן',
    preview: 'הסיכום השבועי שלכם…',
    ts: '2026-05-11T06:00:00Z',
    unread: false,
    language: 'he'
  },
  {
    id: 'em-010',
    height: 'compact',
    tier: null,
    from: 'Stripe',
    fromAddr: 'receipts@stripe.com',
    inbox: 'g@reprime.com',
    subject: 'Receipt: HeyGen Pro renewal',
    preview: '$99.00 charged to Visa ending 6813',
    ts: '2026-05-11T04:00:00Z',
    unread: false,
    language: 'en'
  }
];
