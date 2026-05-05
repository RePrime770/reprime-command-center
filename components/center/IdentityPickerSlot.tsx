'use client'

/**
 * IdentityPickerSlot — empty mount point for Track F's IdentityPicker.
 *
 * Track A ships the slot only. Track F (feat/center-identity) mounts its
 * IdentityPicker component into the element with data-slot="identity-picker"
 * via portal or direct child render after merge.
 *
 * The slot reserves space so the TopStrip layout does not jump when the
 * picker mounts.
 */
export default function IdentityPickerSlot() {
  return (
    <div
      data-slot="identity-picker"
      style={{
        minWidth: 180,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexShrink: 0,
        fontFamily: 'inherit',
        fontSize: 11,
        color: 'rgba(255, 204, 51, 0.45)',
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
      }}
    >
      identity
    </div>
  )
}
