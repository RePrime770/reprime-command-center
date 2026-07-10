/**
 * Fabric adapters barrel (roadmap ZT-2). Import this module (not the
 * individual adapter files) to guarantee every provider adapter has
 * registered itself with lib/fabric/registry before routeCapability runs.
 *
 * Future adapter modules (e.g. tts.ts, sms.ts, email.ts) get added here.
 */
import './stt'
import './llm'
import './tts'
