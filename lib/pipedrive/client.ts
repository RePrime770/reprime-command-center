const BASE_URL = 'https://api.pipedrive.com/v1'

function token(): string {
  const t = process.env.PIPEDRIVE_API_TOKEN
  if (!t) throw new Error('PIPEDRIVE_API_TOKEN is not set')
  return t
}

export async function pipedriveRequest<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = new URL(BASE_URL + path)
  url.searchParams.set('api_token', token())

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Pipedrive ${init.method ?? 'GET'} ${path} failed: ${res.status} ${body}`)
  }

  return res.json() as Promise<T>
}

export interface PipedriveDeal {
  id: number
  title: string
  value: number
  currency: string
  status: 'open' | 'won' | 'lost' | 'deleted'
  stage_id: number
  person_id?: number | { value: number; name: string } | null
  org_id?: number | { value: number; name: string } | null
  add_time?: string
  update_time?: string
}

export async function listDeals(
  params: { status?: string; limit?: number; start?: number } = {}
): Promise<PipedriveDeal[]> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.limit !== undefined) qs.set('limit', String(params.limit))
  if (params.start !== undefined) qs.set('start', String(params.start))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const data = await pipedriveRequest<{ data: PipedriveDeal[] | null }>(`/deals${suffix}`)
  return data.data ?? []
}

export async function getDeal(id: number): Promise<PipedriveDeal | null> {
  const data = await pipedriveRequest<{ data: PipedriveDeal | null }>(`/deals/${id}`)
  return data.data
}

export async function createDeal(deal: {
  title: string
  value?: number
  currency?: string
  stage_id?: number
  person_id?: number
  org_id?: number
}): Promise<PipedriveDeal> {
  const data = await pipedriveRequest<{ data: PipedriveDeal }>(`/deals`, {
    method: 'POST',
    body: JSON.stringify(deal),
  })
  return data.data
}
