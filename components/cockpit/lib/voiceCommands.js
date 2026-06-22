// Voice command grammar inventory (Doc D Section 6 — full catalog).
// All start with "Nora, ..." (or wake-word variant per Doc A Section 1.3 alias map).
// STT aliases that ALL silently map to Nora: Nora / Noah / Norah / Norra / Naura / Vlad / Hi Jen / Gen N.

export const voiceCommands = {
  global: [
    'Nora, search [query]',
    'Nora, search for [contact] in 305',
    'Nora, search only deals',
    'Nora, read me the top result',
    'Nora, system status',
    'Nora, when is Shabbat?',
    "Nora, what's marked today?",
    'Nora, when is Pesach?',
    'Nora, tag [contact] observes [observance]'
  ],
  comms: [
    "Nora, open [contact]'s thread",
    'Nora, hush on this one',
    'Nora, this is urgent — override channel lock',
    'Nora, soften that draft',
    'Nora, send'
  ],
  scheduling: [
    'Nora, schedule a Zoom with [contact] [time]',
    'Nora, schedule an in-person meeting with [contact] [time] at [location]',
    'Nora, schedule a call with [contact] [time]',
    'Nora, schedule a 30-min call with [contact]',
    'Nora, set up a call with Doron tomorrow at 2 — call with Nora',
    'Nora, schedule lunch with [contact]',
    'Nora, move the [meeting] to [new time]',
    'Nora, remind me to [task] at [time]',
    "Nora, what's on my calendar today?",
    "Nora, when's my next meeting?"
  ],
  calls: [
    'Nora, call [contact]',
    'Nora, call with Nora',
    'Nora, call alone',
    'Nora, quick call',
    'Nora, mute',
    'Nora, unmute',
    'Nora, hold off',
    'Nora, take over the close'
  ],
  mission: [
    'Nora, [mission description]',
    'Nora, hold the mission — let me restate',
    "Nora, what's the status of all my missions?",
    'Nora, status on [mission name]',
    'Nora, cancel [mission name]',
    'Nora, retry [mission name]'
  ],
  morningBrief: [
    'Nora, read me the brief',
    'Nora, skip to deals',
    'Nora, snooze item 3',
    "Nora, what's the apex today?",
    'Nora, regenerate the brief',
    "Nora, regenerate the brief, don't read it",
    'Nora, evening review',
    'Nora, read item [N]'
  ],
  brainstorm: [
    'Nora, resume [project] brainstorm',
    'Nora, start fresh',
    'Nora, skip to [state]',
    'Nora, go back to [state]'
  ],
  aiLauncher: [
    'Nora, ask Perplexity [question]',
    'Nora, ask Claude [question]',
    'Nora, ask Gemini [question]',
    'Nora, deep research on [topic]'
  ],
  modelTier: ['Nora, switch to Sonnet', 'Nora, switch to Opus', 'Nora, back to Haiku'],
  documents: [
    'Nora, file this in [folder/deal]',
    "Nora, what'd you file last?",
    "Nora, where's the [filename or descriptor]?"
  ],
  notes: ['Nora, take a note', 'Nora, show notes from [date/project]'],
  pinsTasks: [
    'Nora, pin [item]',
    'Nora, unpin [item]',
    'Nora, show me my pins',
    'Nora, add to bucket — [task]',
    "Nora, what's in my bucket today?",
    'Nora, move [task] to this week',
    "Nora, what's at L7?"
  ],
  loiDeal: ["Nora, what's outstanding?"],
  speechify: [
    'Nora, read me this',
    'Nora, slow down',
    'Nora, speed up',
    'Nora, normal pace'
  ],
  overrides: [
    'Nora, dispatch directly',
    'Nora, show me the transcript'
  ]
};
