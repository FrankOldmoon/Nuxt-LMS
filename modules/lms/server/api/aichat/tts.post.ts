/**
 * TTS 语音合成接口（edge-tts）
 * POST /api/aichat/tts
 *
 * body: { text, voice?, rate?, pitch?, volume?, lang?, gender? }
 * - voice:  edge-tts 语音名（如 zh-CN-XiaoxiaoNeural），优先级最高
 * - lang:   语言代码（如 zh-CN），voice 未指定时按 lang+gender 选默认语音
 * - gender: 'female' | 'male'，voice 未指定时按性别筛选
 * - rate:   语速 0.1-10（1=正常），映射为 edge-tts 百分比
 * - pitch:  音调 0-2（1=正常），映射为 edge-tts Hz 偏移
 * - volume: 音量 0-1（1=正常），映射为 edge-tts 百分比
 *
 * 成功返回 MP3 二进制（Content-Type: audio/mpeg）
 * 失败返回 JSON { data, msg, success: false }
 */
import { EdgeTTS } from 'edge-tts-universal'

/** 按语言+性别映射默认 edge-tts 语音名 */
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

/** 从 lang+gender 选默认语音名，无匹配时回退到 en-US */
function pickDefaultVoice(lang?: string, gender?: 'female' | 'male'): string {
  const langCode = (lang || 'en-US').trim()
  const voices = DEFAULT_VOICES[langCode] ?? DEFAULT_VOICES['en-US']!
  return voices![gender || 'female']
}

/**
 * 浏览器参数 → edge-tts 参数映射
 * - rate:   0.1-10（1=正常）→ 百分比字符串（如 "+50%", "-30%"），范围限制 -50%~+100%
 * - pitch:  0-2（1=正常）→ Hz 偏移字符串（如 "+25Hz"），范围限制 -50Hz~+50Hz
 * - volume: 0-1（1=正常）→ 百分比字符串（如 "-50%"），范围限制 -100%~+0%
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
    return cResp(null, 'text 不能为空', false)
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
    console.error('[TTS] edge-tts 合成失败:', e)
    setResponseStatus(event, 500)
    return cResp(null, e?.message || '语音合成失败', false)
  }
})
