<template>
    <div class="homework-node w-full relative">
        <!-- 内联编辑面板（在上方显示） -->
        <div v-if="showConfig" class="vue-node-config">
            <Edit :homework-id="homeworkId" :homework="homework" :course-id="courseId" @saved="onSaved" />
        </div>

        <Render ref="renderRef" :node="node" :course-id="courseId" @saved="onSaved" />
    </div>
</template>

<script setup>
import { reactive, inject } from 'vue'
import { nodeViewProps } from '@tiptap/vue-3'
import Render from './render.vue'
import Edit from './edit.vue'

const props = defineProps(nodeViewProps)

// inject node-view 提供的状态
const showConfig = inject('nodeViewShowConfig', ref(false))
const meta = inject('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))

// 设置组件元信息（告知 node-view 显示设置按钮）
if (meta) {
    meta.title = '作业'
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
