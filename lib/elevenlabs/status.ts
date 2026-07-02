import { checkEnv, type AdapterStatus } from '../adapters/status'

export function getStatus(): AdapterStatus {
  // /api/voice/speak requires BOTH the key and a voice id; without the voice
  // id TTS 503s even though the key is present.
  return checkEnv('elevenlabs', ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID'])
}
