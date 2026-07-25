/**
 * composables/useUserEditModal 测试
 * @see modules/base/composables/useUserEditModal.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('composables/useUserEditModal - 初始状态', () => {
  it('open/loading/saving 初始为 false，form 为空', async () => {
    const { useUserEditModal } = await import('../../composables/useUserEditModal')
    const { open, loading, saving, form } = useUserEditModal(() => null, () => {})
    expect(open.value).toBe(false)
    expect(loading.value).toBe(false)
    expect(saving.value).toBe(false)
    expect(form.value.name).toBe('')
    expect(form.value.classId).toBeNull()
  })
})

describe('composables/useUserEditModal - show / closeModal', () => {
  it('show 设置 open=true', async () => {
    const { useUserEditModal } = await import('../../composables/useUserEditModal')
    const { show, open } = useUserEditModal(() => null, () => {})
    show()
    expect(open.value).toBe(true)
  })

  it('closeModal 设置 open=false', async () => {
    const { useUserEditModal } = await import('../../composables/useUserEditModal')
    const { show, closeModal, open } = useUserEditModal(() => null, () => {})
    show()
    closeModal()
    expect(open.value).toBe(false)
  })
})

describe('composables/useUserEditModal - watch open 加载用户', () => {
  it('open=true 且有 userId 时加载用户数据', async () => {
    setMockFetchHandler(async () => ({
      data: { name: 'Alice', preferName: 'Al', englishName: 'A', email: 'a@x.com', gender: 'female', avatarImg: '', rollNumber: '001', telephone: '123', classId: 5 },
      success: true,
      msg: '',
    }))
    const { useUserEditModal } = await import('../../composables/useUserEditModal')
    const userId = ref<number | null>(null)
    const { open, form, loading } = useUserEditModal(() => userId.value, () => {})
    userId.value = 10
    open.value = true
    await vi.waitFor(() => {
      expect(form.value.name).toBe('Alice')
      expect(form.value.email).toBe('a@x.com')
      expect(form.value.classId).toBe(5)
    })
    expect(loading.value).toBe(false)
  })

  it('open=true 但 userId=null 时不加载', async () => {
    const { useUserEditModal } = await import('../../composables/useUserEditModal')
    const { open, form } = useUserEditModal(() => null, () => {})
    open.value = true
    expect(form.value.name).toBe('')
  })
})

describe('composables/useUserEditModal - saveUser', () => {
  it('无 userId 时 saveUser 直接返回', async () => {
    const { useUserEditModal } = await import('../../composables/useUserEditModal')
    let saved = false
    const { saveUser } = useUserEditModal(() => null, () => { saved = true })
    await saveUser()
    expect(saved).toBe(false)
  })

  it('保存成功后弹成功 toast、调用 onSaved、关闭弹窗', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useUserEditModal } = await import('../../composables/useUserEditModal')
    let saved = false
    const { open, show, saveUser } = useUserEditModal(() => 5, () => { saved = true })
    show()
    await saveUser()
    expect(saved).toBe(true)
    expect(open.value).toBe(false)
    const calls = getToastCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0].color).toBe('success')
  })

  it('保存失败时弹错误 toast 且不关闭弹窗', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'forbidden' }))
    const { useUserEditModal } = await import('../../composables/useUserEditModal')
    let saved = false
    const { open, show, saveUser } = useUserEditModal(() => 5, () => { saved = true })
    show()
    await saveUser()
    expect(saved).toBe(false)
    expect(open.value).toBe(true)
    const calls = getToastCalls()
    expect(calls[0].color).toBe('error')
    expect(calls[0].title).toBe('forbidden')
  })
})
