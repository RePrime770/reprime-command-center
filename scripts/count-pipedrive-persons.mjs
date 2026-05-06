import { readFileSync } from 'node:fs'

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i); if (!m) continue
  let v = m[2]; if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!process.env[m[1]]) process.env[m[1]] = v
}

const TOKEN = process.env.PIPEDRIVE_API_TOKEN
let total = 0, start = 0, more = true, pages = 0
while (more && pages < 30) {
  const r = await fetch(`https://api.pipedrive.com/v1/persons?limit=500&start=${start}&api_token=${TOKEN}`)
  const j = await r.json()
  total += (j.data?.length ?? 0)
  more = j.additional_data?.pagination?.more_items_in_collection ?? false
  start += 500
  pages++
}
console.log('Pipedrive persons total:', total, 'pages:', pages)
