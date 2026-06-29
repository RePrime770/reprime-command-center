import { checkEnv, type AdapterStatus } from '../adapters/status'

export function getStatus(): AdapterStatus {
  return checkEnv('upstash', ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'])
}
