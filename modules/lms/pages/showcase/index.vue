<template>
    <div class="mx-auto max-w-6xl px-4 py-6">
        <div class="flex items-center justify-between gap-2 mb-6">
            <h1 class="text-2xl font-bold">{{ $t('showcase.title') }}</h1>
            <UButton v-if="isLoggedIn" color="primary" icon="i-heroicons-plus" @click="openCreate">
                {{ $t('showcase.create') }}
            </UButton>
        </div>

        <!-- 状态切换（管理员/老师）：已通过 / 待审核 -->
        <div v-if="isStaff" class="flex items-center gap-2 mb-4">
            <UButton size="sm" variant="soft" :color="statusView === 'approved' ? 'success' : 'neutral'"
                @click="setStatus('approved')">
                {{ $t('showcase.approved') }}
            </UButton>
            <UButton size="sm" variant="soft" :color="statusView === 'pending' ? 'warning' : 'neutral'"
                @click="setStatus('pending')">
                {{ $t('showcase.pending') }}
            </UButton>
        </div>

        <!-- 分类（software / hardware） -->
        <div class="flex flex-wrap items-center gap-2 mb-3">
            <UButton size="sm" variant="soft" :color="!category ? 'primary' : 'neutral'" @click="setCategory('')">
                {{ $t('showcase.all') }}
            </UButton>
            <UButton v-for="c in categoryOptions" :key="c.value" size="sm" variant="soft"
                :color="category === c.value ? 'primary' : 'neutral'" @click="setCategory(c.value)">
                {{ c.label }}
            </UButton>
        </div>

        <!-- 标签筛选 -->
        <div v-if="tags.length" class="flex flex-wrap items-center gap-1.5 mb-3">
            <span class="text-xs text-muted mr-1">{{ $t('showcase.tags') }}:</span>
            <UButton size="xs" variant="ghost" :color="!tag ? 'primary' : 'neutral'" @click="setTag('')">
                {{ $t('showcase.all') }}
            </UButton>
            <UButton v-for="tg in tags" :key="tg" size="xs" variant="ghost"
                :color="tag === tg ? 'primary' : 'neutral'" @click="setTag(tg)">
                #{{ tg }}
            </UButton>
        </div>

        <!-- 搜索 + 每页数量 -->
        <div class="flex items-center justify-between gap-3 mb-5">
            <UInput v-model="keywordDraft" icon="i-heroicons-magnifying-glass" :placeholder="$t('showcase.searchAria')"
                class="w-56" @keyup.enter="search" />
            <USelect v-model="pageSize" :items="pageSizeOptions" class="w-28" size="sm" @update:model-value="onPageSize" />
        </div>

        <div v-if="pending" class="py-16 text-center text-muted">{{ $t('common.loading') }}</div>

        <div v-else-if="!items.length" class="py-16 text-center text-muted">{{ $t('showcase.empty') }}</div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <ShowcaseCard v-for="w in items" :key="w.id" :work="w" :can-edit="isStaff" @edit="openEdit" />
        </div>

        <!-- 分页（+ 每页数量） -->
        <div v-if="total > 0" class="flex items-center justify-center gap-4 mt-8">
            <div class="flex items-center gap-1">
                <UButton size="sm" variant="ghost" icon="i-heroicons-chevron-left" :disabled="page <= 1" @click="goPage(page - 1)" />
                <span class="text-sm text-muted px-2">{{ page }} / {{ totalPages }}</span>
                <UButton size="sm" variant="ghost" icon="i-heroicons-chevron-right" :disabled="page >= totalPages" @click="goPage(page + 1)" />
            </div>
        </div>

        <!-- 新建/编辑弹窗 -->
        <ShowcaseEditModal v-model:open="editOpen" :id="editId" @saved="refresh" />
    </div>
</template>

<script setup>
const { user, hasRole } = useAuth()
const isLoggedIn = computed(() => !!user.value)
const isStaff = computed(() => hasRole('admin') || hasRole('teacher'))

const page = ref(1)
const pageSize = ref(12)
const category = ref('')
const tag = ref('')
const keyword = ref('')
const keywordDraft = ref('')
const statusView = ref(isStaff.value ? 'approved' : 'approved')
const editOpen = ref(false)
const editId = ref(0)

const { t } = useI18n()
const categoryOptions = [
    { value: 'software', label: t('showcase.software') },
    { value: 'hardware', label: t('showcase.hardware') },
]
const pageSizeOptions = [12, 24, 48].map((n) => ({ value: n, label: `${n} ${t('showcase.perPageUnit')}` }))

// 用 cRequest.use（基于 useFetch）实现 SSR 渲染：服务端先拉取列表并注入 payload，
// 客户端 hydration 直接复用数据，不经二次网络请求。
const apiUrl = computed(() => {
    const p = new URLSearchParams({
        page: String(page.value),
        pageSize: String(pageSize.value),
        category: category.value,
        tag: tag.value,
        keyword: keyword.value,
        status: isStaff.value ? statusView.value : '',
    })
    return `/api/showcase/list?${p.toString()}`
})
const { data, pending, refresh } = cRequest.use(apiUrl, { default: () => null })

const items = computed(() => data.value?.items || [])
const total = computed(() => data.value?.total || 0)
const tags = computed(() => data.value?.tags || [])
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

function openCreate() {
    editId.value = 0
    editOpen.value = true
}

function openEdit(work) {
    editId.value = Number(work?.id) || 0
    editOpen.value = true
}

function setStatus(s) {
    statusView.value = s
    page.value = 1
}
function setCategory(c) {
    category.value = c
    page.value = 1
}
function setTag(tg) {
    tag.value = tag.value === tg ? '' : tg
    page.value = 1
}
function search() {
    keyword.value = keywordDraft.value.trim()
    page.value = 1
}
function onPageSize() {
    page.value = 1
}
function goPage(p) {
    if (p < 1 || p > totalPages.value) return
    page.value = p
}
</script>