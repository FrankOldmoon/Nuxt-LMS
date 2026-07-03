<template>
  <UModal v-model:open="open">
    <UTooltip :text="$t('navEditor.title')" :content="{ side: 'bottom' }">
      <UButton color="primary" variant="ghost" size="sm" icon="i-lucide-list-tree" :aria-label="$t('navEditor.title')"
        @click="openModal" />
    </UTooltip>

    <template #content>
      <div class="p-6 space-y-4 min-w-[520px] max-h-[70vh] overflow-y-auto">
        <h3 class="text-lg font-medium">{{ mode === 'category' ? $t('navEditor.editCategory') :
          $t('navEditor.editCourse') }}</h3>
        <p class="text-sm text-gray-500">{{ $t('navEditor.hint') }}</p>

        <NavEditorList v-model="flatItems" :max-depth="maxDepth" :gen-key="genKey" />
      </div>

      <!-- 底部按钮 -->
      <div class="flex justify-between gap-2 p-4 border-t">
        <UButton color="neutral" variant="ghost" @click="cancel">
          {{ $t('common.cancel') }}
        </UButton>
        <div class="flex gap-2">
          <UButton color="neutral" variant="outline" @click="resetFromProps">
            {{ $t('common.reset') }}
          </UButton>
          <UButton color="primary" variant="solid" :loading="saving" @click="save">
            {{ $t('navEditor.saveAndClose') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import NavEditorList from './list.vue'

/** 内部使用的扁平树节点（供子组件引用） */
export interface FlatNode {
  _key: string
  id: string
  label: string
  to: string
  depth: number
  isNew: boolean
}

type EditorMode = 'category' | 'course'

interface Props {
  /** 编辑模式：category=分类导航 / course=课程章节导航 */
  mode: EditorMode
  /** 课程ID（仅 course 模式需要） */
  courseId?: string
  navigation: NavigationMenuItem[]
}

interface Emits {
  (e: 'saved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()

const open = ref(false)
const flatItems = ref<FlatNode[]>([])
const saving = ref(false)
let keyCounter = 0

/** category 模式最大层级 1（二级目录），course 模式最大层级 2（三级目录） */
const maxDepth = computed(() => props.mode === 'category' ? 1 : 2)

/** 生成唯一 key 编号 */
function genKey(): number {
  return keyCounter++
}

// ==================== 数据初始化 ====================

/** 从 NavigationMenuItem 中提取 ID（优先使用 _meta，兼容旧逻辑） */
function extractId(item: NavigationMenuItem): string {
  // 优先使用 _meta 中的 ID
  const meta = (item as any)._meta
  if (meta?.id) return String(meta.id)

  const to = (item as any).to as string | undefined
  if (!to) return ''
  const match = to.match(/\/course\/\d+\/(\d+)/)
  if (match) return match[1]!
  if (to.match(/\/course\/\d+$/)) return 'course'
  const hashMatch = to.match(/#(.+)$/)
  if (hashMatch) return 'custom-' + hashMatch[1]
  return 'custom-' + (keyCounter++)
}

/** 从 props 的 NavigationMenuItem 解析为 flatItems */
function initFromNavigation(nav: NavigationMenuItem[]): FlatNode[] {
  const result: FlatNode[] = []

  function walk(items: NavigationMenuItem[], depth: number) {
    for (const item of items) {
      const id = extractId(item)
      const isNew = id === '' || id.startsWith('new-')
      result.push({
        _key: 'k-' + (keyCounter++),
        id: id || 'new-' + keyCounter,
        label: item.label || '',
        to: (item as any).to || '',
        depth,
        isNew,
      })
      if (item.children && item.children.length > 0 && depth < maxDepth.value) {
        walk(item.children, depth + 1)
      }
    }
  }

  walk(nav, 0)

  // course 模式：空列表时添加默认课程首页
  if (result.length === 0 && props.mode === 'course' && props.courseId) {
    result.push({
      _key: 'k-' + (keyCounter++),
      id: 'course',
      label: t('navEditor.courseHome'),
      to: '/course/' + props.courseId,
      depth: 0,
      isNew: false,
    })
  }

  return result
}

function resetFromProps() {
  keyCounter = 0
  flatItems.value = initFromNavigation(props.navigation)
}

watch(open, (val) => {
  if (val) {
    keyCounter = 0
    flatItems.value = initFromNavigation(props.navigation)
  }
})

// ==================== 弹窗控制 ====================

function openModal() {
  open.value = true
}

function cancel() {
  open.value = false
}

// ==================== 保存逻辑 ====================

/** 将 flatItems 转为嵌套 orders 格式 */
function toOrders(): { id: string; label: string; order: number; parentId?: string | null }[] {
  const result: { id: string; label: string; order: number; parentId?: string | null }[] = []
  const parentStack: (string | null)[] = []

  for (const item of flatItems.value) {
    while (parentStack.length > item.depth) {
      parentStack.pop()
    }
    const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1] ?? null : null
    result.push({
      id: item.id,
      label: item.label || t('navEditor.unnamed'),
      order: result.length,
      parentId,
    })
    parentStack.length = item.depth + 1
    parentStack[item.depth] = item.id
  }

  return result
}

/** 将一组子节点（同一父级下）转为 orders 格式 */
function toOrdersForGroup(items: FlatNode[], baseDepth: number): { id: string; label: string; order: number; parentId?: string | null }[] {
  const result: { id: string; label: string; order: number; parentId?: string | null }[] = []
  const parentStack: (string | null)[] = []

  for (const item of items) {
    const relDepth = item.depth - baseDepth - 1
    while (parentStack.length > relDepth) {
      parentStack.pop()
    }
    const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1] ?? null : null
    result.push({
      id: item.id,
      label: item.label || t('navEditor.unnamed'),
      order: result.length,
      parentId,
    })
    parentStack.length = relDepth + 1
    parentStack[relDepth] = item.id
  }

  return result
}

/** course 模式保存：创建新章节 + 更新课程 orders */
async function saveCourseMode() {
  const courseId = props.courseId
  if (!courseId) return

  // 1. 为新建项调用 add API 创建记录
  for (const item of flatItems.value) {
    if (item.isNew && item.label.trim()) {
      const resp = await cRequest<any[]>('/api/lms/chapters/add', {
        method: 'POST',
        body: {
          name: item.label.trim(),
          courseId: Number(courseId),
          isOpen: true,
        },
      })
      if (resp && resp.length > 0) {
        const newId = resp[0].id
        item.id = String(newId)
        item.to = '/course/' + courseId + '/' + newId
        item.isNew = false
      }
    } else if (item.isNew && !item.label.trim()) {
      item.to = '/course/' + courseId + '#'
    } else if (!item.isNew && !item.to) {
      if (item.id === 'course') {
        item.to = '/course/' + courseId
      } else if (item.id && !item.id.startsWith('custom-') && !isNaN(Number(item.id))) {
        item.to = '/course/' + courseId + '/' + item.id
      } else {
        item.to = '/course/' + courseId + '#' + item.label
      }
    }
  }

  // 2. 过滤空标签的新建项
  flatItems.value = flatItems.value.filter(function (item) {
    return item.label.trim() || !item.isNew
  })

  // 3. 转为 orders 并保存
  const orders = toOrders()
  await cRequest('/api/lms/courses/update', {
    method: 'POST',
    body: { id: courseId, orders },
  })
}

/** category 模式保存：按分类分组，分别更新各分类的 orders */
async function saveCategoryMode() {
  const groups: { categoryId: string; items: FlatNode[] }[] = []
  let currentGroup: FlatNode[] | null = null

  for (const item of flatItems.value) {
    if (item.depth === 0) {
      currentGroup = []
      groups.push({ categoryId: item.id, items: currentGroup })
    } else if (currentGroup !== null && item.depth > 0) {
      currentGroup.push(item)
    }
  }

  await Promise.all(
    groups.map((group) => {
      const orders = toOrdersForGroup(group.items, 0)
      return cRequest('/api/lms/categories/update', {
        method: 'POST',
        body: { id: group.categoryId, orders },
      })
    })
  )
}

async function save() {
  saving.value = true

  try {
    if (props.mode === 'course') {
      await saveCourseMode()
    } else {
      await saveCategoryMode()
    }

    emit('saved')
    open.value = false
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    saving.value = false
  }
}
</script>
