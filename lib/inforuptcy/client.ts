// ─── Inforuptcy connector — Playwright session-poller ──────────────────────
// Inforuptcy.com has no public API. The Investor Maverick subscription
// ($99/mo, paid 2026-05-04) gives us authenticated access to a 6-tenant
// custom search endpoint. We headless-Chromium it via Playwright on Vercel,
// cache cookies in Upstash Redis for 6 hours, and re-auth on 401.
//
// Environment:
//   INFORUPTCY_EMAIL, INFORUPTCY_PASSWORD — Vercel env vars (1Password origin)
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN — session cache
//
// Runtime: Node (NOT edge). Caller must export `runtime = 'nodejs'` and
// `maxDuration` >= 60. @sparticuz/chromium ships a Lambda-compatible
// chromium binary; we fall back to the system browser via CHROME_PATH on
// local dev.

import type { Browser, BrowserContext, Cookie, Page } from 'playwright-core'
import { Redis } from '@upstash/redis'

const COOKIE_KEY = 'inforuptcy:cookies:v1'
const COOKIE_TTL_SECONDS = 6 * 60 * 60 // 6 hours
const LOGIN_URL = 'https://www.inforuptcy.com/login'
const DASHBOARD_URL = 'https://www.inforuptcy.com/dashboard'
const SEARCH_URL_BASE = 'https://www.inforuptcy.com/filings/search-court-filings'
const PAGE_NAV_TIMEOUT_MS = 45_000

export interface InforuptcyCase {
  case_no: string
  tenant: string
  party_title: string | null
  court: string | null
  filed_at: string | null // ISO date (YYYY-MM-DD) or null
  raw: Record<string, unknown>
}

interface CachedCookies {
  cookies: Cookie[]
  cached_at: number
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

async function readCachedCookies(): Promise<Cookie[] | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    const cached = await redis.get<CachedCookies>(COOKIE_KEY)
    if (cached?.cookies?.length) return cached.cookies
  } catch (err) {
    console.error('[inforuptcy] cookie cache read failed', err)
  }
  return null
}

async function writeCachedCookies(cookies: Cookie[]): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set<CachedCookies>(
      COOKIE_KEY,
      { cookies, cached_at: Date.now() },
      { ex: COOKIE_TTL_SECONDS },
    )
  } catch (err) {
    console.error('[inforuptcy] cookie cache write failed', err)
  }
}

async function dropCachedCookies(): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.del(COOKIE_KEY)
  } catch (err) {
    console.error('[inforuptcy] cookie cache drop failed', err)
  }
}

async function launchBrowser(): Promise<Browser> {
  const { chromium: pwChromium } = await import('playwright-core')
  const onServerless =
    !!process.env.AWS_LAMBDA_FUNCTION_VERSION ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview'

  if (onServerless) {
    const sparticuz = (await import('@sparticuz/chromium')).default
    return pwChromium.launch({
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      headless: true,
    })
  }

  // Local dev fallback: rely on CHROME_PATH or the user's bundled chromium.
  return pwChromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
  })
}

async function loginAndCaptureCookies(context: BrowserContext): Promise<Cookie[]> {
  const email = process.env.INFORUPTCY_EMAIL
  const password = process.env.INFORUPTCY_PASSWORD
  if (!email || !password) {
    throw new Error(
      'INFORUPTCY_EMAIL / INFORUPTCY_PASSWORD missing — add to Vercel env (Investor Maverick plan, $99/mo).',
    )
  }

  const page = await context.newPage()
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: PAGE_NAV_TIMEOUT_MS })

  // Inforuptcy's login form uses generic name="email" / name="password" inputs.
  // We try common selectors defensively so a CSS rename doesn't break us.
  const emailInput = page.locator('input[name="email"], input[type="email"]').first()
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first()
  await emailInput.fill(email, { timeout: 15_000 })
  await passwordInput.fill(password, { timeout: 15_000 })

  const submit = page
    .locator('button[type="submit"], input[type="submit"], button:has-text("Sign in"), button:has-text("Log in")')
    .first()
  await Promise.all([
    page.waitForURL((url) => !url.toString().includes('/login'), { timeout: PAGE_NAV_TIMEOUT_MS }),
    submit.click(),
  ])

  // Confirm we landed somewhere authenticated.
  if (page.url().includes('/login')) {
    throw new Error('inforuptcy_login_failed — still on /login after submit')
  }

  const cookies = await context.cookies()
  await page.close()
  return cookies
}

async function navigateAuthenticated(
  context: BrowserContext,
  url: string,
): Promise<{ page: Page; needsReauth: boolean }> {
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_NAV_TIMEOUT_MS })
  const finalUrl = page.url()
  // Inforuptcy bounces unauthenticated requests to /login.
  const needsReauth = /\/login(\b|\/|\?)/i.test(finalUrl)
  return { page, needsReauth }
}

/**
 * Ensure we have a valid Playwright BrowserContext holding live Inforuptcy
 * cookies. Reads cached cookies first; verifies them with a cheap dashboard
 * fetch; re-logs in on 401 / login redirect.
 */
