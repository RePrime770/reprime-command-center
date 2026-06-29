import { checkEnv, type AdapterStatus } from '../adapters/status'

export function getStatus(): AdapterStatus {
  return checkEnv('groq', ['GROQ_API_KEY'])
}
