import { checkEnv, type AdapterStatus } from '../adapters/status'

export function getStatus(): AdapterStatus {
  return checkEnv('anthropic', ['ANTHROPIC_API_KEY'])
}
