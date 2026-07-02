// Tests for components/cockpit/live/adapters.js — batches 1.3 (contact-name
// resolution + canonical staff roster) and 1.6 (TopChrome KPI derivations).
// Lives under lib/ because vitest.config.ts includes only lib/**/*.test.ts.
import { describe, it, expect } from 'vitest'
// eslint-disable-next-line import/extensions
import { adaptThreads, deriveKpis } from '@/components/cockpit/live/adapters.js'

function adaptOne(row: Record<string, unknown>) {
  // adaptThreads is typed Array<object> via JSDoc — widen for property access.
  const [adapted] = adaptThreads([row], []) as Array<Record<string, unknown>>
  return adapted
}

describe('adaptThreads contact-name resolution (batch 1.3)', () => {
  it('falls back to formatted phone when contact_name is null', () => {
    // Arrange
    const row = { panel: '305', channel_type: 'sms', contact_name: null, phone: '+13055551234' }

    // Act
    const thread = adaptOne(row)

    // Assert
    expect(thread.contactName).toBe('+1 (305) 555-1234')
  })

  it('formats Israeli numbers via the shared formatter', () => {
    // Arrange
    const row = { panel: '718', channel_type: 'whatsapp', contact_name: '', phone: '+972541234567' }

    // Act
    const thread = adaptOne(row)

    // Assert
    expect(thread.contactName).toBe('+972 54-123-4567')
  })

  it('returns Unknown when both contact_name and phone are missing', () => {
    // Arrange
    const row = { panel: '305', channel_type: 'whatsapp', contact_name: null, phone: null, jid: 'x@g.us' }

    // Act
    const thread = adaptOne(row)

    // Assert
    expect(thread.contactName).toBe('Unknown')
  })

  it('ignores whitespace-only contact_name and uses the phone fallback', () => {
    // Arrange
    const row = { panel: '305', channel_type: 'sms', contact_name: '   ', phone: '+13055551234' }

    // Act
    const thread = adaptOne(row)

    // Assert
    expect(thread.contactName).toBe('+1 (305) 555-1234')
  })

  it('keeps a real contact_name untouched', () => {
    // Arrange
    const row = { panel: '305', channel_type: 'whatsapp', contact_name: 'Jane Doe', phone: '+13055551234' }

    // Act
    const thread = adaptOne(row)

    // Assert
    expect(thread.contactName).toBe('Jane Doe')
  })
})

describe('adaptThreads staff classification via canonical roster (batch 1.3)', () => {
  it('flags roster names as staff', () => {
    // Arrange
    const row = { panel: '305', channel_type: 'whatsapp', contact_name: 'Chaim Katz' }

    // Act
    const thread = adaptOne(row)

    // Assert
    expect(thread.staffTag).toBe(true)
  })

  it('lane_override general opts a roster name out of staff', () => {
    // Arrange
    const row = { panel: '305', channel_type: 'whatsapp', contact_name: 'Chaim Katz', lane_override: 'general' }

    // Act
    const thread = adaptOne(row)

    // Assert
    expect(thread.staffTag).toBe(false)
  })

  it('staff outranks investor (Adir rule preserved)', () => {
    // Arrange
    const row = { panel: '305', channel_type: 'whatsapp', contact_name: 'Adir', is_investor: true }

    // Act
    const thread = adaptOne(row)

    // Assert
    expect(thread.staffTag).toBe(true)
    expect(thread.isInvestor).toBe(false)
  })

  it('non-roster names are not staff', () => {
    // Arrange
    const row = { panel: '305', channel_type: 'whatsapp', contact_name: 'Jane Doe' }

    // Act
    const thread = adaptOne(row)

    // Assert
    expect(thread.staffTag).toBe(false)
  })
})

describe('deriveKpis (batch 1.6)', () => {
  it('returns all zeros for empty/missing inputs', () => {
    // Arrange / Act
    const kpis = deriveKpis({})

    // Assert
    expect(kpis).toEqual({ unreadComms: 0, unreadEmail: 0, openBucket: 0, meetingsToday: 0 })
  })

  it('tolerates non-array inputs', () => {
    // Arrange / Act
    const malformed = { threads: null, emails: undefined, noraToYou: 'nope', events: 42 }
    const kpis = deriveKpis(malformed as unknown as Parameters<typeof deriveKpis>[0])

    // Assert
    expect(kpis).toEqual({ unreadComms: 0, unreadEmail: 0, openBucket: 0, meetingsToday: 0 })
  })

  it('sums numeric thread unread counts and skips non-numeric ones', () => {
    // Arrange
    const threads = [{ unread: 2 }, { unread: 0 }, { unread: 3 }, { unread: 'x' }, {}]

    // Act
    const kpis = deriveKpis({ threads })

    // Assert
    expect(kpis.unreadComms).toBe(5)
  })

  it('counts only emails with unread === true', () => {
    // Arrange
    const emails = [{ unread: true }, { unread: false }, { unread: 1 }, {}]

    // Act
    const kpis = deriveKpis({ emails })

    // Assert
    expect(kpis.unreadEmail).toBe(1)
  })

  it('counts only bucket-sourced Nora cards as open bucket items', () => {
    // Arrange
    const noraToYou = [{ source: 'ask' }, { source: 'ask' }, { source: 'bucket' }]

    // Act
    const kpis = deriveKpis({ noraToYou })

    // Assert
    expect(kpis.openBucket).toBe(1)
  })

  it("counts today's meetings as the events length", () => {
    // Arrange
    const events = [{ id: 'a' }, { id: 'b' }]

    // Act
    const kpis = deriveKpis({ events })

    // Assert
    expect(kpis.meetingsToday).toBe(2)
  })
})
