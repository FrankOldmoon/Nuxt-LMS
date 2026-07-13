/**
 * useCellView composable 测试
 * @see modules/admin/composables/useCellView.ts
 *
 * 单元格视图：类型判定与各类展示值的派生
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

/** 构造 ColumnMeta */
function col(overrides: Record<string, any> = {}) {
  return {
    name: 'col', jsName: 'col', dataType: 'string', columnType: 'PgString',
    notNull: false, hasDefault: false, isPrimaryKey: false, isAutoIncrement: false,
    isTimestamp: false, isDeletedAt: false, ...overrides,
  }
}

describe('composables/useCellView', () => {
  it('isEmpty 判定 null/undefined/空字符串', async () => {
    const { useCellView } = await import('../../composables/useCellView')
    const c = col()
    const { isEmpty } = useCellView(() => c, () => null)
    expect(isEmpty.value).toBe(true)
    const { isEmpty: isEmpty2 } = useCellView(() => c, () => '')
    expect(isEmpty2.value).toBe(true)
    const { isEmpty: isEmpty3 } = useCellView(() => c, () => 'data')
    expect(isEmpty3.value).toBe(false)
  })

  it('rawString 将 null/undefined 转为空串', async () => {
    const { useCellView } = await import('../../composables/useCellView')
    const c = col()
    const { rawString } = useCellView(() => c, () => null)
    expect(rawString.value).toBe('')
    const { rawString: r2 } = useCellView(() => c, () => 42)
    expect(r2.value).toBe('42')
    const { rawString: r3 } = useCellView(() => c, () => 'hello')
    expect(r3.value).toBe('hello')
  })

  it('dateLabel 格式化有效日期，无效返回原值', async () => {
    const { useCellView } = await import('../../composables/useCellView')
    const c = col()
    const { dateLabel } = useCellView(() => c, () => '2024-01-15T10:30:00Z')
    expect(dateLabel.value).toBeTruthy()
    expect(dateLabel.value).not.toBe('2024-01-15T10:30:00Z')
    const { dateLabel: d2 } = useCellView(() => c, () => 'not-a-date')
    expect(d2.value).toBe('not-a-date')
    const { dateLabel: d3 } = useCellView(() => c, () => '')
    expect(d3.value).toBe('')
  })

  it('jsonPretty 序列化对象，异常时返回 String', async () => {
    const { useCellView } = await import('../../composables/useCellView')
    const c = col()
    const { jsonPretty } = useCellView(() => c, () => ({ a: 1, b: 2 }))
    expect(jsonPretty.value).toContain('"a": 1')
    const { jsonPretty: j2 } = useCellView(() => c, () => 'plain')
    expect(j2.value).toBe('"plain"')
  })

  it('textLabel 超过 60 字符截断加 …', async () => {
    const { useCellView } = await import('../../composables/useCellView')
    const c = col()
    const long = 'x'.repeat(70)
    const { textLabel } = useCellView(() => c, () => long)
    expect(textLabel.value).toHaveLength(61) // 60 + …
    expect(textLabel.value.endsWith('…')).toBe(true)
    const { textLabel: t2 } = useCellView(() => c, () => 'short')
    expect(t2.value).toBe('short')
  })

  it('fullIconName 补全 i-lucide- 前缀', async () => {
    const { useCellView } = await import('../../composables/useCellView')
    const c = col()
    const { fullIconName } = useCellView(() => c, () => null)
    expect(fullIconName('')).toBe('i-lucide-circle')
    expect(fullIconName('table')).toBe('i-lucide-table')
    expect(fullIconName('i-lucide-users')).toBe('i-lucide-users')
    expect(fullIconName('mdi:account')).toBe('mdi:account')
  })
})
