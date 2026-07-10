import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Structural check (roadmap ZT-2, batch ZT-2.2): both transcription routes
 * must go through the fabric router rather than hand-rolling Groq/OpenAI
 * client selection. A true integration test would require a real network
 * call to the OpenAI SDK's audio.transcriptions.create, which isn't
 * practical here — see the batch report's DEVIATIONS for why this is a
 * grep-based structural test instead.
 *
 * Lives under lib/fabric/adapters (not app/api/voice) because this repo's
 * vitest config only collects lib/**\/*.test.ts.
 */
const ROUTES_DIR = join(__dirname, '../../../app/api/voice')
const ROUTE_FILES = ['transcribe-en/route.ts', 'transcribe-he/route.ts']

describe('voice transcription routes use the fabric router', () => {
  for (const file of ROUTE_FILES) {
    const source = readFileSync(join(ROUTES_DIR, file), 'utf8')

    it(`${file} imports routeCapability from @/lib/fabric/router`, () => {
      expect(source).toMatch(
        /import\s*\{\s*routeCapability\s*\}\s*from\s*['"]@\/lib\/fabric\/router['"]/
      )
    })

    it(`${file} registers fabric adapters via @/lib/fabric/adapters`, () => {
      expect(source).toMatch(/import\s*['"]@\/lib\/fabric\/adapters['"]/)
    })

    it(`${file} calls routeCapability with 'TRANSCRIBE_AUDIO'`, () => {
      expect(source).toMatch(/routeCapability[^(]*\(\s*['"]TRANSCRIBE_AUDIO['"]/)
    })

    it(`${file} does not hand-roll an OpenAI client for provider selection`, () => {
      expect(source).not.toMatch(/new OpenAI\(/)
      expect(source).not.toMatch(/import OpenAI from ['"]openai['"]/)
    })

    it(`${file} preserves the auth gate, 400 on missing audio, and response shape`, () => {
      expect(source).toMatch(/user\.email !== 'g@reprime\.com'/)
      expect(source).toMatch(/status: 401/)
      expect(source).toMatch(/Missing audio file/)
      expect(source).toMatch(/status: 400/)
    })
  }
})
