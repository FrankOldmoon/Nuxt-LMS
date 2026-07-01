<template>
  <UModal v-model:open="open">
    <UButton
      label="编辑导航"
      color="primary"
      variant="ghost"
      size="xs"
      icon="i-lucide-edit"
      @click="openModal"
    />

    <template #content>
      <div class="p-6 space-y-4 min-w-[520px] max-h-[70vh] overflow-y-auto">
        <h3 class="text-lg font-medium">{{ mode === 'category' ? '编辑分类导航' : '编辑课程导航' }}</h3>
        <p class="text-sm text-gray-500">支持最多三层目录。拖拽手柄排序，悬停显示添加/删除按钮</p>

        <!-- 树形列表（可拖拽排序） -->
        <draggable
          v-model="flatItems"
          item-key="_key"
          handle=".drag-handle"
          :move="checkMove"
          ghost-class="ghost"
          tag="div"
          class="space-y-1.5"
          @start="onDragStart"
          @end="onDragEnd"
        >
          <template #item="{ element: item, index }">
            <div
              class="flex items-center gap-1.5 p-2 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group"
              :style="{ paddingLeft: (item.depth * 24 + 8) + 'px' }"
            >
              <!-- 拖拽手柄 -->
              <div class="drag-handle cursor-grab active:cursor-grabbing shrink-0 text-gray-400 hover:text-gray-600">
                <UIcon name="i-lucide-grip-vertical" class="size-3.5" />
              </div>

              <!-- 标签编辑 -->
              <UInput
                v-model="item.label"
                size="xs"
                class="flex-1 min-w-0"
                placeholder="导航名称"
              />

              <!-- 操作按钮 -->
              <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <UButton
                  v-if="item.depth < maxDepth"
                  icon="i-lucide-plus"
                  variant="ghost"
                  size="xs"
                  color="primary"
                  title="添加子目录"
                  @click="addChild(index)"
                />
                <UButton
                  icon="i-lucide-list-plus"
                  variant="ghost"
                  size="xs"
                  color="primary"
                  title="添加同级目录"
                  @click="addSibling(index)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  size="xs"
                  color="error"
                  title="删除（含子项）"
                  @click="deleteItem(index)"
                />
              </div>
            </div>
          </template>
        </draggable>

        <!-- 添加根级目录 -->
        <UButton
          icon="i-lucide-plus"
          color="primary"
          variant="outline"
          size="xs"
          block
          @click="addRootItem"
        >
          添加一级目录
        </UButton>
      </div>

      <!-- 底部按钮 -->
      <div class="flex justify-between gap-2 p-4 border-t">
        <UButton color="neutral" variant="ghost" @click="cancel">
          取消
        </UButton>
        <div class="flex gap-2">
          <UButton color="neutral" variant="outline" @click="resetFromProps">
            重置
          </UButton>
          <UButton
            color="primary"
            variant="solid"
            :loading="saving"
            @click="save"
          >
            保存并关闭
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import draggable from 'vuedraggable'

/** 内部使用的扁平树节点 */
interface FlatNode {
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

const open = ref(false)
const flatItems = ref<FlatNode[]>([])
const saving = ref(false)
let keyCounter = 0

/** category 模式最大层级 1（二级目录），course 模式最大层级 2（三级目录） */
const maxDepth = computed(() => props.mode === 'category' ? 1 : 2)

// 拖拽时记录被拖拽元素的 _key，用于 end 事件中定位
let dragTargetKey: string | null = null

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
      label: '课程首页',
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

// ==================== 辅助函数 ====================

function getBlockEnd(startIdx: number): number {
  const depth = flatItems.value[startIdx]!.depth
  let end = startIdx
  for (let i = startIdx + 1; i < flatItems.value.length; i++) {
    if (flatItems.value[i]!.depth <= depth) break
    end = i
  }
  return end
}

// ==================== 拖拽排序 ====================

/** 只允许同层级之间拖拽排序 */
function checkMove(evt: any): boolean {
  const draggedItem = evt.draggedContext.element as FlatNode
  const relatedItem = evt.relatedContext.element as FlatNode
  return draggedItem.depth === relatedItem.depth
}

/** 拖拽开始时记录目标元素 key */
function onDragStart(evt: any) {
  dragTargetKey = flatItems.value[evt.oldIndex]!._key
}

/** 拖拽结束后，将子节点移动到父节点之后，确保 block 整体跟随 */
function onDragEnd(evt: any) {
  const { oldIndex, newIndex } = evt
  if (oldIndex === undefined || newIndex === undefined) return
  if (oldIndex === newIndex) {
    dragTargetKey = null
    return
  }

  const items = flatItems.value
  const movedDepth = items[newIndex]!.depth

  // 找到被拖拽移动后，散落在原来位置的子节点起始位置
  // newIndex > oldIndex 时子节点整体左移了一位，newIndex < oldIndex 时位置不变
  let childrenStart = newIndex > oldIndex ? oldIndex : oldIndex + 1

  // 统计需要跟随的子节点数量（子节点 depth > 父节点 depth）
  let childCount = 0
  while (
    childrenStart + childCount < items.length &&
    items[childrenStart + childCount]!.depth > movedDepth
  ) {
    childCount++
  }

  if (childCount > 0) {
    const children = items.splice(childrenStart, childCount)
    // 找到父节点在移除子节点后的新位置
    const parentIdx = items.findIndex((i) => i._key === dragTargetKey)
    if (parentIdx !== -1) {
      items.splice(parentIdx + 1, 0, ...children)
    }
  }

  dragTargetKey = null
}

// ==================== 增删操作 ====================

function createNewNode(depth: number): FlatNode {
  return {
    _key: 'k-' + (keyCounter++),
    id: 'new-' + keyCounter,
    label: '',
    to: '',
    depth,
    isNew: true,
  }
}

function addRootItem() {
  flatItems.value.push(createNewNode(0))
}

function addSibling(index: number) {
  const depth = flatItems.value[index]!.depth
  const blockEnd = getBlockEnd(index)
  flatItems.value.splice(blockEnd + 1, 0, createNewNode(depth))
}

function addChild(index: number) {
  const depth = flatItems.value[index]!.depth
  if (depth >= maxDepth.value) return
  const blockEnd = getBlockEnd(index)
  flatItems.value.splice(blockEnd + 1, 0, createNewNode(depth + 1))
}

function deleteItem(index: number) {
  const blockEnd = getBlockEnd(index)
  const count = blockEnd - index + 1
  flatItems.value.splice(index, count)
}

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
      label: item.label || '(未命名)',
      order: result.length,
      parentId,
    })
    parentStack.length = item.depth + 1
    parentStack[item.depth] = item.id
  }

  return result
}

/** 将一组子节点（同一父级下）转为 orders 格式，depth 相对于父级 */
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
      label: item.label || '(未命名)',
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
      const resp = await cRequest.post<any[]>('/api/lms/chapters/add', {
        name: item.label.trim(),
        courseId: Number(courseId),
        isOpen: true,
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
  await cRequest.post('/api/lms/courses/update', {
    id: courseId,
    orders,
  })
}

/** category 模式保存：按分类分组，分别更新各分类的 orders */
async function saveCategoryMode() {
  // 按父级分类分组：depth=0 是分类，depth>0 的子项属于上一个分类
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

  // 并行保存每个分类的 orders
  await Promise.all(
    groups.map((group) => {
      const orders = toOrdersForGroup(group.items, 0)
      return cRequest.post('/api/lms/categories/update', {
        id: group.categoryId,
        orders,
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

<style scoped>
.ghost {
  opacity: 0.5;
  background: #c8ebfb;
}
</style>
