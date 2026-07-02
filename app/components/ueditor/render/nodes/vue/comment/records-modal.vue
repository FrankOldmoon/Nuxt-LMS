<template>
    <UModal v-model:open="open" scrollable fullscreen>
        <template #content>
            <div class="p-6 space-y-4 min-w-[600px]">
                <h2 class="text-lg font-semibold">{{ $t('record.commentRecords') }}</h2>

                <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns"
                    :hide-actions="true" :hide-teachers="true" :default-sort="defaultSort">
                    <!-- record 列：显示评论数 + 总赞数 -->
                    <template #record-cell="{ row }">
                        <div class="flex items-center gap-2">
                            <template v-if="row.original.record">
                                <span class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300">
                                    <UIcon name="i-heroicons-chat-bubble-left-right" class="w-3 h-3" />
                                    {{ row.original.record.comments?.length || 0 }}
                                </span>
                                <span class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-500">
                                    <UIcon name="i-heroicons-heart" class="w-3 h-3" />
                                    {{ row.original.record.likeCount || 0 }}
                                </span>
                            </template>
                            <span v-else class="text-xs text-gray-400">-</span>
                        </div>
                    </template>
                </ClassUsersTable>
            </div>
        </template>
    </UModal>
</template>

<script setup>
const props = defineProps({
    modelValue: { type: Boolean, default: false },
    courseId: { type: Number, default: 0 },
    cid: { type: Number, default: 0 },
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const rows = ref([])
const pending = ref(false)

const extraColumns = computed(() => [{
    id: 'record',
    header: t('record.colRecord'),
    sortingFn: (a, b) => (a.original.record ? 1 : 0) - (b.original.record ? 1 : 0),
}])

const defaultSort = [{ id: 'record', desc: true }]

async function fetchRecords() {
    if (!props.courseId || !props.cid) {
        rows.value = []
        return
    }
    pending.value = true
    try {
        const data = await cRequest(`/api/lms/comments/records?course_id=${props.courseId}&cid=${props.cid}`)
        rows.value = data || []
    } catch {
        rows.value = []
    } finally {
        pending.value = false
    }
}

watch(open, (val) => {
    if (val) fetchRecords()
})
</script>
