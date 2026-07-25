/**
 * useClasses composable 测试
 * @see modules/base/composables/useClasses.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('composables/useClasses', () => {
  it('初始 classes 为空数组', async () => {
    const { useClasses } = await import('../../composables/useClasses')
    const { classes, classOptions } = useClasses()
    expect(classes.value).toEqual([])
    expect(classOptions.value).toEqual([{ label: '', value: null }])
  })

  it('loadClasses 加载班级列表', async () => {
    setMockFetchHandler(async (url) => {
      if (url.startsWith('/api/classes/list')) {
        return { data: [{ id: 1, name: 'Class A', code: 'A001' }, { id: 2, name: 'Class B', code: 'B002' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useClasses } = await import('../../composables/useClasses')
    const { classes, classOptions, loadClasses } = useClasses()
    await loadClasses()
    expect(classes.value).toHaveLength(2)
    expect(classes.value[0].name).toBe('Class A')
    expect(classOptions.value).toHaveLength(3) // 1 empty + 2 classes
    expect(classOptions.value[1].label).toBe('Class A')
    expect(classOptions.value[1].value).toBe(1)
  })

  it('loadClasses 失败时 classes 为空', async () => {
    setMockFetchHandler(async () => {
      return { data: null, success: false, msg: 'failed' }
    })
    const { useClasses } = await import('../../composables/useClasses')
    const { classes, loadClasses } = useClasses()
    await loadClasses()
    expect(classes.value).toEqual([])
  })

  it('loadClasses 第二次调用不重复请求（缓存）', async () => {
    let callCount = 0
    setMockFetchHandler(async (url) => {
      if (url.startsWith('/api/classes/list')) {
        callCount++
        return { data: [{ id: 1, name: 'A', code: 'A' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useClasses } = await import('../../composables/useClasses')
    const { loadClasses } = useClasses()
    await loadClasses()
    await loadClasses()
    expect(callCount).toBe(1)
  })

  it('loadClasses(force=true) 强制重新加载', async () => {
    let callCount = 0
    setMockFetchHandler(async (url) => {
      if (url.startsWith('/api/classes/list')) {
        callCount++
        return { data: [{ id: 1, name: 'A', code: 'A' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useClasses } = await import('../../composables/useClasses')
    const { loadClasses } = useClasses()
    await loadClasses()
    await loadClasses(true)
    expect(callCount).toBe(2)
  })
})

describe('composables/useGenderOptions', () => {
  it('返回 3 个性别选项', async () => {
    const { useGenderOptions } = await import('../../composables/useClasses')
    const opts = useGenderOptions()
    expect(opts.value).toHaveLength(3)
    expect(opts.value.map(o => o.value)).toEqual(['male', 'female', 'other'])
  })
})
