/**
 * useTts composable test
 * @see modules/lms/composables/useTts.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useTts', () => {
  it('初始状态正确', async () => {
    const { useTts } = await import('../../composables/useTts')
    const { text, selectedLang, selectedVoice, selectedGender, rate, pitch, volume, isSpeaking, isPaused, error } = useTts()
    expect(text.value).toBe('')
    expect(selectedLang.value).toBe('zh-CN')
    expect(selectedVoice.value).toBe('')
    expect(selectedGender.value).toBe('female')
    expect(rate.value).toBe(1)
    expect(pitch.value).toBe(1)
    expect(volume.value).toBe(1)
    expect(isSpeaking.value).toBe(false)
    expect(isPaused.value).toBe(false)
    expect(error.value).toBe('')
  })

  it('isSupported 在 happy-dom 环境返回 true', async () => {
    const { useTts } = await import('../../composables/useTts')
    const { isSupported } = useTts()
    expect(isSupported.value).toBe(true)
  })

  it('filteredVoices 按语言和性别筛选', async () => {
    const { useTts } = await import('../../composables/useTts')
    const { filteredVoices, selectedLang, selectedGender } = useTts()
    selectedLang.value = 'zh-CN'
    selectedGender.value = 'female'
    expect(filteredVoices.value.length).toBeGreaterThan(0)
    // All returned voices should belong to zh-CN
    for (const v of filteredVoices.value) {
      expect(v.lang).toBe('zh-CN')
    }
  })

  it('handleSpeak 空文本时不执行', async () => {
    const { useTts } = await import('../../composables/useTts')
    const { handleSpeak, isSpeaking } = useTts()
    await handleSpeak()
    expect(isSpeaking.value).toBe(false)
  })

  it('handlePause 切换暂停状态', async () => {
    const { useTts } = await import('../../composables/useTts')
    const { handlePause, isPaused } = useTts()
    expect(isPaused.value).toBe(false)
    handlePause()
    expect(isPaused.value).toBe(true)
    handlePause()
    expect(isPaused.value).toBe(false)
  })

  it('handleStop 重置状态', async () => {
    const { useTts } = await import('../../composables/useTts')
    const { handleStop, isSpeaking, isPaused } = useTts()
    handleStop()
    expect(isSpeaking.value).toBe(false)
    expect(isPaused.value).toBe(false)
  })

  it('languageMap 已导出', async () => {
    const { useTts } = await import('../../composables/useTts')
    const { languageMap } = useTts()
    expect(languageMap).toBeDefined()
  })
})
