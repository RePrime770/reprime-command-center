# Final Command Center Consolidation — Design

**Date:** 2026-06-19
**Status:** Approved (brainstorming phase complete)
**Owner:** Kazi Musharraf (engineer) · Gideon Gratsiani (product owner)

## Background

Kazi opened a session asking to create a new "final command center" repo, mirrored across his GitHub and Gideon's GitHub, with the "best of the best" code from every related Vercel project consolidated into it.

A data-driven audit (`~/Command Center/VERCEL_GITHUB_INVENTORY_2026-06-19.md`) revealed the actual state of the universe is much smaller than that framing implies:

- Gideon's GitHub has **one** Command Center repo (`RePrime770/reprime-command-center`), already wired to production at `project-7e87w.vercel.app`.
- Two additional Vercel deployments exist as LOCKED references (the cockpit design mock `terminal-artifact-v2.vercel.app` and the build-package spec `public-nu-six-60.vercel.app`) — read-only by directive, not edit targets.
- Kazi has three Command-Center-adjacent repos in his GitHub (`reprime-data-platform`, `reprime-atlas`, `real-estate-terminal`). Kazi confirmed these stay as **separate standalone projects** — not consolidation targets.

There is therefore no code scattered across versions to be merged. The existing production repo IS the consolidated source. "Final command center" reduces to: keep what exists, give Kazi a working copy, clean up cruft.

## Goals

1. Establish Kazi's GitHub as a working copy of the production repo so he has personal control of a checkout.
2. Preserve all production state (Vercel deploy connection, custom domain wiring, branch history, open PRs).
3. Remove low-value cruft (stale merged branches, duplicate local mock copies) so future engineers aren't confused.
4. Produce zero downtime for Gideon's daily-use dashboard during and after the operation.

## Non-goals

1. Renaming the repo. (Decision: keep the name `reprime-command-center`.)
2. Creating a brand-new repo or migrating off the current one.
3. Merging code from `reprime-data-platform`, `reprime-atlas`, or `real-estate-terminal`.
4. Touching the two locked reference deployments.
5. Migrating to a GitHub Organization (deferred — possible future cleanup, not required now).
6. Any change to Vercel project ownership, custom domain configuration, or environment variables.

## Design decisions

### D1 · Repo strategy — keep existing, no rename

`RePrime770/reprime-command-center` stays as-is, both in name and ownership. It remains the single source of truth and the Vercel deploy source for `project-7e87w.vercel.app`.

### D2 · Dual-GitHub model — fork pattern

Kazi forks `RePrime770/reprime-command-center` into `kazi-reprime/reprime-command-center` via the GitHub UI. The fork is a personal working copy used for WIP / experimental branches that aren't ready to land in Gideon's tree. Day-to-day PRs against Gideon's repo continue to work because Kazi already has Collaborator access (granted 2026-06-19).

Sync between fork and source uses GitHub's built-in mechanisms: the "Sync fork" button in the GitHub UI, or `git pull upstream main && git push origin main` from a local clone with `upstream` set to Gideon's repo.

### D3 · Three Kazi-side related repos — no action

`reprime-data-platform`, `reprime-atlas`, `real-estate-terminal` remain unchanged. They are not renamed, not merged, not touched.

### D4 · Cleanup — bundled into a single follow-up branch

The following cleanups land together on a `chore/consolidation-cleanup` branch, separate from this spec branch:

- **Stale merged branches in `RePrime770/reprime-command-center`** — the ~40 `feat/*` and `fix/*` branches that have already been merged into `main`. Each one verified merged via `git branch -r --merged origin/main` before deletion. Unmerged or in-flight branches are left alone.
- **Local workspace duplicates** — `~/Command Center/checker/` and `~/Command Center/checker.zip` (superseded by `~/Command Center/checker-pkg/`); `~/Command Center/manifest.json` (79-byte misplaced file); two of three `terminal-artifact-v2*` dirs (keep the canonical one inside `build-package/`, remove the other two).

### D5 · Vercel — untouched

`project-7e87w.vercel.app` continues to deploy from `RePrime770/reprime-command-center/main`. No Vercel project renames, no deploy source changes, no env-var rotation. The two locked reference deployments stay locked.

## Action plan

| # | Action | Owner | Duration | Risk |
|---|---|---|---|---|
| 1 | Fork `RePrime770/reprime-command-center` → `kazi-reprime/reprime-command-center` | Kazi (one click on GitHub) | 5 sec | None |
| 2 | Set up `upstream` remote in Kazi's local clone, pointing at Gideon's repo | Kazi (`git remote add upstream …`) | 1 min | None |
| 3 | Land this spec on `docs/consolidation-spec` branch + open PR for Gideon to review | Claude (this session) | 2 min | None — docs-only |
| 4 | Land the cleanup on `chore/consolidation-cleanup` branch + open PR | Claude (after spec approval) | 15 min | Low — only stale-merged branches deleted, files Kazi controls locally |

## Risks

- **Branch deletion mistake** — if a not-actually-merged branch is deleted from origin, work is lost. Mitigation: every deletion gated by `git branch -r --merged origin/main` check. Anything ambiguous stays.
- **Vercel build interruption during this work** — none expected. No production code paths are modified by this operation.
- **GitHub fork divergence later** — if Kazi's fork drifts from Gideon's, future merges get conflict-y. Mitigation: documented sync workflow in the consolidation cleanup PR's description.

## Alternatives considered

- **Brand-new repo `final-command-center`** — Rejected. Loses 5 months of git history without benefit. Vercel re-wiring introduces production-cutover risk. Doesn't solve any actual problem because there's no code elsewhere to consolidate.
- **GitHub Organization migration** — Deferred. Cleaner long-term ownership model but requires coordinating with Gideon to re-authorize the Vercel GitHub app for the new org. Worth doing when there's downtime to coordinate, not as part of this work.
- **Code merge from `reprime-data-platform` / `reprime-atlas` / `real-estate-terminal`** — Rejected per Kazi's decision (these are separate projects).

## Next step

After Kazi reviews + approves this spec, transition to the `writing-plans` skill to produce the implementation plan for the cleanup branch.
