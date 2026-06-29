import { checkEnv, type AdapterStatus } from '../adapters/status'

export function getStatus(): AdapterStatus {
  return checkEnv('quo', ['OPENPHONE_API_KEY'])
}
