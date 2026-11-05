<template>
    <div class="homework-node w-full relative">
        <!-- 内联编辑面板（在上方显示） -->
        <div v-if="showConfig" class="vue-node-config">
            <Edit :homework-id="homeworkId" :homework="homework" :course-id="courseId" @saved="onSaved" />
        </div>

        <!-- 尚未设置内容（没有 cid）：不渲染空作业，提示先填写并保存 -->
        <div v-if="!homeworkId"
            class="flex items-start gap-2 p-4 rounded-lg border-2 border-dashed border-red-300 bg-red-50/50 text-sm text-red-500 dark:border-red-800 dark:bg-red-950/20">
            <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0 mt-0.5" />
            <div class="flex-1">
                <p class="font-medium">{{ t('homework.unsaved') }}</p>
                <p class="text-xs mt-1 opacity-80">{{ t('homework.unsavedHint') }}</p>
            </div>
            <UButton size="2xs" color="primary" variant="soft" icon="i-lucide-settings-2" :label="t('common.edit')"
                @click="showConfig = true" />
        </div>

        <Render v-else ref="renderRef" :node="node" :course-id="courseId" @saved="onSaved" />
    </div>
</template>

<script setup>
import { reactive, inject } from 'vue'
import { nodeViewProps } from '@tiptap/vue-3'
import Render from './render.vue'
import Edit from './edit.vue'
const { t } = useI18n()

const props = defineProps(nodeViewProps)

// 课程上下文（编辑器里没有 prop 传入，统一取 useLmsContext）
const { courseId } = useLmsContext()

// inject node-view 提供的状态
const showConfig = inject('nodeViewShowConfig', ref(false))
const meta = inject('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))

// 设置组件元信息（告知 node-view 显示设置按钮）
if (meta) {
    meta.title = t('homework.label')
    meta.icon = 'i-lucide-book-open'
    meta.hasSettings = true
}

const homeworkId = computed(() => Number(props.node?.attrs?.content) || 0)

// 从 Render 组件获取 homework 数据
const renderRef = ref(null)
const homework = computed(() => renderRef.value?.data || null)

// 新建作业时拿到 cid 后通知父节点更新 content 属性
function onSaved(hw) {
    // 新建作业：拿到新增 cid 后通知父节点更新 content 属性
    if (hw.cid && Number(hw.cid) !== homeworkId.value) {
        emit('init', hw.cid)
        props.updateAttributes?.({ content: String(hw.cid) })
    }
    // 更新本地数据
    if (homework.value) {
        Object.assign(homework.value, hw)
    }
    // 编辑保存后关闭配置面板
    if (showConfig.value) {
        showConfig.value = false
    }
}

const emit = defineEmits(['init'])
</script>
