<template>
    <div class="peer-review-wrapper w-full relative">
        <!-- 内联编辑面板（设置按钮触发） -->
        <div v-if="showConfig" class="vue-node-config">
            <Edit :cid="peerCid" :course-id="courseId" @saved="onSaved" />
        </div>

        <Render :node="node" :course-id="courseId" @saved="onSaved" />
    </div>
</template>

<script setup>
import { inject, ref, reactive, computed } from 'vue'
import { nodeViewProps } from '@tiptap/vue-3'
import Render from './render.vue'
import Edit from './edit.vue'
const { t } = useI18n()

const props = defineProps(nodeViewProps)

const { courseId } = useLmsContext()

// inject node-view 提供的状态
const showConfig = inject('nodeViewShowConfig', ref(false))
const meta = inject('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))

if (meta) {
    meta.title = t('peerReview.label')
    meta.icon = 'i-lucide-users'
    meta.hasSettings = true
}

const emit = defineEmits(['init'])

const peerCid = computed(() => Number(props.node?.attrs?.content) || 0)

function onSaved(cfg) {
    // 新建活动：拿到新增 cid 后通知父节点更新 content 属性
    if (cfg && cfg.cid && Number(cfg.cid) !== peerCid.value) {
        emit('init', cfg.cid)
        props.updateAttributes?.({ content: String(cfg.cid) })
    }
    // 编辑保存后关闭配置面板
    if (showConfig.value) {
        showConfig.value = false
    }
}
</script>
