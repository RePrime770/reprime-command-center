/**
 * Staff lane routing — drives the Comms cockpit's Staff sub-pillar.
 *
 * Any 1:1 thread whose contact name matches one of these tokens (case-insensitive
 * word boundary) is classified as Staff. Group threads whose group title contains
 * one of these tokens are kept (not filtered out) and also flipped into Staff.
 *
 * To override classification for a specific thread, use PATCH
 * `/api/whatsapp/threads/[id]` with `{ lane_override: 'staff' | 'general' }`.
 * The lane_override always wins.
 *
 * To add a person, add their first name (or a distinctive contact-name token)
 * below. Names matching here also OUTRANK the isInvestor flag, so e.g. Adir
 * appears in Staff even though he's marked investor-side.
 */
export const STAFF_NAME_TOKENS: readonly string[] = [
  'Shirel',
  'Kazi',
  'Steve',
  'Adir',
  'Chaim',
] as const

const STAFF_NAME_REGEX = new RegExp(
  `\\b(${STAFF_NAME_TOKENS.join('|')})\\b`,
  'i'
)

/**
 * Returns true when the given contact / group name should land in the Staff
 * lane based on the roster above. Tolerant of nullish input.
 */
export function isStaffName(name: string | null | undefined): boolean {
  if (!name) return false
  return STAFF_NAME_REGEX.test(name)
}
