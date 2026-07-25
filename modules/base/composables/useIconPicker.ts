import lucideJson from '@iconify-json/lucide/icons.json'

const allLucideIcons = Object.keys(lucideJson.icons)

/**
 * 图标选择器：搜索 + 分页 + 选择
 */
export function useIconPicker(
  modelValue: () => string,
  pageSize: () => number,
  onUpdate: (val: string) => void,
) {
  const popoverOpen = ref(false)
  const searchText = ref('')
  const page = ref(1)
  const innerValue = ref(modelValue())

  watch(() => modelValue(), (val) => { innerValue.value = val })
  watch(innerValue, (val) => { onUpdate(val) })

  function fullIconName(name: string) {
    if (!name) return 'i-lucide-circle'
    if (name.startsWith('i-') || name.includes(':')) return name
    return `i-lucide-${name}`
  }

  const filterIcons = computed(() => {
    const keyword = searchText.value.trim().toLowerCase()
    if (!keyword) return allLucideIcons
    return allLucideIcons.filter(name => name.toLowerCase().includes(keyword))
  })

  const totalPage = computed(() => Math.ceil(filterIcons.value.length / pageSize()) || 1)

  const pageIcons = computed(() => {
    const start = (page.value - 1) * pageSize()
    return filterIcons.value.slice(start, start + pageSize())
  })

  watch(searchText, () => { page.value = 1 })

  watch(popoverOpen, (val) => {
    if (val) {
      searchText.value = ''
      page.value = 1
    }
  })

  function selectIcon(name: string) {
    innerValue.value = name
    popoverOpen.value = false
  }

  function selectMatchIcon() {
    const kw = searchText.value.trim()
    if (!kw) return
    const firstMatch = filterIcons.value[0]
    if (firstMatch) selectIcon(firstMatch)
  }

  return {
    popoverOpen, searchText, page, innerValue,
    fullIconName, filterIcons, totalPage, pageIcons,
    selectIcon, selectMatchIcon,
  }
}
