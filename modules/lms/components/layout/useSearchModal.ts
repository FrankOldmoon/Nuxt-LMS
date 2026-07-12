import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

export interface SearchEntry {
    text: string
    headingId: string | null
    type: 'heading' | 'text'
    level?: number
    url: string
    sourceName: string
    sourceType: 'course' | 'chapter'
}

export type SearchModalEmit = (event: 'close') => void

export function useSearchModal(emit: SearchModalEmit) {
    const route = useRoute()
    const router = useRouter()
    const keyword = ref('')
    const selectedIndex = ref(0)
    const loading = ref(false)
    const inputRef = ref<any>()
    const resultItems = ref<HTMLElement[]>([])

    const allEntries = ref<SearchEntry[]>([])

    // 检测当前页面是否为课程/章节页面，获取 courseId
    // 使用路径匹配而非路由名，兼容 base/doc/lms 不同模块注册的路由名
    const currentCourseId = computed(() => {
        const match = route.path.match(/^\/course\/(\d+)/)
        return match ? match[1] : undefined
    })

    // 根据页面上下文决定搜索的 API
    const searchApiUrl = computed(() => {
        if (currentCourseId.value) {
            return `/api/search?courseId=${currentCourseId.value}`
        }
        return '/api/search'
    })

    // 搜索过滤
    const filteredResults = computed(() => {
        const kw = keyword.value.trim().toLowerCase()
        if (!kw) return []
        const matched = allEntries.value
            .filter((entry) => entry.text.toLowerCase().includes(kw))
            .map((entry) => {
                const idx = entry.text.toLowerCase().indexOf(kw)
                return { entry, matchIndex: idx }
            })
            .sort((a, b) => {
                if (a.entry.type === 'heading' && b.entry.type !== 'heading') return -1
                if (a.entry.type !== 'heading' && b.entry.type === 'heading') return 1
                return a.matchIndex - b.matchIndex
            })
        return matched.map((m) => m.entry)
    })

    watch(filteredResults, () => {
        selectedIndex.value = 0
    })

    // 键盘操作
    function moveSelection(delta: number) {
        const max = filteredResults.value.length
        if (max === 0) return
        selectedIndex.value = ((selectedIndex.value + delta) % max + max) % max
        nextTick(() => {
            resultItems.value[selectedIndex.value]?.scrollIntoView({ block: 'nearest' })
        })
    }

    function selectResult(index: number) {
        const entry = filteredResults.value[index]
        if (!entry) return

        emit('close')

        let targetUrl = entry.url
        if (entry.headingId) {
            targetUrl += `#${entry.headingId}`
        }

        router.push(targetUrl)
    }

    // 高亮
    function highlightText(text: string): { text: string; highlight: boolean }[] {
        const kw = keyword.value.trim()
        if (!kw) return [{ text, highlight: false }]

        const segments: { text: string; highlight: boolean }[] = []
        const lower = text.toLowerCase()
        const lowerKw = kw.toLowerCase()
        let lastIndex = 0

        let idx = lower.indexOf(lowerKw)
        while (idx !== -1) {
            if (idx > lastIndex) {
                segments.push({ text: text.slice(lastIndex, idx), highlight: false })
            }
            segments.push({ text: text.slice(idx, idx + kw.length), highlight: true })
            lastIndex = idx + kw.length
            idx = lower.indexOf(lowerKw, lastIndex)
        }

        if (lastIndex < text.length) {
            segments.push({ text: text.slice(lastIndex), highlight: false })
        }

        return segments
    }

    // 页面路径变化时重新加载对应索引
    watch(() => route.fullPath, () => {
        keyword.value = ''
        selectedIndex.value = 0
        loadData()
    })

    // 组件挂载时加载数据并聚焦
    onMounted(() => {
        loadData()
    })

    async function loadData() {
        loading.value = true
        try {
            const data = await $fetch<SearchEntry[]>(searchApiUrl.value)
            allEntries.value = data || []
        } catch {
            allEntries.value = []
        } finally {
            loading.value = false
        }
        nextTick(() => {
            inputRef.value?.inputRef?.focus()
        })
    }

    // 全局快捷键 Cmd+K / Ctrl+K 打开搜索
    function onGlobalKeydown(e: KeyboardEvent) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault()
            // 由 header 中的 UModal open 状态控制，这里不需要额外处理
        }
    }

    onMounted(() => {
        window.addEventListener('keydown', onGlobalKeydown)
    })
    onUnmounted(() => {
        window.removeEventListener('keydown', onGlobalKeydown)
    })

    return {
        keyword, inputRef, resultItems, moveSelection, selectResult, selectedIndex,
        filteredResults, loading, allEntries, highlightText,
    }
}
