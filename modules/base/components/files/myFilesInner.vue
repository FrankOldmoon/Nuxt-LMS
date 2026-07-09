<template>
    <!-- 标题栏 -->
    <div class="flex items-center justify-between p-4 pb-3">
        <h3 class="text-lg font-semibold">{{ title }}</h3>
        <div class="flex items-center gap-3">
            <UButton icon="i-lucide-upload" color="primary" variant="soft" size="xs" :label="t('common.upload')"
                :loading="uploading" @click="triggerUpload" />
            <input ref="fileInputRef" type="file" class="hidden" @change="handleUpload" />
            <!-- 个人空间使用 -->
            <span v-if="!group" class="text-xs text-gray-400">
                {{ t('myFiles.used') }}: {{ formatBytes(usage.used) }}
                <template v-if="!usage.unlimited"> / {{ formatBytes(usage.quota) }}</template>
                <template v-else> / ∞</template>
            </span>
        </div>
    </div>

    <!-- 工具栏：搜索 + 排序 -->
    <div class="flex items-center gap-2 px-4 pb-3">
        <UInput v-model="keyword" :placeholder="t('myFiles.searchPlaceholder')" icon="i-lucide-search" size="sm"
            class="flex-1" @keydown.enter="loadFiles(1)" />
        <USelect v-model="sortBy" :items="sortOptions" size="sm" class="w-36" @update:model-value="loadFiles(1)" />
        <UButton :icon="orderIcon" color="neutral" variant="outline" size="sm" @click="toggleOrder" />
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="sm" @click="loadFiles()" />
    </div>

    <!-- 文件列表 -->
    <div class="flex-1 min-h-0 overflow-auto px-4">
        <div v-if="loading" class="flex items-center justify-center py-12 text-gray-400">
            <UIcon name="i-lucide-loader-2" class="animate-spin mr-2" />
            {{ t('common.loading') }}
        </div>

        <div v-else-if="!files.length" class="flex flex-col items-center justify-center py-12 text-gray-400">
            <UIcon name="i-lucide-folder-open" class="size-10 mb-2" />
            {{ t('myFiles.empty') }}
        </div>

        <table v-else class="w-full text-sm">
            <thead class="sticky top-0 bg-default">
                <tr class="text-left text-gray-500 border-b">
                    <th class="py-2 pr-2 font-medium">{{ t('myFiles.colName') }}</th>
                    <th class="py-2 px-2 font-medium w-28">{{ t('myFiles.colSize') }}</th>
                    <th class="py-2 px-2 font-medium w-44">{{ t('myFiles.colTime') }}</th>
                    <th class="py-2 pl-2 font-medium w-32 text-right">{{ t('myFiles.colActions') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="f in files" :key="f.id" class="border-b hover:bg-elevated/50 group">
                    <td class="py-2 pr-2">
                        <div class="flex items-center gap-2">
                            <UIcon :name="fileIcon(f)" class="shrink-0 text-gray-400" />
                            <span v-if="renamingId !== f.id" class="truncate">{{ f.name }}</span>
                            <UInput v-else v-model="renameValue" size="xs" autofocus class="flex-1"
                                @keydown.enter="confirmRename(f)" @keydown.esc="cancelRename" />
                        </div>
                    </td>
                    <td class="py-2 px-2 text-gray-500">{{ formatBytes(f.size) }}</td>
                    <td class="py-2 px-2 text-gray-500">{{ formatDate(f.createdAt) }}</td>
                    <td class="py-2 pl-2">
                        <div class="flex items-center justify-end gap-1">
                            <!-- 选择器模式 -->
                            <template v-if="picker">
                                <UButton v-if="!multiple" icon="i-lucide-check" color="primary" variant="soft" size="xs"
                                    :label="t('common.select')" @click="pickFile(f)" />
                                <UCheckbox v-else :model-value="selectedIds.has(f.id)"
                                    @update:model-value="toggleSelect(f, $event)" />
                            </template>
                            <!-- 管理模式 -->
                            <template v-else>
                                <UTooltip v-if="renamingId !== f.id" :text="t('common.edit')">
                                    <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="xs"
                                        @click="startRename(f)" />
                                </UTooltip>
                                <template v-else>
                                    <UButton icon="i-lucide-check" color="success" variant="ghost" size="xs"
                                        @click="confirmRename(f)" />
                                    <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs"
                                        @click="cancelRename" />
                                </template>
                                <UTooltip :text="t('myFiles.preview')">
                                    <UButton icon="i-lucide-eye" color="neutral" variant="ghost" size="xs"
                                        @click="preview(f)" />
                                </UTooltip>
                                <UTooltip :text="t('myFiles.download')">
                                    <UButton icon="i-lucide-download" color="neutral" variant="ghost" size="xs"
                                        @click="download(f)" />
                                </UTooltip>
                                <UTooltip :text="t('common.delete')">
                                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs"
                                        @click="remove(f)" />
                                </UTooltip>
                            </template>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- 分页 -->
    <div class="flex items-center justify-between p-4 pt-3 border-t">
        <span class="text-xs text-gray-400">
            {{ t('myFiles.total', { n: total }) }}
            <template v-if="picker && multiple && selectedIds.size">
                &nbsp;|&nbsp; {{ t('myFiles.selected', { n: selectedIds.size }) }}
            </template>
        </span>
        <div class="flex items-center gap-2">
            <UButton v-if="picker && multiple && selectedIds.size" color="primary" size="sm"
                :label="t('myFiles.confirmSelect')" @click="confirmPickMultiple" />
            <UPagination v-model:page="page" :total="total" :items-per-page="pageSize" :sibling-count="1"
                @update:page="loadFiles()" />
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    group?: string
    picker?: boolean
    multiple?: boolean
    open?: boolean
}>()

const emit = defineEmits<{
    confirm: [files: any[]]
}>()

const { t } = useI18n()
const toast = useToast()

const title = computed(() => props.group ? t('coursePanel.groupFiles') : t('myFiles.title'))

const files = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const sortBy = ref('createdAt')
const sortOrder = ref('desc')

const selectedIds = ref(new Set<number>())

const usage = ref({ used: 0, quota: 0, free: 0, unlimited: false })

const renamingId = ref<number | null>(null)
const renameValue = ref('')

const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const sortOptions = computed(() => [
    { label: t('myFiles.colTime'), value: 'createdAt' },
    { label: t('myFiles.colSize'), value: 'size' },
    { label: t('myFiles.colName'), value: 'name' },
])

const orderIcon = computed(() => sortOrder.value === 'desc' ? 'i-lucide-arrow-down-narrow-wide' : 'i-lucide-arrow-up-wide-narrow')

function toggleOrder() {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
    loadFiles(1)
}

// ========== 格式化 ==========
function formatBytes(n: number) {
    if (!n || n < 0) return '0 B'
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDate(d: any) {
    if (!d) return ''
    return new Date(d).toLocaleString()
}

function fileIcon(f: any) {
    const name = (f.name || '').toLowerCase()
    const type = f.type || ''
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(name)) return 'i-lucide-image'
    if (type.startsWith('video/') || /\.(mp4|webm|avi|mov)$/.test(name)) return 'i-lucide-video'
    if (type.startsWith('audio/') || /\.(mp3|wav|flac)$/.test(name)) return 'i-lucide-music'
    if (type.startsWith('text/') || /\.(txt|md)$/.test(name)) return 'i-lucide-file-text'
    if (/\.(pdf)$/.test(name)) return 'i-lucide-file'
    if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return 'i-lucide-file-archive'
    if (/\.(doc|docx)$/.test(name)) return 'i-lucide-file-text'
    if (/\.(xls|xlsx|csv)$/.test(name)) return 'i-lucide-file-spreadsheet'
    if (/\.(ppt|pptx)$/.test(name)) return 'i-lucide-file'
    return 'i-lucide-file'
}

// ========== 数据加载 ==========
async function loadFiles(targetPage?: number) {
    if (targetPage) page.value = targetPage
    loading.value = true
    try {
        const resp: any = await $fetch('/api/files/list', {
            params: {
                page: page.value,
                pageSize,
                sort: sortBy.value,
                order: sortOrder.value,
                keyword: keyword.value,
                group: props.group || undefined,
            },
        })
        if (resp.success && resp.data) {
            files.value = resp.data.list || []
            total.value = resp.data.total || 0
        }
    } catch (e: any) {
        toast.add({ title: e.message || t('myFiles.loadFailed'), color: 'error' })
    } finally {
        loading.value = false
    }
}

async function loadUsage() {
    try {
        const resp: any = await $fetch('/api/files/usage')
        if (resp.success) usage.value = resp.data
    } catch { /* noop */ }
}

// ========== 上传（小组模式） ==========
function triggerUpload() {
    fileInputRef.value?.click()
}

async function handleUpload(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    uploading.value = true
    try {
        const formData = new FormData()
        formData.append('files', file)
        if (props.group) formData.append('group', props.group)
        const resp: any = await $fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
        })
        if (resp.success) {
            toast.add({ title: t('myFiles.uploadSuccess', { name: file.name }), color: 'success' })
            loadFiles()
        } else {
            toast.add({ title: resp.msg, color: 'error' })
        }
    } catch (e: any) {
        toast.add({ title: e.message || t('myFiles.uploadFailed'), color: 'error' })
    } finally {
        uploading.value = false
        input.value = ''
    }
}

