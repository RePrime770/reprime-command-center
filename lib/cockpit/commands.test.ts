import { describe, expect, test } from 'vitest'
import {
  createCommandRegistry,
  deckNavCommands,
  listCommands,
  DECK_ROUTES,
  type Command,
} from './commands'

const cmd = (overrides: Partial<Command> & { id: string }): Command => ({
  title: overrides.id,
  keywords: [],
  kind: 'action',
  run: () => undefined,
  enabled: () => true,
  ...overrides,
})

describe('createCommandRegistry — registration', () => {
  test('registers a command and lists it', () => {
    // Arrange
    const registry = createCommandRegistry()

    // Act
    registry.registerCommand(cmd({ id: 'a', title: 'Alpha' }))

    // Assert
    expect(registry.listCommands().map((c) => c.id)).toEqual(['a'])
  })

  test('re-registering the same id replaces the command', () => {
    // Arrange
    const registry = createCommandRegistry()
    registry.registerCommand(cmd({ id: 'a', title: 'Old' }))

    // Act
    registry.registerCommand(cmd({ id: 'a', title: 'New' }))

    // Assert
    const listed = registry.listCommands()
    expect(listed).toHaveLength(1)
    expect(listed[0].title).toBe('New')
  })

  test('throws command_id_required for a missing id', () => {
    const registry = createCommandRegistry()
    expect(() =>
      registry.registerCommand(cmd({ id: '' }))
    ).toThrowError('command_id_required')
  })
})

describe('createCommandRegistry — query filtering', () => {
  const registry = createCommandRegistry([
    cmd({ id: 'nav:sys', title: 'Go to System Deck', keywords: ['health'] }),
    cmd({ id: 'nav:rev', title: 'Go to Revenue Deck', keywords: ['money'] }),
  ])

  test('matches by keyword', () => {
    expect(registry.listCommands('health').map((c) => c.id)).toEqual([
      'nav:sys',
    ])
  })

  test('matches by title, case-insensitive', () => {
    expect(registry.listCommands('REVENUE').map((c) => c.id)).toEqual([
      'nav:rev',
    ])
  })

  test('matches by id', () => {
    expect(registry.listCommands('nav:sys').map((c) => c.id)).toEqual([
      'nav:sys',
    ])
  })

  test('empty query lists all enabled commands', () => {
    expect(registry.listCommands('')).toHaveLength(2)
    expect(registry.listCommands()).toHaveLength(2)
  })

  test('non-matching query lists nothing', () => {
    expect(registry.listCommands('zzz-no-match')).toEqual([])
  })
})

describe('createCommandRegistry — disabled commands never listed', () => {
  test('enabled:false commands are excluded with and without a query', () => {
    // Arrange
    const registry = createCommandRegistry([
      cmd({ id: 'on', title: 'Visible', enabled: () => true }),
      cmd({ id: 'off', title: 'Visible Too', enabled: () => false }),
    ])

    // Act + Assert — 'off' matches the query textually but is disabled.
    expect(registry.listCommands().map((c) => c.id)).toEqual(['on'])
    expect(registry.listCommands('visible').map((c) => c.id)).toEqual(['on'])
  })

  test('a throwing enabled() is treated as disabled, not fatal', () => {
    const registry = createCommandRegistry([
      cmd({
        id: 'boom',
        enabled: () => {
          throw new Error('probe failed')
        },
      }),
    ])
    expect(registry.listCommands()).toEqual([])
  })

  test('flipping the manifest flag enables the seeded command', () => {
    // Arrange — same wiring as deckNavCommands: enabled reads the flag object.
    const routes = {
      system: {
        href: '/cockpit/system',
        title: 'System Deck',
        keywords: ['system'],
        enabled: false,
      },
    }
    const registry = createCommandRegistry(deckNavCommands(routes))
    expect(registry.listCommands('system')).toEqual([])

    // Act — the ONE-flag flip later batches perform.
    const flipped = { ...routes, system: { ...routes.system, enabled: true } }
    const liveRegistry = createCommandRegistry(deckNavCommands(flipped))

    // Assert
    const listed = liveRegistry.listCommands('system')
    expect(listed.map((c) => c.id)).toEqual(['nav:system'])
    expect(listed[0].href).toBe('/cockpit/system')
    expect(listed[0].kind).toBe('navigate')
  })
})

describe('default registry — deck seeds', () => {
  const expectedDecks = [
    'system',
    'settings',
    'pipeline',
    'crm',
    'tasks',
    'agents',
    'automations',
    'revenue',
    'files',
  ]

  test('DECK_ROUTES covers every planned deck with a /cockpit href', () => {
    expect(Object.keys(DECK_ROUTES).sort()).toEqual([...expectedDecks].sort())
    for (const [key, route] of Object.entries(DECK_ROUTES)) {
      expect(route.href).toBe(`/cockpit/${key}`)
    }
  })

  test('palette lists exactly the decks whose manifest flag is enabled', () => {
    // Manifest-derived (not hardcoded): each deck batch flips its own flag,
    // so this test stays true as decks ship one by one.
    const enabledIds = Object.entries(DECK_ROUTES)
      .filter(([, route]) => route.enabled)
      .map(([key]) => `nav:${key}`)
      .sort()

    expect(listCommands().map((c) => c.id).sort()).toEqual(enabledIds)
    expect(listCommands('deck').map((c) => c.id).sort()).toEqual(enabledIds)

    for (const [key, route] of Object.entries(DECK_ROUTES)) {
      const listed = listCommands(key).some((c) => c.id === `nav:${key}`)
      expect(listed).toBe(route.enabled)
    }
  })

  test('the settings deck is live in the palette (batch 3.3 flag flip)', () => {
    const listed = listCommands('settings')
    expect(listed.map((c) => c.id)).toContain('nav:settings')
    expect(listed.find((c) => c.id === 'nav:settings')?.href).toBe('/cockpit/settings')
  })
})
