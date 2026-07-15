/**
 * composables/useIconPicker tests
 * @see modules/base/composables/useIconPicker.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('composables/useIconPicker - 初始状态', () => {
  it('popoverOpen/searchText/page 初始值', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const { popoverOpen, searchText, page, innerValue } = useIconPicker(() => '', () => 20, () => {})
    expect(popoverOpen.value).toBe(false)
    expect(searchText.value).toBe('')
    expect(page.value).toBe(1)
    expect(innerValue.value).toBe('')
  })

  it('innerValue 从 modelValue 初始化', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const { innerValue } = useIconPicker(() => 'i-lucide-home', () => 20, () => {})
    expect(innerValue.value).toBe('i-lucide-home')
  })
})

describe('composables/useIconPicker - fullIconName', () => {
  it('空名返回默认 circle 图标', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const { fullIconName } = useIconPicker(() => '', () => 20, () => {})
    expect(fullIconName('')).toBe('i-lucide-circle')
  })

  it('i- 前缀的名称原样返回', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const { fullIconName } = useIconPicker(() => '', () => 20, () => {})
    expect(fullIconName('i-lucide-home')).toBe('i-lucide-home')
  })

  it('含冒号的名称原样返回', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const { fullIconName } = useIconPicker(() => '', () => 20, () => {})
    expect(fullIconName('lucide:home')).toBe('lucide:home')
  })

  it('无前缀的名称加上 i-lucide- 前缀', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const { fullIconName } = useIconPicker(() => '', () => 20, () => {})
    expect(fullIconName('home')).toBe('i-lucide-home')
  })
})

describe('composables/useIconPicker - filterIcons & pagination', () => {
  it('无关键字时返回全部图标', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const { filterIcons } = useIconPicker(() => '', () => 20, () => {})
    // lucide json has a large number of icons
    expect(filterIcons.value.length).toBeGreaterThan(100)
  })

  it('关键字过滤图标（大小写不敏感）', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const { filterIcons, searchText } = useIconPicker(() => '', () => 20, () => {})
    // lucide icon names use kebab-case; 'arrow' matches a-arrow-down etc.
    searchText.value = 'arrow'
    expect(filterIcons.value.length).toBeGreaterThan(0)
    expect(filterIcons.value.every((n: string) => n.toLowerCase().includes('arrow'))).toBe(true)
  })

  it('totalPage 基于过滤结果和 pageSize 计算', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const { totalPage, searchText } = useIconPicker(() => '', () => 20, () => {})
    const initialTotal = totalPage.value
    expect(initialTotal).toBeGreaterThanOrEqual(1)
    searchText.value = 'zzzznotexist'
    expect(totalPage.value).toBe(1) // Math.ceil(0/20) || 1 = 1
  })

  it('pageIcons 返回当前页的图标切片', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const { pageIcons, page, searchText } = useIconPicker(() => '', () => 5, () => {})
    expect(pageIcons.value).toHaveLength(5)
    page.value = 2
    expect(pageIcons.value).toHaveLength(5)
    // The 1st item on page 2 should differ from the 1st item on page 1
    searchText.value = ''
  })

  it('searchText 变化时 page 重置为 1', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const { page, searchText } = useIconPicker(() => '', () => 20, () => {})
    page.value = 3
    searchText.value = 'arrow'
    await nextTick() // watch(searchText) callback executes asynchronously
    expect(page.value).toBe(1)
  })
})

describe('composables/useIconPicker - selectIcon & selectMatchIcon', () => {
  it('selectIcon 设置 innerValue 并触发 onUpdate', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const calls: string[] = []
    const { innerValue, popoverOpen, selectIcon } = useIconPicker(() => '', () => 20, (v) => calls.push(v))
    selectIcon('i-lucide-star')
    // selectIcon directly sets innerValue.value (synchronous), popoverOpen is also synchronous
    expect(innerValue.value).toBe('i-lucide-star')
    expect(popoverOpen.value).toBe(false)
    // watch(innerValue, ...) asynchronously triggers onUpdate
    await nextTick()
    expect(calls).toEqual(['i-lucide-star'])
  })

  it('selectMatchIcon 在有搜索关键字时选第一个匹配', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const calls: string[] = []
    const { innerValue, searchText, selectMatchIcon, filterIcons } = useIconPicker(() => '', () => 20, (v) => calls.push(v))
    searchText.value = 'arrow'
    await nextTick() // wait for watch(searchText) callback (page reset)
    selectMatchIcon()
    expect(innerValue.value).toBe(filterIcons.value[0])
    await nextTick() // wait for watch(innerValue) callback (onUpdate)
    expect(calls).toHaveLength(1)
  })

  it('selectMatchIcon 无关键字时不操作', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const calls: string[] = []
    const { innerValue, selectMatchIcon } = useIconPicker(() => 'initial', () => 20, (v) => calls.push(v))
    selectMatchIcon()
    expect(innerValue.value).toBe('initial')
    await nextTick()
    expect(calls).toHaveLength(0)
  })
})

describe('composables/useIconPicker - popoverOpen 联动', () => {
  it('打开 popover 时重置 searchText 和 page', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const { popoverOpen, searchText, page } = useIconPicker(() => '', () => 20, () => {})
    searchText.value = 'abc'
    page.value = 5
    popoverOpen.value = true
    await nextTick() // watch(popoverOpen) callback executes asynchronously
    expect(searchText.value).toBe('')
    expect(page.value).toBe(1)
  })
})

describe('composables/useIconPicker - modelValue 同步', () => {
  it('modelValue 变化时同步到 innerValue', async () => {
    const { useIconPicker } = await import('../../composables/useIconPicker')
    const mValue = ref('initial')
    const { innerValue } = useIconPicker(() => mValue.value, () => 20, () => {})
    expect(innerValue.value).toBe('initial')
    mValue.value = 'updated'
    await nextTick() // watch(modelValue) callback executes asynchronously
    expect(innerValue.value).toBe('updated')
  })
})
