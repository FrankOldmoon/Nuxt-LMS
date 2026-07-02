<template>
    <!-- <UModal v-model:open="open" :ui="{ content: 'sm:max-w-xl', body: 'p-0' }"> -->

    <div class="flex flex-col max-h-[70vh]">
        <!-- 搜索输入框 -->
        <div class="flex items-center gap-2 p-4 border-b border-default">
            <UIcon name="i-lucide-search" class="size-5 text-muted shrink-0" />
            <UInput ref="inputRef" v-model="keyword" :placeholder="$t('common.search') + '...'" variant="none"
                class="flex-1 text-base" autofocus @keydown.escape="open = false"
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
                <p>{{ $t('common.search') }} {{ allEntries.length }} 个知识点</p>
            </div>

            <div v-else-if="filteredResults.length === 0" class="px-4 py-12 text-center text-sm text-muted">
                <UIcon name="i-lucide-search-x" class="size-10 text-muted mx-auto mb-3 opacity-40" />
                <p>无匹配结果</p>
            </div>

            <div v-else class="py-2">
                <div v-for="(entry, index) in filteredResults" :key="index" ref="resultItems"
                    class="px-4 py-3 cursor-pointer transition-colors hover:bg-muted"
                    :class="{ 'bg-muted': index === selectedIndex }" @click="selectResult(index)"
                    @mouseenter="selectedIndex = index">
                    <div class="flex items-start gap-2">
                        <!-- 图标 -->
                        <UIcon :name="entry.type === 'heading' ? 'i-lucide-heading' : 'i-lucide-text'"
                            class="size-4 mt-0.5 shrink-0"
                            :class="entry.type === 'heading' ? 'text-primary' : 'text-muted'" />

                        <div class="flex-1 min-w-0">
                            <!-- 文本（带高亮） -->
                            <p class="text-sm font-medium text-highlighted line-clamp-2 leading-snug">
                                <span v-for="(seg, si) in highlightText(entry.text)" :key="si"
                                    :class="{ 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded-sm px-0.5': seg.highlight }">{{
                                    seg.text }}</span>
                            </p>

                            <!-- 来源信息 -->
                            <div class="flex items-center gap-1.5 mt-1 text-xs text-muted">
                                <span class="truncate max-w-[280px]">{{ entry.sourceName }}</span>
                            </div>
                        </div>

                        <!-- URL 跳转图标 -->
                        <UIcon name="i-lucide-arrow-up-right" class="size-3.5 text-muted shrink-0 mt-0.5" />
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- </UModal> -->
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

const router = useRouter()
const keyword = ref('')
const selectedIndex = ref(0)
const loading = ref(false)
const inputRef = ref()
const resultItems = ref<HTMLElement[]>([])

const allEntries = ref<SearchEntry[]>([])

// 客户端搜索过滤
const filteredResults = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    if (!kw) return []
    // 按文本匹配度排序，heading 优先，再按匹配位置排序
    const matched = allEntries.value
        .filter((entry) => entry.text.toLowerCase().includes(kw))
        .map((entry) => {
            const idx = entry.text.toLowerCase().indexOf(kw)
            return { entry, matchIndex: idx }
        })
        .sort((a, b) => {
            // heading 优先
            if (a.entry.type === 'heading' && b.entry.type !== 'heading') return -1
            if (a.entry.type !== 'heading' && b.entry.type === 'heading') return 1
            // 匹配位置靠前的优先
            return a.matchIndex - b.matchIndex
        })
    return matched.map((m) => m.entry)
})

// 搜索结果变化时重置选中索引
watch(filteredResults, () => {
    selectedIndex.value = 0
})

// 键盘上下移动选择
function moveSelection(delta: number) {
    const max = filteredResults.value.length
    if (max === 0) return
    selectedIndex.value = ((selectedIndex.value + delta) % max + max) % max
    nextTick(() => {
        // 滚动到可见区域
        resultItems.value[selectedIndex.value]?.scrollIntoView({ block: 'nearest' })
    })
}

const emit = defineEmits(['close'])
// 选择结果并导航
function selectResult(index: number) {
    const entry = filteredResults.value[index]
    if (!entry) return

    emit('close')

    // 构建目标 URL
    let targetUrl = entry.url
    if (entry.headingId) {
        targetUrl += `#${entry.headingId}`
    }

    router.push(targetUrl)
}

// 高亮匹配文本
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

// 当 modal 打开时监听全局键盘事件，关闭时移除
onMounted(async () => {
    keyword.value = ''
    selectedIndex.value = 0
    loading.value = true
    try {
        const data = await $fetch<SearchEntry[]>('/api/search')
        allEntries.value = data || []
    } catch {
        allEntries.value = []
    } finally {
        loading.value = false
    }
    nextTick(() => {
        inputRef.value?.inputRef?.focus()
    })
})

</script>
