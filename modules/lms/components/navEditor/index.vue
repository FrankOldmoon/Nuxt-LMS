<template>
  <UModal v-model:open="open">
    <UTooltip :text="$t('navEditor.title')" :content="{ side: 'bottom' }">
      <UButton color="primary" variant="soft" size="xs" icon="i-lucide-list-tree" :aria-label="$t('navEditor.title')"
        @click="openModal" />
    </UTooltip>

    <template #content>
      <div class="p-6 space-y-4 min-w-[520px] max-h-[70vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium">{{ mode === 'category' ? $t('navEditor.editCategory') :
            $t('navEditor.editCourse') }}</h3>
          <UButton size="sm" variant="outline" icon="i-lucide-file-plus" :label="$t('navEditor.batchImport')" @click="() => { importOpen = true }" />
        </div>
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

  <!-- 批量导入弹窗 -->
  <UModal v-model:open="importOpen" :ui="{ content: 'max-w-lg' }">
    <template #content>
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-medium">{{ $t('navEditor.batchImport') }}</h3>
        <p class="text-sm text-muted whitespace-pre-line">{{ $t('navEditor.batchImportHint') }}</p>

        <!-- AI 生成 -->
        <div class="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div class="flex gap-2">
            <UInput
              v-model="aiPrompt"
              :placeholder="$t('navEditor.aiPromptPlaceholder')"
              size="sm"
              class="flex-1"
              :disabled="aiGenerating"
              @keydown.enter="aiGenerate"
            />
            <UButton
              icon="i-lucide-sparkles"
              color="primary"
              variant="solid"
              size="sm"
              :loading="aiGenerating"
              :disabled="!aiPrompt.trim() || aiGenerating"
              @click="aiGenerate"
            >
              {{ $t('navEditor.aiGenerate') }}
            </UButton>
          </div>
          <p v-if="aiGenerating" class="text-xs text-primary flex items-center gap-1">
            <UIcon name="i-lucide-loader-2" class="animate-spin size-3" />
            {{ $t('navEditor.aiGenerating') }}
          </p>
        </div>

        <UTextarea
          v-model="importText"
          :placeholder="$t('navEditor.batchImportPlaceholder')"
          :rows="10"
          class="w-full font-mono text-sm"
        />
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="() => { importOpen = false }">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" @click="doBatchImport">{{ $t('navEditor.batchImportConfirm') }}</UButton>
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

// 批量导入
const importOpen = ref(false)
const importText = ref('')

// AI 生成
const aiPrompt = ref('')
const aiGenerating = ref(false)

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

/** 批量导入：解析缩进文本，每2个空格为一层，追加到 flatItems */
function doBatchImport() {
  const text = importText.value.trim()
  if (!text) return

  const lines = text.split('\n')
  const newItems: FlatNode[] = []

  for (const line of lines) {
    if (!line.trim()) continue
    // 计算前导空格数，每2个空格为一层
    const indent = line.length - line.trimStart().length
    const depth = Math.floor(indent / 2)
    // 限制在最大层级内
    const clampedDepth = Math.min(depth, maxDepth.value)
    const label = line.trim()

    newItems.push({
      _key: 'k-' + (keyCounter++),
      id: 'new-' + keyCounter,
      label,
      to: '',
      depth: clampedDepth,
      isNew: true,
    })
  }

  if (newItems.length > 0) {
    flatItems.value.push(...newItems)
  }

  importText.value = ''
  importOpen.value = false
}

/** AI 生成：调用 /api/aichat/chat 流式生成批量导入格式的缩进文本 */
async function aiGenerate() {
  const prompt = aiPrompt.value.trim()
  if (!prompt || aiGenerating.value) return

  aiGenerating.value = true
  importText.value = ''

  // 构建系统提示：指定输出格式（缩进文本，2空格一层，不超过最大层级）
  const maxLevels = maxDepth.value + 1
  const modeLabel = props.mode === 'category'
    ? t('navEditor.aiModeCategory')
    : t('navEditor.aiModeCourse')

  const systemPrompt = `You are a navigation structure generator. Generate a ${modeLabel} outline based on the user's request.

Output format rules (STRICTLY follow):
- One item per line
- Use 2 spaces for each indent level (no tabs, no markdown)
- Maximum ${maxLevels} levels (depth 0 to ${maxDepth.value})
- Output ONLY the indented text, no explanations, no code fences, no markdown
- Use concise, clear labels

Example:
Item A
  Item A.1
  Item A.2
Item B
  Item B.1`

  try {
    const resp = await fetch('/api/aichat/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}))
      throw new Error(errData.msg || resp.statusText)
    }

    const reader = resp.body?.getReader()
    if (!reader) throw new Error('No reader available')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta
          if (delta?.content) {
            importText.value += delta.content
          }
        } catch { /* skip */ }
      }
    }
  } catch (e: any) {
    console.error('AI 生成失败:', e)
    importText.value = t('navEditor.aiGenerateError') + (e.message || '')
  } finally {
    aiGenerating.value = false
  }
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
      const resp = await cRequest<any[]>('/api/chapters/add', {
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
  await cRequest('/api/courses/update', {
    method: 'POST',
    body: { id: courseId, orders },
  })
}

/** category 模式保存：创建新分类/课程 + 更新各分类的 name 和 orders */
async function saveCategoryMode() {
  // 1. 创建新分类（depth=0 且 isNew），获取真实 id
  //    必须先于课程创建，因为新课程需要 categoryId
  for (const item of flatItems.value) {
    if (item.depth === 0 && item.isNew && item.label.trim()) {
      const resp = await cRequest<any[]>('/api/categories/add', {
        method: 'POST',
        body: { name: item.label.trim() },
      })
      if (resp && resp.length > 0) {
        item.id = String(resp[0].id)
        item.isNew = false
      }
    }
  }

  // 2. 创建新课程（depth>0 且 isNew），其所属分类为之前最近的已持久化 depth=0 节点
  let currentCategoryId: string | null = null
  for (const item of flatItems.value) {
    if (item.depth === 0) {
      // 新分类若创建失败（空标签）仍为 isNew，置 null 跳过其下课程创建，避免脏 categoryId
      currentCategoryId = item.isNew ? null : item.id
    } else if (item.depth > 0 && item.isNew && item.label.trim() && currentCategoryId) {
      const resp = await cRequest<any[]>('/api/courses/add', {
        method: 'POST',
        body: {
          name: item.label.trim(),
          categoryId: Number(currentCategoryId),
        },
      })
      if (resp && resp.length > 0) {
        item.id = String(resp[0].id)
        item.isNew = false
      }
    }
  }

  // 3. 过滤空标签的新建项
  flatItems.value = flatItems.value.filter((item) => item.label.trim() || !item.isNew)

  // 4. 按 category 分组（depth=0 为 category，depth>0 为其下 course）
  const groups: { category: FlatNode; items: FlatNode[] }[] = []
  let currentGroup: FlatNode[] | null = null
  for (const item of flatItems.value) {
    if (item.depth === 0) {
      currentGroup = []
      groups.push({ category: item, items: currentGroup })
    } else if (currentGroup !== null && item.depth > 0) {
      currentGroup.push(item)
    }
  }

  // 5. 转为 orders 并保存（含 category 的 name + order，后端据 orders[].label 同步更新 course 的 name）
  await Promise.all(
    groups.map((group, index) => {
      const orders = toOrdersForGroup(group.items, 0)
      return cRequest('/api/categories/update', {
        method: 'POST',
        body: {
          id: group.category.id,
          name: group.category.label || t('navEditor.unnamed'),
          order: index,
          orders,
        },
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
