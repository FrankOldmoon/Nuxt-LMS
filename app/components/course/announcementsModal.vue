<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-6xl' }" scrollable>
        <template #content>
            <div class="p-6 space-y-4 min-w-[600px]">
                <h3 class="text-lg font-semibold">{{ t('announcement.title') }}</h3>

                <!-- 新建表单入口（仅教师） -->
                <div v-if="canCreate" class="flex justify-end">
                    <UButton :icon="showCreateForm ? 'i-lucide-x' : 'i-lucide-plus'"
                        :label="showCreateForm ? t('common.cancel') : t('announcement.new')" color="primary"
                        variant="soft" size="sm" @click="toggleCreateForm" />
                </div>

                <!-- 新建表单 -->
                <div v-if="showCreateForm && canCreate"
                    class="p-4 border border-default rounded-lg space-y-3 bg-elevated/30">
                    <UFormField :label="t('announcement.name')" required>
                        <UInput v-model="form.name" :placeholder="t('announcement.namePlaceholder')"
                            :ui="{ root: 'w-full' }" />
                    </UFormField>

                    <UFormField :label="t('announcement.content')">
                        <RichEditor v-model="form.contentText" />
                    </UFormField>

                    <UFormField :label="t('announcement.targetClasses')">
                        <div class="flex flex-wrap gap-3">
                            <UCheckbox v-for="cls in classes" :key="cls.id"
                                :model-value="form.classIds.includes(cls.id)" :label="cls.name"
                                @update:model-value="(v) => toggleClass(cls.id, v)" />
                            <span v-if="!classes.length" class="text-xs text-muted">
                                {{ t('announcement.noClasses') }}
                            </span>
                        </div>
                        <p class="text-xs text-muted mt-1.5">
                            {{ t('announcement.targetClassesHint') }}
                        </p>
                    </UFormField>

                    <div class="flex justify-end gap-2 pt-2">
                        <UButton variant="ghost" size="sm" @click="showCreateForm = false">
                            {{ t('common.cancel') }}
                        </UButton>
                        <UButton color="primary" size="sm" :loading="creating" :disabled="!form.name.trim()"
                            @click="createAnnouncement">
                            {{ t('announcement.publish') }}
                        </UButton>
                    </div>
                </div>

                <!-- 公告列表 -->
                <div v-if="pending" class="py-8 text-center text-muted">
                    {{ t('common.loading') }}
                </div>
                <div v-else-if="!announcements.length" class="py-8 text-center text-muted">
                    {{ t('announcement.empty') }}
                </div>
                <div v-else class="space-y-3">
                    <div v-for="item in announcements" :key="item.id" class="p-3 border border-default rounded-lg">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-highlighted truncate">{{ item.name }}</div>
                                <div class="flex items-center gap-2 text-xs text-muted mt-0.5">
                                    <span>{{ formatTime(item.createdAt) }}</span>
                                    <span>·</span>
                                    <UBadge v-if="item.classId"
                                        :label="classMap.get(item.classId)?.name || t('announcement.classLabel', { id: item.classId })"
                                        color="info" variant="subtle" size="sm" />
                                    <UBadge v-else :label="t('announcement.allClasses')" color="neutral"
                                        variant="subtle" size="sm" />
                                </div>
                                <div v-if="item.content" class="mt-2 text-sm whitespace-pre-wrap text-highlighted">
                                    {{ renderContent(item.content) }}
                                </div>
                            </div>
                            <UButton v-if="canCreate" icon="i-lucide-trash-2" color="error" variant="ghost" size="xs"
                                @click="deleteAnnouncement(item.id)" />
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel('open', { default: false })
const { t } = useI18n()
const { hasRole, isCourseTeacher } = useAuth()
const toast = useToast()

const props = defineProps({
    courseId: { type: [String, Number], default: '' },
})

// 响应式状态
const pending = ref(false)
const creating = ref(false)
const showCreateForm = ref(false)
const announcements = ref<any[]>([])
const classes = ref<any[]>([])

