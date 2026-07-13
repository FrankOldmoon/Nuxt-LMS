/**
 * composables/useProfileModal 测试
 * @see modules/base/composables/useProfileModal.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockAuthUser,
  setMockFetchHandler,
  clearMockFetchHandler,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('composables/useProfileModal - 初始状态', () => {
  it('saving 初始为 false，form 各字段为空', async () => {
    const { useProfileModal } = await import('../../composables/useProfileModal')
    const { saving, form } = useProfileModal(ref(false))
    expect(saving.value).toBe(false)
    expect(form.value.name).toBe('')
    expect(form.value.email).toBe('')
    expect(form.value.classId).toBeNull()
  })
})

describe('composables/useProfileModal - watch isOpen', () => {
  it('isOpen 打开且有用户时加载表单数据', async () => {
    setMockAuthUser(
      { id: 1, username: 'alice', name: 'Alice', preferName: 'Al', englishName: 'A', email: 'a@x.com', gender: 'female', avatarImg: 'http://x/a.png', rollNumber: '001', telephone: '123', classId: 5 },
      [{ code: 'student', name: 'Student' }],
    )
    const { useProfileModal } = await import('../../composables/useProfileModal')
    const isOpen = ref(false)
    const { form } = useProfileModal(isOpen)
    isOpen.value = true
    await nextTick() // watch(isOpen) 回调异步执行
    expect(form.value.name).toBe('Alice')
    expect(form.value.preferName).toBe('Al')
    expect(form.value.email).toBe('a@x.com')
    expect(form.value.gender).toBe('female')
    expect(form.value.avatarImg).toBe('http://x/a.png')
    expect(form.value.rollNumber).toBe('001')
    expect(form.value.telephone).toBe('123')
    expect(form.value.classId).toBe(5)
  })

  it('isOpen 打开但无用户时不加载', async () => {
    setMockAuthUser(null)
    const { useProfileModal } = await import('../../composables/useProfileModal')
    const isOpen = ref(false)
    const { form } = useProfileModal(isOpen)
    isOpen.value = true
    expect(form.value.name).toBe('')
  })
})

describe('composables/useProfileModal - closeModal', () => {
  it('closeModal 关闭 isOpen', async () => {
    const { useProfileModal } = await import('../../composables/useProfileModal')
    const isOpen = ref(true)
    const { closeModal } = useProfileModal(isOpen)
    closeModal()
    expect(isOpen.value).toBe(false)
  })
})

describe('composables/useProfileModal - saveProfile', () => {
  it('保存成功后关闭弹窗并弹成功 toast', async () => {
    setMockAuthUser({ id: 1, username: 'alice', name: 'Alice' }, [{ code: 'student', name: 'Student' }])
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useProfileModal } = await import('../../composables/useProfileModal')
    const isOpen = ref(true)
    const { saveProfile, saving } = useProfileModal(isOpen)
    await saveProfile()
    expect(isOpen.value).toBe(false)
    expect(saving.value).toBe(false)
    const calls = getToastCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0].color).toBe('success')
  })

  it('保存失败时弹错误 toast 且不关闭弹窗', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'email taken' }))
    const { useProfileModal } = await import('../../composables/useProfileModal')
    const isOpen = ref(true)
    const { saveProfile } = useProfileModal(isOpen)
    await saveProfile()
    expect(isOpen.value).toBe(true)
    const calls = getToastCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0].color).toBe('error')
    expect(calls[0].title).toBe('email taken')
  })

  it('保存异常时弹错误 toast', async () => {
    setMockFetchHandler(async () => { throw new Error('network') })
    const { useProfileModal } = await import('../../composables/useProfileModal')
    const isOpen = ref(true)
    const { saveProfile, saving } = useProfileModal(isOpen)
    await saveProfile()
    expect(saving.value).toBe(false)
    const calls = getToastCalls()
    expect(calls[0].color).toBe('error')
  })
})