export async function ensureSession(): Promise<{ browser: Browser; context: BrowserContext }> {
  const browser = await launchBrowser()
  try {
    const context = await browser.newContext()
    const cached = await readCachedCookies()
    if (cached) {
      await context.addCookies(cached)
      const probe = await navigateAuthenticated(context, DASHBOARD_URL)
      await probe.page.close()
      if (!probe.needsReauth) {
        return { browser, context }
      }
      // Stale cookies — drop and re-auth.
      await dropCachedCookies()
      await context.clearCookies()
    }
    const fresh = await loginAndCaptureCookies(context)
    await writeCachedCookies(fresh)
    return { browser, context }
  } catch (err) {
    await browser.close().catch(() => {})
    throw err
  }
}

const CASE_NO_RE = /\b(\d+:\d{2}-(?:ap|bk|cv|mc|md|cr)-?\d{4,7})\b/i

function extractCaseNo(text: string): string | null {
  const m = text.match(CASE_NO_RE)
  return m ? m[1].toLowerCase() : null
}

function parseFiledAt(text: string): string | null {
  // Accepts "MM/DD/YYYY", "M/D/YY", "YYYY-MM-DD", "Mar 4, 2025".
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/)
  if (slash) {
    const [, mm, dd, yy] = slash
    const yyyy = yy.length === 2 ? `20${yy}` : yy
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  const named = text.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,
  )
  if (named) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    }
    const mo = months[named[1].slice(0, 3).toLowerCase()]
    if (mo) return `${named[3]}-${mo}-${named[2].padStart(2, '0')}`
  }
  return null
}

interface ScrapedRow {
  case_no_text: string
  cells: string[]
  full_text: string
  href: string | null
}

/**
 * Search Inforuptcy's party-title endpoint for a tenant name and return
 * normalized case rows. Caller is responsible for diffing against the DB.
 */
export async function searchTenant(
  context: BrowserContext,
  tenant: string,
): Promise<{ cases: InforuptcyCase[]; needsReauth: boolean }> {
  const url = `${SEARCH_URL_BASE}?search_type=party_title&search_term=${encodeURIComponent(tenant)}`
  const { page, needsReauth } = await navigateAuthenticated(context, url)
  if (needsReauth) {
    await page.close()
    return { cases: [], needsReauth: true }
  }

  // Wait for either a results table/list or a "no results" indicator.
  await page
    .waitForLoadState('networkidle', { timeout: PAGE_NAV_TIMEOUT_MS })
    .catch(() => undefined)

  // Defensive scrape: look at every row-like element, pick out cells with a
  // bankruptcy/adversary case number, capture surrounding cells as raw context.
  const rawRows: ScrapedRow[] = await page.evaluate(() => {
    const candidates = Array.from(
      document.querySelectorAll('tr, li, .search-result, .result-row, [data-case-no]'),
    )
    return candidates.flatMap((el) => {
      const fullText = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (!fullText) return []
      const cells = Array.from(el.querySelectorAll('td, th, .cell, span, a'))
        .map((c) => (c.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
      const link = el.querySelector('a[href*="/filings/"], a[href*="/case/"]') as
        | HTMLAnchorElement
        | null
      return [
        {
          case_no_text: fullText,
          cells,
          full_text: fullText,
          href: link?.href ?? null,
        },
      ]
    })
  })

  await page.close()

  const seen = new Set<string>()
  const cases: InforuptcyCase[] = []
  for (const row of rawRows) {
    const caseNo = extractCaseNo(row.full_text)
    if (!caseNo || seen.has(caseNo)) continue
    seen.add(caseNo)

    // First cell that *isn't* the case number becomes the party title guess.
    let partyTitle: string | null = null
    let court: string | null = null
    const cellsWithoutCase = row.cells.filter((c) => !CASE_NO_RE.test(c))
    if (cellsWithoutCase.length > 0) partyTitle = cellsWithoutCase[0] || null
    const courtCell = cellsWithoutCase.find((c) => /court|district|bankruptcy/i.test(c))
    if (courtCell) court = courtCell
    const filedAt = parseFiledAt(row.full_text)

    cases.push({
      case_no: caseNo,
      tenant,
      party_title: partyTitle,
      court,
      filed_at: filedAt,
      raw: {
        cells: row.cells.slice(0, 12),
        href: row.href,
        full_text: row.full_text.slice(0, 500),
      },
    })
  }

  return { cases, needsReauth: false }
}

/**
 * Convenience wrapper: open browser, ensure session, search every tenant in
 * sequence (Inforuptcy throttles parallel sessions), close browser. Caller
 * gets a flat array plus a per-tenant breakdown for cron telemetry.
 */
export async function searchTenants(
  tenants: string[],
): Promise<{ all: InforuptcyCase[]; byTenant: Record<string, number>; reauthed: boolean }> {
  let { browser, context } = await ensureSession()
  let reauthed = false
  const all: InforuptcyCase[] = []
  const byTenant: Record<string, number> = {}

  try {
    for (const tenant of tenants) {
      let result = await searchTenant(context, tenant)
      if (result.needsReauth) {
        // Force re-auth once, mid-loop, then retry this tenant.
        await dropCachedCookies()
        await context.close()
        await browser.close().catch(() => {})
        reauthed = true
        ;({ browser, context } = await ensureSession())
        result = await searchTenant(context, tenant)
      }
      byTenant[tenant] = result.cases.length
      all.push(...result.cases)
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  return { all, byTenant, reauthed }
}
