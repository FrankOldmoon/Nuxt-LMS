<template>
    <div class="flex flex-col max-h-[70vh]">
        <!-- 搜索输入框 -->
        <div class="flex items-center gap-2 p-4 border-b border-default">
            <UIcon name="i-lucide-search" class="size-5 text-muted shrink-0" />
            <UInput ref="inputRef" v-model="keyword" :placeholder="$t('common.search') + '...'" variant="none"
                class="flex-1 text-base" autofocus @keydown.escape="$emit('close')"
                @keydown.down.prevent="moveSelection(1)" @keydown.up.prevent="moveSelection(-1)"
                @keydown.enter.prevent="selectResult(selectedIndex)" />
            <span class="text-xs text-muted shrink-0">
                {{ filteredResults.length }}
            </span>
        </div>

        <!-- 搜索结果列表 -->
        <div class="overflow-y-auto flex-1">
            <div v-if="loading" class="flex items-center justify-center py-12">
                <UIcon name="i-lucide-loader-circle" class="size-6 text-muted animate-spin" />
            </div>

            <div v-else-if="!keyword.trim()" class="px-4 py-12 text-center text-sm text-muted">
                <UIcon name="i-lucide-search" class="size-10 text-muted mx-auto mb-3 opacity-40" />
                <p>{{ $t('searchModal.knowledgeCount', { count: allEntries.length }) }}</p>
            </div>

            <div v-else-if="filteredResults.length === 0" class="px-4 py-12 text-center text-sm text-muted">
                <UIcon name="i-lucide-search-x" class="size-10 text-muted mx-auto mb-3 opacity-40" />
                <p>{{ $t('searchModal.noResults') }}</p>
            </div>

            <div v-else class="py-2">
                <div v-for="(entry, index) in filteredResults" :key="index" ref="resultItems"
                    class="px-4 py-3 cursor-pointer transition-colors hover:bg-muted"
                    :class="{ 'bg-muted': index === selectedIndex }" @click="selectResult(index)"
                    @mouseenter="selectedIndex = index">
                    <div class="flex items-start gap-2">
                        <UIcon :name="entry.type === 'heading' ? 'i-lucide-heading' : 'i-lucide-text'"
                            class="size-4 mt-0.5 shrink-0"
                            :class="entry.type === 'heading' ? 'text-primary' : 'text-muted'" />

                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-highlighted line-clamp-2 leading-snug">
                                <span v-for="(seg, si) in highlightText(entry.text)" :key="si"
                                    :class="{ 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded-sm px-0.5': seg.highlight }">{{
                                        seg.text }}</span>
                            </p>

                            <div class="flex items-center gap-1.5 mt-1 text-xs text-muted">
                                <span class="truncate max-w-[280px]">{{ entry.sourceName }}</span>
                            </div>
                        </div>

                        <UIcon name="i-lucide-arrow-up-right" class="size-3.5 text-muted shrink-0 mt-0.5" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface SearchEntry {
    text: string
    headingId: string | null
    type: 'heading' | 'text'
    level?: number
    url: string
    sourceName: string
    sourceType: 'course' | 'chapter'
}

const route = useRoute()
const router = useRouter()
const keyword = ref('')
const selectedIndex = ref(0)
const loading = ref(false)
const inputRef = ref()
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

const emit = defineEmits(['close'])

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
</script>
