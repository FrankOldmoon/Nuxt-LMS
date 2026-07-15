import { ref, reactive, onMounted } from 'vue'

/**
 * Goods editor composable: manage addition, deletion, and modification of goods list
 * - courseId=0: admin manages global goods
 * - courseId>0: teacher/admin manages course-specific goods
 */
export function useGoodsEditor(courseId: Ref<number> | ComputedRef<number>) {
  const { t } = useI18n()
  const toast = useToast()

  const loading = ref(true)
  const saving = ref(false)
  const deletingId = ref<any>(null)
  const goods = ref<any[]>([])

  const colorOpts = [
    { label: 'Bronze', value: 'bronze' },
    { label: 'Silver', value: 'silver' },
    { label: 'Gold', value: 'gold' },
    { label: 'Diamond', value: 'diamond' },
    { label: 'Primary', value: 'primary' },
    { label: 'Success', value: 'success' },
    { label: 'Warning', value: 'warning' },
    { label: 'Error', value: 'error' },
    { label: 'Info', value: 'info' },
  ]

  function fullIconName(name: string) {
    if (!name) return 'i-lucide-package'
    if (name.startsWith('i-') || name.includes(':')) return name
    return `i-lucide-${name}`
  }

  function iconColorClass(color: any) {
    const map: Record<string, string> = {
      bronze: 'text-amber-700',
      silver: 'text-gray-400',
      gold: 'text-amber-400',
      diamond: 'text-cyan-400',
      primary: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
      info: 'text-info',
    }
    return map[color] || 'text-primary'
  }

  async function loadGoods() {
    loading.value = true
    try {
      const data = await cRequest('/api/goods/manage', {
        query: { courseId: courseId.value },
      })
      goods.value = (data || []).map((g: any) => reactive(g))
    } catch {
      goods.value = []
    } finally {
      loading.value = false
    }
  }

  function addGood() {
    goods.value.push(reactive({
      id: 0,
      name: '',
      content: { icon: 'i-lucide-package', color: 'primary', description: '', emoji: '' },
      courseId: courseId.value,
      price: 10,
      sellPrice: 5,
      stock: -1,
      type: 'item',
      order: goods.value.length,
    }))
  }

  async function deleteGood(id: any) {
    if (!id) {
      goods.value = goods.value.filter((g) => g.id !== id)
      return
    }
    deletingId.value = id
    try {
      await cRequest('/api/goods/delete', { method: 'POST', body: { id } })
      goods.value = goods.value.filter((g) => g.id !== id)
      toast.add({ title: t('goods.deleted'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: e.message, color: 'error' })
    } finally {
      deletingId.value = null
    }
  }

  async function saveAll() {
    saving.value = true
    try {
      for (const good of goods.value) {
        if (good.id) {
          await cRequest('/api/goods/update', {
            method: 'POST',
            body: {
              id: good.id,
              name: good.name,
              content: good.content,
              price: good.price,
              sellPrice: good.sellPrice,
              stock: good.stock,
              type: good.type,
              order: good.order,
            },
          })
        } else {
          const result = await cRequest('/api/goods/add', {
            method: 'POST',
            body: {
              name: good.name,
              content: good.content,
              courseId: courseId.value,
              price: good.price,
              sellPrice: good.sellPrice,
              stock: good.stock,
              type: good.type,
              order: good.order,
            },
          })
          good.id = result.id
        }
      }
      toast.add({ title: t('goods.saved'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: e.message, color: 'error' })
    } finally {
      saving.value = false
    }
  }

  onMounted(loadGoods)

  return {
    loading, goods, fullIconName, iconColorClass, colorOpts,
    deletingId, deleteGood, addGood, saving, saveAll,
  }
}
