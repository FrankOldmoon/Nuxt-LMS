<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-5xl' }" scrollable>
        <template #content>
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">{{ $t('coursePanel.groups') }}</h3>
                    <div v-if="canEdit && activeTab === 'members'" class="flex items-center gap-2">
                        <UButton icon="i-lucide-plus" color="primary" variant="outline" size="xs"
                            :label="$t('coursePanel.addGroup')" @click="addGroup" />
                        <UButton icon="i-lucide-save" color="primary" size="xs" :loading="saving"
                            :label="$t('common.save')" @click="saveGroups" />
                    </div>
                </div>

                <div class="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
                    <button v-for="tab in tabs" :key="tab.value"
                        class="px-3 py-1.5 text-sm font-medium border-b-2 transition-colors"
                        :class="activeTab === tab.value
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
                        @click="activeTab = tab.value">
                        {{ tab.label }}
                    </button>
                </div>

                <div v-if="loading && activeTab === 'members'" class="py-8 text-center text-gray-400">
                    {{ $t('common.loading') }}
                </div>
                <CourseGroupsModalMembersTab v-else-if="activeTab === 'members'" />

                <template v-else-if="activeTab === 'chat'">
                    <div v-if="canEdit" class="mb-3 flex items-center gap-2">
                        <span class="text-sm text-gray-500">{{ $t('coursePanel.selectGroup') }}:</span>
                        <USelect v-model="selectedGroupName" :items="groupOptions" size="sm" class="w-48" />
                    </div>
                    <div v-if="activeGroupId" class="h-[500px]">
                        <CourseGroupChat :group-id="activeGroupId" />
                    </div>
                    <div v-else class="text-center py-8 text-gray-400 text-sm">
                        {{ canEdit ? $t('coursePanel.noGroups') : $t('coursePanel.ungrouped') }}
                    </div>
                </template>

                <template v-else-if="activeTab === 'files'">
                    <div v-if="canEdit" class="mb-3 flex items-center gap-2">
                        <span class="text-sm text-gray-500">{{ $t('coursePanel.selectGroup') }}:</span>
                        <USelect v-model="selectedGroupName" :items="groupOptions" size="sm" class="w-48" />
                    </div>
                    <div v-if="activeGroupId" class="h-[500px]">
                        <FilesMyFilesModal :group="activeGroupId" inline />
                    </div>
                    <div v-else class="text-center py-8 text-gray-400 text-sm">
                        {{ canEdit ? $t('coursePanel.noGroups') : $t('coursePanel.ungrouped') }}
                    </div>
                </template>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
interface GroupsModalProps {
    courseId?: string | number
    classId?: string | number
}

const props = defineProps<GroupsModalProps>()
const isOpen = defineModel<boolean>('open', { default: false })

const {
    canEdit, activeTab, tabs, loading, saving,
    selectedGroupName, groupOptions, activeGroupId,
    addGroup, saveGroups,
} = useCourseGroups(props, isOpen)
</script>
