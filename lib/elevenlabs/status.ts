import { checkEnv, type AdapterStatus } from '../adapters/status'

export function getStatus(): AdapterStatus {
  return checkEnv('elevenlabs', ['ELEVENLABS_API_KEY'])
}
