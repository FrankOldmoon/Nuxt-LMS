import type { NavigationMenuItem } from '@nuxt/ui'

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

interface NavEditorProps {
  mode: EditorMode
  courseId?: string
  navigation: NavigationMenuItem[]
}

/**
 * 导航编辑器：扁平树解析 + 批量导入 + AI 生成 + 保存（category/course 双模式）
 */
export function useNavEditor(props: NavEditorProps, emit: (e: 'saved') => void) {
  const { t } = useI18n()

  const open = ref(false)
  const flatItems = ref<FlatNode[]>([])
  const saving = ref(false)
  let keyCounter = 0

  // 批量导入 + AI
  const importOpen = ref(false)
  const importText = ref('')
  const aiPrompt = ref('')
  const aiGenerating = ref(false)

  const maxDepth = computed(() => props.mode === 'category' ? 1 : 2)

  function genKey(): number {
    return keyCounter++
  }

  function extractId(item: NavigationMenuItem): string {
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
    // 注意：不重置 keyCounter，保证 _key 在多次打开/重置间全局唯一，
    // 避免折叠状态（collapsedKeys）因 key 冲突错误命中新节点
    flatItems.value = initFromNavigation(props.navigation)
  }

  function doBatchImport() {
    const text = importText.value.trim()
    if (!text) return

    const lines = text.split('\n')
    const newItems: FlatNode[] = []

    for (const line of lines) {
      if (!line.trim()) continue
      const indent = line.length - line.trimStart().length
      const depth = Math.floor(indent / 2)
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

  async function aiGenerate() {
    const prompt = aiPrompt.value.trim()
    if (!prompt || aiGenerating.value) return

    aiGenerating.value = true
    importText.value = ''

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
      // 不重置 keyCounter：保证跨多次打开的 _key 唯一，防止折叠状态串位
      flatItems.value = initFromNavigation(props.navigation)
    }
  })

  function openModal() {
    open.value = true
  }

  function cancel() {
    open.value = false
  }

  // ==================== 保存逻辑 ====================

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

  async function saveCourseMode() {
    const courseId = props.courseId
    if (!courseId) return

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

    flatItems.value = flatItems.value.filter(function (item) {
      return item.label.trim() || !item.isNew
    })

    const orders = toOrders()
    await cRequest('/api/courses/update', {
      method: 'POST',
      body: { id: courseId, orders },
    })
  }

  async function saveCategoryMode() {
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

    let currentCategoryId: string | null = null
    for (const item of flatItems.value) {
      if (item.depth === 0) {
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

    flatItems.value = flatItems.value.filter((item) => item.label.trim() || !item.isNew)

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

  return {
    open, flatItems, saving, maxDepth, genKey,
    importOpen, importText, aiPrompt, aiGenerating,
    resetFromProps, doBatchImport, aiGenerate,
    openModal, cancel, save,
  }
}
