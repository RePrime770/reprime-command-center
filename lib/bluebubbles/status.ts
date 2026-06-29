import { checkEnv, type AdapterStatus } from '../adapters/status'

export function getStatus(): AdapterStatus {
  return checkEnv('bluebubbles', ['BLUEBUBBLES_SERVER_URL', 'BLUEBUBBLES_PASSWORD'])
}
