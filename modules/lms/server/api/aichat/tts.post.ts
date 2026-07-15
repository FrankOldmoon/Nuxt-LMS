/**
 * TTS speech synthesis endpoint (edge-tts)
 * POST /api/aichat/tts
 *
 * body: { text, voice?, rate?, pitch?, volume?, lang?, gender? }
 * - voice:  edge-tts voice name (e.g. zh-CN-XiaoxiaoNeural), highest priority
 * - lang:   language code (e.g. zh-CN), used to pick default voice by lang+gender when voice is not specified
 * - gender: 'female' | 'male', used to filter default voice when voice is not specified
 * - rate:   speech rate 0.1-10 (1=normal), mapped to edge-tts percentage
 * - pitch:  pitch 0-2 (1=normal), mapped to edge-tts Hz offset
 * - volume: volume 0-1 (1=normal), mapped to edge-tts percentage
 *
 * On success returns MP3 binary (Content-Type: audio/mpeg)
 * On failure returns JSON { data, msg, success: false }
 */
import { EdgeTTS } from 'edge-tts-universal'

/** Default edge-tts voice names mapped by language and gender */
const DEFAULT_VOICES: Record<string, { female: string; male: string }> = {
  'zh-CN': { female: 'zh-CN-XiaoxiaoNeural', male: 'zh-CN-YunxiNeural' },
  'zh-TW': { female: 'zh-TW-HsiaoChenNeural', male: 'zh-TW-YunJuiNeural' },
  'en-US': { female: 'en-US-EmmaMultilingualNeural', male: 'en-US-GuyNeural' },
  'en-GB': { female: 'en-GB-SoniaNeural', male: 'en-GB-RyanNeural' },
  'ja-JP': { female: 'ja-JP-NanamiNeural', male: 'ja-JP-KeitaNeural' },
  'ko-KR': { female: 'ko-KR-SunHiNeural', male: 'ko-KR-InJoonNeural' },
  'fr-FR': { female: 'fr-FR-DeniseNeural', male: 'fr-FR-HenriNeural' },
  'de-DE': { female: 'de-DE-KatjaNeural', male: 'de-DE-ConradNeural' },
  'es-ES': { female: 'es-ES-ElviraNeural', male: 'es-ES-AlvaroNeural' },
  'it-IT': { female: 'it-IT-ElsaNeural', male: 'it-IT-DiegoNeural' },
  'ru-RU': { female: 'ru-RU-SvetlanaNeural', male: 'ru-RU-DmitryNeural' },
  'pt-BR': { female: 'pt-BR-FranciscaNeural', male: 'pt-BR-AntonioNeural' },
}

/** Pick the default voice name from lang+gender, fall back to en-US if no match */
function pickDefaultVoice(lang?: string, gender?: 'female' | 'male'): string {
  const langCode = (lang || 'en-US').trim()
  const voices = DEFAULT_VOICES[langCode] ?? DEFAULT_VOICES['en-US']!
  return voices![gender || 'female']
}

/**
 * Browser parameter -> edge-tts parameter mapping
 * - rate:   0.1-10 (1=normal) -> percentage string (e.g. "+50%", "-30%"), range limited to -50% ~ +100%
 * - pitch:  0-2 (1=normal) -> Hz offset string (e.g. "+25Hz"), range limited to -50Hz ~ +50Hz
 * - volume: 0-1 (1=normal) -> percentage string (e.g. "-50%"), range limited to -100% ~ +0%
 */
function mapRate(rate?: number): string {
  if (rate === undefined || rate === null || rate === 1) return '+0%'
  const pct = Math.round((Math.max(0.1, Math.min(10, rate)) - 1) * 100)
  return `${pct >= 0 ? '+' : ''}${Math.max(-50, Math.min(100, pct))}%`
}

function mapPitch(pitch?: number): string {
  if (pitch === undefined || pitch === null || pitch === 1) return '+0Hz'
  const hz = Math.round((Math.max(0, Math.min(2, pitch)) - 1) * 50)
  return `${hz >= 0 ? '+' : ''}${Math.max(-50, Math.min(50, hz))}Hz`
}

function mapVolume(volume?: number): string {
  if (volume === undefined || volume === null || volume === 1) return '+0%'
  const pct = Math.round((Math.max(0, Math.min(1, volume)) - 1) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

export default eventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody(event)
  const { text, voice, rate, pitch, volume, lang, gender } = body || {}

  if (!text || !String(text).trim()) {
    setResponseStatus(event, 400)
    return cResp(null, 'text cannot be empty', false)
  }

  const voiceName = voice || pickDefaultVoice(lang, gender)

  try {
    const tts = new EdgeTTS(String(text), voiceName, {
      rate: mapRate(rate),
      pitch: mapPitch(pitch),
      volume: mapVolume(volume),
    })

    const result = await tts.synthesize()
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer())

    setResponseHeader(event, 'Content-Type', 'audio/mpeg')
    setResponseHeader(event, 'Content-Length', audioBuffer.length)
    setResponseHeader(event, 'Cache-Control', 'no-store')
    return audioBuffer
  } catch (e: any) {
    console.error('[TTS] edge-tts synthesis failed:', e)
    setResponseStatus(event, 500)
    return cResp(null, e?.message || 'Speech synthesis failed', false)
  }
})