// ========== 重命名 ==========
function startRename(f: any) {
    renamingId.value = f.id
    renameValue.value = f.name
}

function cancelRename() {
    renamingId.value = null
    renameValue.value = ''
}

async function confirmRename(f: any) {
    const name = renameValue.value.trim()
    if (!name || name === f.name) { cancelRename(); return }
    try {
        const resp: any = await $fetch('/api/files/rename', {
            method: 'POST',
            body: { id: f.id, name },
        })
        if (resp.success) {
            f.name = name
            toast.add({ title: t('myFiles.renameSuccess'), color: 'success' })
        } else {
            toast.add({ title: resp.msg, color: 'error' })
        }
    } catch (e: any) {
        toast.add({ title: e.message || t('myFiles.renameFailed'), color: 'error' })
    }
    cancelRename()
}

// ========== 删除 ==========
async function remove(f: any) {
    if (!confirm(t('myFiles.confirmDelete', { name: f.name }))) return
    try {
        const resp: any = await $fetch('/api/files/delete', {
            method: 'POST',
            body: { id: f.id },
        })
        if (resp.success) {
            toast.add({ title: t('myFiles.deleteSuccess'), color: 'success' })
            loadFiles()
            if (!props.group) loadUsage()
        } else {
            toast.add({ title: resp.msg, color: 'error' })
        }
    } catch (e: any) {
        toast.add({ title: e.message || t('myFiles.deleteFailed'), color: 'error' })
    }
}

