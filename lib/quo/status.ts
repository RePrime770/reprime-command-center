import { checkEnv, type AdapterStatus } from '../adapters/status'

export function getStatus(): AdapterStatus {
  // The send/recording routes read QUO_API_KEY — checking OPENPHONE_API_KEY
  // here made the health pill report SMS as broken (or fine) incorrectly.
  return checkEnv('quo', ['QUO_API_KEY'])
}
