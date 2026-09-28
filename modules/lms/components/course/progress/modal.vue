<template>
    <div>
        <UModal v-model:open="isOpen" :ui="{ content: 'max-w-4xl' }" scrollable>
            <template #content>
                <div class="p-6">
                    <CourseUserSelect v-if="canSelectStudent" :course-id="Number(courseId)"
                        @impersonated="onImpersonated" @restored="onImpersonated" />

                    <div v-if="overallProgress !== null" class="mb-4 p-4 bg-elevated/50 rounded-lg">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-medium">{{ $t('coursePanel.progress') }}</span>
                            <span class="text-lg font-bold text-primary">{{ overallProgress }}%</span>
                        </div>
                        <div class="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div class="h-full bg-primary rounded-full transition-all duration-500"
                                :style="{ width: `${overallProgress}%` }" />
                        </div>
                        <p class="text-xs text-muted mt-1.5">{{ passedCount }} / {{ totalCount }} {{ $t('coursePanel.chapter') }}</p>
                    </div>

                    <div v-if="loading" class="py-8 text-center text-gray-400">{{ $t('common.loading') }}</div>
                    <UTable v-else v-model:expanded="expanded" :data="tableData" :columns="columns"
                        :get-sub-rows="(row: any) => row.children" class="flex-1" :ui="{
                            base: 'border-separate border-spacing-0',
                            tbody: '[&>tr]:last:[&>td]:border-b-0',
                            tr: 'group hover:bg-gray-50',
                            td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default',
                        }" />
                </div>
            </template>
        </UModal>

        <TaskModal v-model:open="taskModalOpen" :course-id="courseId" :type="taskModalItem.type" :id="taskModalItem.id"
            :status="taskModalItem.status" @submitted="onTaskSubmitted" />
    </div>
</template>

<script setup lang="ts">
import type { NavItem } from '../../../composables/useCourseProgress'
import TaskModal from '../task/modal.vue'

interface ProgressModalProps {
    courseId: string | number
    navigation: NavItem[]
}

const props = defineProps<ProgressModalProps>()
const isOpen = defineModel<boolean>('open', { default: false })

// 在 setup 阶段解析 UI 组件引用，传入 composable。
// 避免 composable 内部 resolveComponent 返回的字符串在 h() 渲染时 lookup 失败。
const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')
const UIcon = resolveComponent('UIcon')
const NuxtLink = resolveComponent('NuxtLink')

const {
    loading, taskModalOpen, taskModalItem, canSelectStudent,
    tableData, expanded, columns,
    totalCount, passedCount, overallProgress,
    onImpersonated, onTaskSubmitted,
} = useCourseProgress(props, isOpen, { UButton, UTooltip, UIcon, NuxtLink })
</script>