// ========== 下载 ==========
function download(f: any) {
    const a = document.createElement('a')
    a.href = `/api/files/download?id=${f.id}`
    a.click()
}

// ========== 预览 ==========
function preview(f: any) {
    window.open(`/api/files/serve?pathname=${encodeURIComponent(f.path.replace(/^\/+/, ''))}`, '_blank')
}

// ========== 选择器模式 ==========
function buildFileData(f: any) {
    return {
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        path: f.path,
        url: `/api/files/serve?pathname=${encodeURIComponent(f.path.replace(/^\/+/, ''))}`,
    }
}

function pickFile(f: any) {
    emit('confirm', [buildFileData(f)])
}

function toggleSelect(f: any, checked: any) {
    if (checked) {
        selectedIds.value.add(f.id)
    } else {
        selectedIds.value.delete(f.id)
    }
    selectedIds.value = new Set(selectedIds.value)
}

function confirmPickMultiple() {
    const selected = files.value.filter(f => selectedIds.value.has(f.id)).map(buildFileData)
    if (selected.length) {
        emit('confirm', selected)
    }
}

// ========== 初始化 ==========
onMounted(() => {
    loadFiles(1)
    if (!props.group) loadUsage()
})

// 弹窗模式：每次打开时重新加载
watch(() => props.open, (val) => {
    if (val) {
        keyword.value = ''
        page.value = 1
        selectedIds.value = new Set()
        loadFiles(1)
        if (!props.group) loadUsage()
    }
})

// 切换小组时重新加载
watch(() => props.group, () => {
    keyword.value = ''
    page.value = 1
    selectedIds.value = new Set()
    loadFiles(1)
})
</script>
