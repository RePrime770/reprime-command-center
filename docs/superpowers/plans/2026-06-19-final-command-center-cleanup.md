# Final Command Center Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete stale merged branches in the production repo and remove duplicate / superseded files from the local workspace — without touching production code or the Vercel deploy.

**Architecture:** Operational cleanup, not code work. Two areas: (a) ~40 remote `feat/*` and `fix/*` branches that have already been merged to `main` get deleted via `git push origin --delete`, gated by a `--merged origin/main` safety check; (b) local workspace files outside the repo (duplicate mock copies, stale Checker artifacts) get `rm`'d. Vercel and the two locked reference deployments stay untouched.

**Tech Stack:** Git CLI, GitHub CLI (`gh`), `rm`, `ls`. No code dependencies.

**Prerequisite (user action, not in this plan):** Kazi forks `RePrime770/reprime-command-center` → `kazi-reprime/reprime-command-center` via the GitHub UI at https://github.com/RePrime770/reprime-command-center/fork. This is a one-click operation and doesn't gate any task below.

---

## Task 1: Identify stale merged branches

**Files:**
- Create: `/tmp/stale-branches.txt` (scratch list — not committed anywhere)

- [ ] **Step 1: Fetch latest from origin**

```bash
cd "/Users/mkazi/Command Center/reprime-command-center"
git fetch origin --prune
```

Expected output: confirms latest origin refs, prunes any deleted-on-remote branches.

- [ ] **Step 2: Produce the list of remote branches already merged into `origin/main`**

```bash
git branch -r --merged origin/main | \
  grep -v 'origin/HEAD' | \
  grep -v 'origin/main' | \
  sed 's|^[[:space:]]*origin/||' > /tmp/stale-branches.txt
wc -l /tmp/stale-branches.txt
cat /tmp/stale-branches.txt
```

Expected: produces a list of branches (likely 35–42 entries) and prints the count. Every branch listed has had its commits fully merged into main.

- [ ] **Step 3: Sanity-check — verify none of the listed branches are recent / in-flight**

```bash
while IFS= read -r branch; do
  age_days=$(( ($(date +%s) - $(git log -1 --format=%ct "origin/$branch")) / 86400 ))
  printf "%4d days  %s\n" "$age_days" "$branch"
done < /tmp/stale-branches.txt | sort -n
```

Expected: list sorted by age (newest first). Eyeball check: anything aged < 7 days deserves a second look — a recently-pushed branch even if merged might still have follow-up work attached. Move any such branches to `/tmp/keep-branches.txt` and remove from `/tmp/stale-branches.txt`.

- [ ] **Step 4: Verify `feat/research-connectors` is NOT in the stale list**

```bash
grep -E '^feat/research-connectors$' /tmp/stale-branches.txt || echo "OK — not in stale list"
```

Expected: prints "OK — not in stale list" because `feat/research-connectors` was pushed today and not yet merged. If it IS in the list, abort — something is wrong with the merge detection.

- [ ] **Step 5: Verify `docs/consolidation-spec` is NOT in the stale list**

```bash
grep -E '^docs/consolidation-spec$' /tmp/stale-branches.txt || echo "OK — not in stale list"
```

Expected: prints "OK — not in stale list".

---

## Task 2: Delete the stale merged branches

**Files:**
- Read: `/tmp/stale-branches.txt`

- [ ] **Step 1: Dry-run — print the deletion commands without running them**

```bash
while IFS= read -r branch; do
  echo "git push origin --delete \"$branch\""
done < /tmp/stale-branches.txt
```

Expected: one `git push origin --delete <branch>` line per branch in the file. Read the output once — confirm every branch listed is safe to delete.

- [ ] **Step 2: Run the deletions**

```bash
while IFS= read -r branch; do
  echo "--- deleting $branch ---"
  git push origin --delete "$branch"
done < /tmp/stale-branches.txt
```

