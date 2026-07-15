/**
 * Wrong book modal: paginated loading of wrong question list, keyword search, question type filter
 */
export function useWrongBook(
  props: { modelValue: boolean; courseId: number },
  _emit: (e: 'update:modelValue', v: boolean) => void,
) {
  const { t } = useI18n()

  const items = ref<any[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(10)
  const loading = ref(false)
  const keyword = ref('')
  const filterType = ref('all')

  const pageSizeOptions = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
  ]

  const typeOptions = computed(() => [
    { label: t('question.allTypes'), value: 'all' },
    { label: t('question.typeSingle'), value: 'single' },
    { label: t('question.typeJudge'), value: 'judge' },
    { label: t('question.typeMultiple'), value: 'multiple' },
    { label: t('question.typeFill'), value: 'fill' },
    { label: t('question.typeSelect'), value: 'select' },
    { label: t('question.typeSort'), value: 'sort' },
    { label: t('question.typeClassify'), value: 'classify' },
    { label: t('question.typeMatch'), value: 'match' },
    { label: t('question.typeShortAnswer'), value: 'short-answer' },
  ])

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  // Debounced search
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  watch(keyword, () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      page.value = 1
      refetch()
    }, 400)
  })
  watch(filterType, () => {
    page.value = 1
    refetch()
  })
  watch(pageSize, () => {
    page.value = 1
    refetch()
  })

  // Reset and load when modal opens
  watch(
    () => props.modelValue,
    (val) => {
      if (val) {
        page.value = 1
        keyword.value = ''
        filterType.value = 'all'
        refetch()
      }
    },
  )

  function prevPage() {
    if (page.value > 1) {
      page.value--
      refetch()
    }
  }

  function nextPage() {
    if (page.value < totalPages.value) {
      page.value++
      refetch()
    }
  }

  async function refetch() {
    loading.value = true
    try {
      const params: any = {
        page: page.value,
        pageSize: pageSize.value,
      }
      if (props.courseId) params.course_id = props.courseId
      if (keyword.value.trim()) params.keyword = keyword.value.trim()
      if (filterType.value && filterType.value !== 'all') params.type = filterType.value

      const qs = new URLSearchParams(params).toString()
      const res = await cRequest(`/api/questions/wrong-list?${qs}`)
      items.value = res?.items || []
      total.value = res?.total || 0
    } catch {
      items.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    total,
    page,
    pageSize,
    loading,
    keyword,
    filterType,
    pageSizeOptions,
    typeOptions,
    totalPages,
    prevPage,
    nextPage,
    refetch,
  }
}
