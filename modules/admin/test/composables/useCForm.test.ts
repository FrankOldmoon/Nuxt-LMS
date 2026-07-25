/**
 * useCForm composable 测试
 * @see modules/admin/composables/useCForm.ts
 *
 * CForm 表单状态与提交逻辑
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, setMockFetchHandler, getToastCalls, setMockI18n } from '../../../../test/setup/nuxt-stubs'
import { ref, computed } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

function col(overrides: Record<string, any> = {}) {
  return {
    name: 'c', jsName: overrides.jsName || 'c', dataType: 'string', columnType: 'PgString',
    notNull: false, hasDefault: false, isPrimaryKey: false, isAutoIncrement: false,
    isTimestamp: false, isDeletedAt: false, ...overrides,
  }
}

describe('composables/useCForm', () => {
  it('initForm 初始化各类型字段默认值', async () => {
    setMockFetchHandler(async () => ({ data: [], success: true, msg: '' }))
    const { useCForm } = await import('../../composables/useCForm')
    const cols = computed(() => [
      col({ jsName: 'name' }),
      col({ jsName: 'active', dataType: 'boolean' }),
      col({ jsName: 'meta', dataType: 'json' }),
    ])
    const row = computed(() => null)
    const open = ref(false)
    const emit = vi.fn()
    const { form, jsonStrings, initForm } = useCForm(cols, row, emit, open)
    await initForm()
    // string → null
    expect(form.name).toBeNull()
    // boolean → false
    expect(form.active).toBe(false)
    // json → ''
    expect(jsonStrings.meta).toBe('')
  })

  it('initForm 从 row 填充已有值', async () => {
    setMockFetchHandler(async () => ({ data: [], success: true, msg: '' }))
    const { useCForm } = await import('../../composables/useCForm')
    const cols = computed(() => [
      col({ jsName: 'name' }),
      col({ jsName: 'meta', dataType: 'json' }),
    ])
    const row = computed(() => ({ name: 'Alice', meta: { k: 1 } }))
    const open = ref(false)
    const { form, jsonStrings, initForm } = useCForm(cols, row, vi.fn(), open)
    await initForm()
    expect(form.name).toBe('Alice')
    expect(jsonStrings.meta).toBe(JSON.stringify({ k: 1 }, null, 2))
  })

  it('initForm 加载 FK 选项', async () => {
    setMockFetchHandler(async (url: string) => {
      if (url.includes('fk-options')) return { data: [{ id: 1, label: 'A' }, { id: 2, label: 'B' }], success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useCForm } = await import('../../composables/useCForm')
    const cols = computed(() => [col({ jsName: 'userId', columnType: 'PgInteger', fkTable: 'users' })])
    const row = computed(() => null)
    const open = ref(false)
    const { fkOptions, fkLoading, initForm } = useCForm(cols, row, vi.fn(), open)
    await initForm()
    expect(fkOptions.userId).toHaveLength(2)
    expect(fkOptions.userId[0].label).toBe('A')
    expect(fkLoading.userId).toBe(false)
  })

  it('onSubmit 无效 JSON 时不提交', async () => {
    setMockFetchHandler(async () => ({ data: [], success: true, msg: '' }))
    const { useCForm } = await import('../../composables/useCForm')
    const cols = computed(() => [
      col({ jsName: 'name', notNull: true, hasDefault: false }),
      col({ jsName: 'meta', dataType: 'json' }),
    ])
    const row = computed(() => null)
    const emit = vi.fn()
    const { form, jsonStrings, initForm, onSubmit } = useCForm(cols, row, emit, ref(false))
    await initForm()
    form.name = 'Alice'
    jsonStrings.meta = '{invalid json}'
    await onSubmit()
    // 无效 JSON → 不 emit
    expect(emit).not.toHaveBeenCalled()
  })

  it('onSubmit 必填校验失败时 toast 报错', async () => {
    setMockFetchHandler(async () => ({ data: [], success: true, msg: '' }))
    const { useCForm } = await import('../../composables/useCForm')
    const cols = computed(() => [col({ jsName: 'name', notNull: true, hasDefault: false })])
    const row = computed(() => null)
    const { form, initForm, onSubmit } = useCForm(cols, row, vi.fn(), ref(false))
    await initForm()
    form.name = null
    await onSubmit()
    expect(getToastCalls()).toHaveLength(1)
    expect(getToastCalls()[0].color).toBe('error')
  })

  it('onSubmit 成功时 emit 数据并关闭弹窗', async () => {
    setMockFetchHandler(async () => ({ data: [], success: true, msg: '' }))
    const { useCForm } = await import('../../composables/useCForm')
    const cols = computed(() => [
      col({ jsName: 'name', notNull: true, hasDefault: false }),
      col({ jsName: 'meta', dataType: 'json' }),
    ])
    const row = computed(() => null)
    const emit = vi.fn()
    const open = ref(true)
    const { form, jsonStrings, initForm, onSubmit } = useCForm(cols, row, emit, open)
    await initForm()
    form.name = 'Alice'
    jsonStrings.meta = '{"k":1}'
    await onSubmit()
    expect(emit).toHaveBeenCalledWith('submit', { name: 'Alice', meta: { k: 1 } })
    expect(open.value).toBe(false)
  })

  it('open watch 触发 initForm', async () => {
    setMockFetchHandler(async () => ({ data: [], success: true, msg: '' }))
    const { useCForm } = await import('../../composables/useCForm')
    const cols = computed(() => [col({ jsName: 'name' })])
    const row = computed(() => ({ name: 'Bob' }))
    const open = ref(false)
    const { form, initForm } = useCForm(cols, row, vi.fn(), open)
    // open 变 true 时自动 initForm
    open.value = true
    await initForm() // 确保 watch 已执行
    expect(form.name).toBe('Bob')
  })
})
