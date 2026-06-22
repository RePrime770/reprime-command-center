// Nora's Desk data — the two-way box.
//   noraToYou : what Nora pushes up to Gideon (call recaps, reminders, questions, Zoom summaries).
//               Every item is a piece of WORK with a clear ask + one-tap actions.
//   youToNora : the command log going the other way (Gideon tells Nora to call / Zoom / remind).
// Mock data — all real people from Gideon's orbit (no fabricated roster).

export const noraToYou = [
  {
    id: 'nd-1',
    type: 'call',
    who: 'Doron Sagiv',
    when: '9:42 AM',
    urgent: true,
    nudge: '2nd nudge',
    summary: 'Called about Bay Valley — wants to push DD another 30 days. You already used the one extension (1/1).',
    ask: 'Call him back, or should I set a Zoom?',
    actions: ['Call back', 'Set Zoom', 'Draft reply', 'Done', 'Snooze']
  },
  {
    id: 'nd-2',
    type: 'question',
    who: 'Bruce Smoler',
    when: '8:45 AM',
    urgent: true,
    nudge: 'waiting 1h',
    summary: 'Texted for the Bay Valley wire instructions so he can release escrow today.',
    ask: 'Send the wire instructions, or hold?',
    actions: ['Approve send', 'Hold', 'Reply']
  },
  {
    id: 'nd-3',
    type: 'zoom',
    who: 'Watermills DD · Zoom',
    when: 'Yesterday 4:30 PM',
    urgent: false,
    summary: 'Meeting wrapped. 3 action items: inspector access Tuesday AM, updated rent roll to the lender, Doron call before Shabbat.',
    ask: 'Want these as 3 tasks?',
    actions: ['Make tasks', 'Open notes', 'Done']
  },
  {
    id: 'nd-4',
    type: 'reminder',
    who: 'Send rent roll → Daniel Schuchalter',
    when: 'due 2:00 PM',
    urgent: false,
    summary: 'You asked me to remind you to send the Watermills rent roll.',
    ask: 'Send it now?',
    actions: ['Done', 'Snooze 1h']
  },
  {
    id: 'nd-5',
    type: 'question',
    who: 'Amir Shenkman',
    when: '7:40 AM',
    urgent: false,
    summary: 'Asked if Magna Southfield is still at an 8.37% cap.',
    ask: 'Confirm 8.37%?',
    actions: ['Reply: yes', 'Open deal', 'Done']
  },
  {
    id: 'nd-6',
    type: 'call',
    who: 'Unknown · 305',
    when: '9:12 AM',
    urgent: false,
    summary: 'Missed call, no voicemail. Number is not in your 1,567 contacts.',
    ask: 'Want me to text them to ask who it is?',
    actions: ['Text them', 'Block', 'Ignore']
  }
];

export const youToNora = [
  { id: 'yn-1', from: 'you',  text: 'Nora, set a Zoom with Doron before Shabbat' },
  { id: 'yn-2', from: 'nora', text: 'On it — I have Doron’s email. Invite sent for Thursday 2:00 PM. ✓' },
  { id: 'yn-3', from: 'you',  text: 'Remind me to call Neil Bane at 4' },
  { id: 'yn-4', from: 'nora', text: 'Set. I’ll nudge you at 4:00 — and again at 4:15 if you don’t move on it.' }
];

// Quick-command chips under the input (mock — non-functional taps)
export const noraQuickCommands = ['Call someone', 'Set a Zoom', 'Remind me', 'Draft a message'];
