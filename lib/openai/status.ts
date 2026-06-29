import { checkEnv, type AdapterStatus } from '../adapters/status'

export function getStatus(): AdapterStatus {
  return checkEnv('openai', ['OPENAI_API_KEY'])
}
