/**
 * InviteComposerDrawer — REMOVED (batch 1.7, roadmap Phase 1).
 *
 * The previous implementation was a fully mocked UI: the send button was
 * permanently disabled ("Draft pipeline not wired here yet — use the /center
 * page to queue Terminal invitations"), slot suggestions were hardcoded
 * strings, inputs were uncontrolled placeholders, and the file made zero API
 * calls. Wiring it real would need a Pipedrive contact-search endpoint, a
 * free-slot engine, invite-token creation, and the locked-template send
 * pipeline — and the /center page already owns Terminal-invite queueing.
 *
 * This file is a temporary null stub, NOT the feature: components/cockpit/
 * App.jsx (import + render) and components/cockpit/demo/DemoStatesPanel.jsx
 * ("Invite Composer drawer" button) still reference it and are owned by other
 * work packages. Once those references are removed, DELETE this file. The
 * `inviteComposerOpen` DemoContext key needs no reducer change (generic
 * set(key, value) store; the key simply goes unused). The TopChrome Concierge
 * "Invite" entry that opened this drawer has already been removed.
 */
export default function InviteComposerDrawer() {
  return null;
}
