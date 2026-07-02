/**
 * CommandRegistry — typed command palette backbone (architecture §2 nav +
 * §4 shared components; roadmap Phase 2 batch 2.3).
 *
 * Pure data + functions, safe to import from client components. The
 * SearchPalette lists ENABLED commands above threads; every deck route is
 * pre-seeded here DISABLED so the palette renders pixel-identical today.
 * When a later batch ships a deck page it flips ONE flag in DECK_ROUTES
 * and the "Go to …" command lights up — no palette changes needed.
 */

export type CommandKind = 'navigate' | 'action'

export interface Command {
  /** Stable unique id, e.g. 'nav:system'. Re-registering an id replaces it. */
  id: string
  /** Human-facing row label, e.g. 'Go to System Deck'. */
  title: string
  /** Extra match terms beyond the title (query matches id/title/keywords). */
  keywords: readonly string[]
  kind: CommandKind
  /** navigate commands: target path (window.location.assign in the palette). */
  href?: string
  /** action commands: side effect to execute. */
  run?: () => void
  /** Evaluated at list time — disabled commands are NEVER listed. */
  enabled: () => boolean
}

export interface CommandRegistry {
  registerCommand: (cmd: Command) => void
  listCommands: (query?: string) => Command[]
}

/**
 * Deck route manifest — the ONE place later batches flip a deck live.
 * Set `enabled: true` when the page under app/cockpit/<deck> ships.
 */
export interface DeckRoute {
  href: string
  title: string
  keywords: readonly string[]
  enabled: boolean
}

export const DECK_ROUTES: Readonly<Record<string, DeckRoute>> = {
  system: {
    href: '/cockpit/system',
    title: 'System Deck',
    keywords: ['system', 'status', 'health', 'schema', 'diagnostics'],
    enabled: false,
  },
  settings: {
    href: '/cockpit/settings',
    title: 'Settings Deck',
    keywords: ['settings', 'preferences', 'config', 'integrations'],
    enabled: false,
  },
  pipeline: {
    href: '/cockpit/pipeline',
    title: 'Pipeline Deck',
    keywords: ['pipeline', 'deals', 'sales', 'stages'],
    enabled: false,
  },
  crm: {
    href: '/cockpit/crm',
    title: 'CRM Deck',
    keywords: ['crm', 'contacts', 'people', 'relationships'],
    enabled: false,
  },
  tasks: {
    href: '/cockpit/tasks',
    title: 'Tasks Deck',
    keywords: ['tasks', 'todo', 'projects', 'work'],
    enabled: false,
  },
  agents: {
    href: '/cockpit/agents',
    title: 'Agents Deck',
    keywords: ['agents', 'ai', 'runs', 'secretary'],
    enabled: false,
  },
  automations: {
    href: '/cockpit/automations',
    title: 'Automations Deck',
    keywords: ['automations', 'workflows', 'rules', 'cron'],
    enabled: false,
  },
  revenue: {
    href: '/cockpit/revenue',
    title: 'Revenue Deck',
    keywords: ['revenue', 'finance', 'billing', 'money', 'mrr'],
    enabled: false,
  },
  files: {
    href: '/cockpit/files',
    title: 'Files Deck',
    keywords: ['files', 'documents', 'storage', 'uploads'],
    enabled: false,
  },
}

/**
 * Create an isolated registry (used by tests and any future scoped palette).
 * Registration replaces by id (idempotent under Fast Refresh re-evaluation);
 * commands themselves are never mutated.
 */
export function createCommandRegistry(
  seed: readonly Command[] = []
): CommandRegistry {
  const commands = new Map<string, Command>()

  const registerCommand = (cmd: Command): void => {
    if (!cmd || typeof cmd.id !== 'string' || cmd.id.length === 0) {
      throw new Error('command_id_required')
    }
    commands.set(cmd.id, cmd)
  }

  for (const cmd of seed) registerCommand(cmd)

  const listCommands = (query = ''): Command[] => {
    const q = query.trim().toLowerCase()
    return [...commands.values()].filter((cmd) => {
      if (!isEnabled(cmd)) return false
      if (q.length === 0) return true
      const haystack = [cmd.id, cmd.title, ...cmd.keywords]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }

  return { registerCommand, listCommands }
}

/** A command whose enabled() throws must never take down the palette. */
function isEnabled(cmd: Command): boolean {
  try {
    return cmd.enabled() === true
  } catch {
    return false
  }
}

/** Seed navigate commands from the deck manifest (flag-gated, all off today). */
export function deckNavCommands(
  routes: Readonly<Record<string, DeckRoute>> = DECK_ROUTES
): Command[] {
  return Object.entries(routes).map(([key, route]) => ({
    id: `nav:${key}`,
    title: `Go to ${route.title}`,
    keywords: [key, 'deck', 'go', 'open', ...route.keywords],
    kind: 'navigate' as const,
    href: route.href,
    enabled: () => route.enabled,
  }))
}

/** Default app-wide registry, pre-seeded with the (disabled) deck routes. */
const defaultRegistry = createCommandRegistry(deckNavCommands())

export const registerCommand: CommandRegistry['registerCommand'] =
  defaultRegistry.registerCommand
export const listCommands: CommandRegistry['listCommands'] =
  defaultRegistry.listCommands