Expected: each line shows `- [deleted]         <branch>` from the remote. Errors here mean the branch has unmerged commits (shouldn't happen because of Task 1 Step 2, but if it does, the branch is preserved and you move on).

- [ ] **Step 3: Verify deletion via remote list**

```bash
git fetch origin --prune
git branch -r | wc -l
git branch -r | grep -E 'origin/(main|docs/consolidation-spec|feat/research-connectors)' | sort
```

Expected: branch count dropped by ~40. The three branches `origin/main`, `origin/docs/consolidation-spec`, `origin/feat/research-connectors` are all still present.

- [ ] **Step 4: Prune local references to deleted remote branches**

```bash
git remote prune origin 2>&1 | tail -5
```

Expected: prints any stale local refs pruned. If nothing pruned, that's also fine.

---

## Task 3: Identify the canonical `terminal-artifact-v2` directory

**Files:**
- Inspect: `~/Command Center/build-package/terminal-artifact-v2/`
- Inspect: `~/Command Center/terminal-artifact-v2/`
- Inspect: `~/Command Center/terminal-artifact-v2-local/`

- [ ] **Step 1: Confirm `build-package/terminal-artifact-v2/` has the full source tree**

```bash
ls "/Users/mkazi/Command Center/build-package/terminal-artifact-v2/src/panels/" 2>&1 | wc -l
ls "/Users/mkazi/Command Center/build-package/terminal-artifact-v2/" | grep -E '^(package.json|src|index.html|vite.config.js|tailwind.config.js)$'
```

Expected: panel count ≥ 9 (NorasDesk, CommsPanel, EmailPanel, BriefPanel, BucketPanel, DealsPanel, InvestorsPanel, OpsPanel, PanelShell), plus all 5 named files are listed. This is THE canonical copy — keep.

- [ ] **Step 2: Confirm `~/Command Center/terminal-artifact-v2/` is a duplicate (full source + node_modules)**

```bash
ls "/Users/mkazi/Command Center/terminal-artifact-v2/" | head -20
du -sh "/Users/mkazi/Command Center/terminal-artifact-v2/"
```

Expected: similar file list to the canonical one, plus a `node_modules/` dir making it large (likely 100MB+). This is the duplicate that came with the README labeling itself "Phase 4 Validation Artifact, 5120×1440 viewport." Confirms it's the same content as the canonical, just with node_modules.

- [ ] **Step 3: Confirm `terminal-artifact-v2-local/` is just a build output**

```bash
ls "/Users/mkazi/Command Center/terminal-artifact-v2-local/"
du -sh "/Users/mkazi/Command Center/terminal-artifact-v2-local/"
```

Expected: only `assets/` + `index.html` (no `src/`, no `node_modules/`). Small. Confirms it's a built static output, not source.

---

## Task 4: Remove duplicate local mock copies

**Files:**
- Delete: `~/Command Center/terminal-artifact-v2/`
- Delete: `~/Command Center/terminal-artifact-v2-local/`

- [ ] **Step 1: Final pre-delete check — confirm the canonical copy still works**

```bash
ls "/Users/mkazi/Command Center/build-package/terminal-artifact-v2/src/" | head
test -f "/Users/mkazi/Command Center/build-package/terminal-artifact-v2/package.json" && echo "Canonical present"
```

Expected: prints source files + "Canonical present".

- [ ] **Step 2: Remove the duplicate full-source dir**

```bash
rm -rf "/Users/mkazi/Command Center/terminal-artifact-v2"
ls -d "/Users/mkazi/Command Center/terminal-artifact-v2" 2>&1
```

Expected: second `ls` returns "No such file or directory".

- [ ] **Step 3: Remove the build-output dir**

```bash
rm -rf "/Users/mkazi/Command Center/terminal-artifact-v2-local"
ls -d "/Users/mkazi/Command Center/terminal-artifact-v2-local" 2>&1
```

Expected: second `ls` returns "No such file or directory".

- [ ] **Step 4: Verify the canonical copy is untouched**

```bash
ls "/Users/mkazi/Command Center/build-package/terminal-artifact-v2/" | head
```

Expected: same file list as before, unchanged.

---

## Task 5: Remove stale Checker artifacts

**Files:**
- Delete: `~/Command Center/checker/`
- Delete: `~/Command Center/checker.zip`
- Delete: `~/Command Center/manifest.json` (79-byte misplaced file)

- [ ] **Step 1: Confirm `checker-pkg/` is the canonical Checker layout**

```bash
ls -la "/Users/mkazi/Command Center/checker-pkg/"
test -f "/Users/mkazi/Command Center/checker-pkg/manifest.json" && echo "Canonical manifest at checker-pkg/"
test -f "/Users/mkazi/Command Center/checker-pkg/checker/check.js" && echo "Canonical check.js at checker-pkg/checker/"
```

Expected: directory listing shows `manifest.json` + `checker/check.js`; both echo lines print.

- [ ] **Step 2: Check what's in the stale `checker/` and `checker.zip` top-level entries**

```bash
ls -la "/Users/mkazi/Command Center/checker/" 2>&1 | head
ls -la "/Users/mkazi/Command Center/checker.zip" 2>&1
ls -la "/Users/mkazi/Command Center/manifest.json" 2>&1
```

Expected: `checker/` is just an older partial layout, `checker.zip` is the original zip (38KB), and the top-level `manifest.json` is 79 bytes (a stub, not the real manifest).

- [ ] **Step 3: Remove the stale top-level Checker files**

```bash
rm -rf "/Users/mkazi/Command Center/checker"
rm -f "/Users/mkazi/Command Center/checker.zip"
rm -f "/Users/mkazi/Command Center/manifest.json"
ls "/Users/mkazi/Command Center/" | grep -iE 'checker|manifest'
```

Expected: the final `ls` shows only `checker-pkg` (no `checker`, no `checker.zip`, no top-level `manifest.json`).

- [ ] **Step 4: Verify the canonical Checker still runs**

```bash
cd "/Users/mkazi/Command Center/checker-pkg"
node checker/check.js "/Users/mkazi/Command Center/reprime-command-center" --no-alert 2>&1 | head -3
```

Expected: prints the same headline line as before ("Cockpit check: 516 of 516 FILLED…"). The Checker is still operable.

---

## Task 6: Final verification + close the cleanup

**Files:**
- Inspect: `~/Command Center/` (top-level layout)
- Inspect: `RePrime770/reprime-command-center` (remote branches)

- [ ] **Step 1: Snapshot the cleaned workspace**

```bash
ls -la "/Users/mkazi/Command Center/" | grep -vE '^total|^\.|^d.*\s\.$|^d.*\s\.\.$'
```

Expected: clean listing with `reprime-command-center/`, `build-package/`, `checker-pkg/`, `installed-plugins/`, the 3 `.pptx`/`.xlsx` docs, `COMMAND_CENTER.md`, `VERCEL_GITHUB_INVENTORY_2026-06-19.md`. No duplicate `terminal-artifact-v2*` dirs. No top-level `checker*` or `manifest.json`.

- [ ] **Step 2: Snapshot remote branch state**

```bash
cd "/Users/mkazi/Command Center/reprime-command-center"
git ls-remote --heads origin | wc -l
git ls-remote --heads origin | awk '{print $2}' | sed 's|refs/heads/||' | sort
```

Expected: total branch count is ~5 (down from ~45). Listed branches should be: `main`, `docs/consolidation-spec`, `feat/research-connectors`, plus any genuinely in-flight Gideon work that was excluded in Task 1 Step 3.

- [ ] **Step 3: Verify production deploy is still healthy**

```bash
curl -sI https://project-7e87w.vercel.app/api/health 2>&1 | head -5
curl -s https://project-7e87w.vercel.app/api/health | head -200
```

Expected: HTTP 200 from headers, JSON body showing `overall: "ok"` or `"degraded"` (degraded is acceptable as long as `db.reachable: true`). NOT 5xx, NOT "down". If down, something unrelated changed — investigate before declaring cleanup complete.

- [ ] **Step 4: Update inventory doc with post-cleanup state**

```bash
date_iso="$(date -u +%Y-%m-%d)"
cat >> "/Users/mkazi/Command Center/VERCEL_GITHUB_INVENTORY_2026-06-19.md" <<EOF

---

## Cleanup completed on $date_iso

- Remote branches deleted: $(wc -l < /tmp/stale-branches.txt) stale merged branches
- Local dirs removed: terminal-artifact-v2/, terminal-artifact-v2-local/, checker/
- Local files removed: checker.zip, manifest.json (top-level stub)
- Canonical sources preserved: build-package/terminal-artifact-v2/, checker-pkg/
- Production health: verified OK at https://project-7e87w.vercel.app/api/health
EOF
echo "Inventory updated."
```

Expected: prints "Inventory updated." The doc gets an addendum recording what was done.

- [ ] **Step 5: Confirm clean working tree in the repo**

If during the work above any in-repo docs were modified (none in the current plan), commit them here. Otherwise the working tree should already be clean:

```bash
cd "/Users/mkazi/Command Center/reprime-command-center"
git status -sb
```

Expected: clean working tree (nothing modified inside the repo by this plan). If the working tree shows changes that weren't introduced by this plan, investigate before continuing.

---

## Out of scope (deferred)

- GitHub Organization migration (D2 alternative in spec — deferred to a future PR)
- Plans A / B / C work (Tasks #7-9 in the TaskList — separate planning required, blocked by spec for each)
- Vercel project-side renaming or deploy source change (D5 — explicitly out of scope)
