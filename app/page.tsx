import { redirect } from 'next/navigation'

// The Command Center's front door is the live cockpit. Visiting the bare URL
// must land on the current, live experience — never the old dashboard. The
// previous root dashboard is preserved at /legacy as a fallback surface.
//
// Auth flow: proxy.ts gates everything to the g@reprime.com session, so an
// unauthenticated visitor is sent to /login (enter code REPRIME) first; an
// authenticated visitor lands straight on /cockpit.
export const dynamic = 'force-dynamic'

export default function Home() {
  redirect('/cockpit')
}
