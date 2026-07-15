/**
 * tableOverride utility tests
 * @see modules/admin/utils/tableOverride.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('utils/tableOverride - 注册与查询', () => {
  it('registerTableOverride 合并写入（不覆盖未提供的字段）', async () => {
    const { registerTableOverride, useTableOverride } = await import('../../utils/tableOverride')
    const FakeShow = { name: 'FakeShow' } as any
    const FakeForm = { name: 'FakeForm' } as any

    registerTableOverride('questions', { show: FakeShow })
    registerTableOverride('questions', { form: FakeForm })

    const { override } = useTableOverride(() => 'questions')
    // Two registrations merge: both show and form are kept
    expect(override.value.show).toBe(FakeShow)
    expect(override.value.form).toBe(FakeForm)
  })

  it('未注册的表返回空对象', async () => {
    const { useTableOverride } = await import('../../utils/tableOverride')
    const { override } = useTableOverride(() => 'unknownTable')
    expect(override.value.show).toBeUndefined()
    expect(override.value.form).toBeUndefined()
  })

  it('hasFormOverride / hasShowOverride / hasDeleteOverride computed', async () => {
    const { registerTableOverride, useTableOverride } = await import('../../utils/tableOverride')
    const FakeForm = { name: 'FakeForm' } as any
    const delFn: any = async () => {}

    registerTableOverride('homeworks', { form: FakeForm, delete: delFn })
    const { hasFormOverride, hasShowOverride, hasDeleteOverride } = useTableOverride(() => 'homeworks')

    expect(hasFormOverride.value).toBe(true)
    expect(hasShowOverride.value).toBe(false)
    expect(hasDeleteOverride.value).toBe(true)
  })

  it('响应式：tableName 变化时 override 重新计算', async () => {
    const { registerTableOverride, useTableOverride } = await import('../../utils/tableOverride')
    const FakeShow = { name: 'FakeShow' } as any
    // Use a table name not registered by other test cases to avoid REGISTRY singleton pollution
    registerTableOverride('races', { show: FakeShow })

    const { ref } = await import('vue')
    const nameRef = ref('comments')
    const { override, hasShowOverride } = useTableOverride(nameRef)

    expect(hasShowOverride.value).toBe(false)
    nameRef.value = 'races'
    expect(hasShowOverride.value).toBe(true)
    expect(override.value.show).toBe(FakeShow)
  })
})