const form = ref({
    name: '',
    contentText: '',
    classIds: [] as number[],
})

// 计算属性
const classMap = computed(() => {
    const map = new Map<number, { id: number; name: string }>()
    for (const cls of classes.value) {
        map.set(Number(cls.id), cls)
    }
    return map
})

// 权限判断：管理员 / 系统教师 / 本课程教师可发布公告
const canCreate = computed(() => {
    const cid = Number(props.courseId)
    if (!cid) return false
    return hasRole('admin')
        || hasRole('teacher')
        || isCourseTeacher(cid)
})

// 工具函数
function toggleClass(id: number, checked: boolean) {
    const set = new Set(form.value.classIds)
    if (checked) set.add(id)
    else set.delete(id)
    form.value.classIds = Array.from(set)
}

function formatTime(time: any): string {
    if (!time) return ''
    const date = new Date(time)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleString()
}

/**
 * 渲染 content（兼容纯文本 / JSON 格式 Tiptap 文档）
 * 公告正文取纯文本展示
 */
function renderContent(content: any): string {
    if (content == null) return ''
    if (typeof content === 'string') {
        try {
            const obj = JSON.parse(content)
            if (obj && typeof obj === 'object') return extractText(obj)
        } catch {
            return content
        }
        return content
    }
    if (typeof content === 'object') return extractText(content)
    return String(content)
}

function extractText(node: any): string {
    if (!node) return ''
    if (typeof node === 'string') return node
    if (Array.isArray(node)) return node.map(extractText).join('')
    if (node.text) return node.text
    if (Array.isArray(node.content)) return node.content.map(extractText).join('')
    return ''
}

function toggleCreateForm() {
    showCreateForm.value = !showCreateForm.value
    if (!showCreateForm.value) {
        form.value = { name: '', contentText: '', classIds: [] }
    }
}

// 数据加载
async function loadData() {
    if (!props.courseId) return
    pending.value = true
    try {
        // 教师身份加载班级列表，用于发布时选择目标班级
        if (canCreate.value) {
            const classRes = await cRequest<any>('/api/lms/classes/list')
            const data = (classRes as any)?.data
            classes.value = Array.isArray(data) ? data : (Array.isArray(classRes) ? classRes : [])
        }
        // 加载公告列表
        const annRes = await cRequest<any>('/api/lms/announcements/list', {
            query: { courseId: Number(props.courseId) },
        })
        const data = (annRes as any)?.data
        announcements.value = Array.isArray(data) ? data : (Array.isArray(annRes) ? annRes : [])
    } catch (e: any) {
        console.error('加载公告失败', e)
        toast.add({
            title: t('announcement.loadFailed'),
            description: e?.message,
            color: 'error',
        })
    } finally {
        pending.value = false
    }
}

// 操作方法
async function createAnnouncement() {
    if (!form.value.name.trim()) return
    creating.value = true
    try {
        await cRequest('/api/lms/announcements/add', {
            method: 'POST',
            body: {
                courseId: Number(props.courseId),
                name: form.value.name.trim(),
                content: form.value.contentText || null,
                classIds: form.value.classIds,
            },
        })
        toast.add({ title: t('announcement.createSuccess'), color: 'success' })
        showCreateForm.value = false
        form.value = { name: '', contentText: '', classIds: [] }
        await loadData()
    } catch (e: any) {
        toast.add({
            title: t('announcement.createFailed'),
            description: e?.message || String(e),
            color: 'error',
        })
    } finally {
        creating.value = false
    }
}

async function deleteAnnouncement(id: number) {
    try {
        await cRequest('/api/lms/announcements/delete', {
            method: 'POST',
            body: { id },
        })
        await loadData()
    } catch (e: any) {
        toast.add({
            title: t('announcement.deleteFailed'),
            description: e?.message || String(e),
            color: 'error',
        })
    }
}

// 弹窗打开时自动加载数据
watch(isOpen, (val) => {
    if (val) loadData()
})
</script>