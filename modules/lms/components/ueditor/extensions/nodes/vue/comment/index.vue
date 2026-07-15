<template>
    <div class="comment-render w-full relative">
        <!-- InsideinlineEditPanel（UpsideShow） -->
        <div v-if="showConfig" class="vue-node-config">
            <Edit :comment-id="commentId" :comment="comment" :course-id="courseId" @saved="onSaved" />
        </div>

        <Render :node="node" :comment="comment" :course-id="courseId" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Render from './render.vue'
import Edit from './edit.vue'

const props = defineProps(nodeViewProps)

const { courseId } = useLmsContext()

// inject node-view provideStatus
const showConfig = inject('nodeViewShowConfig', ref(false))
const meta = inject('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))

// SettingsComponentelementInfo（informNode-view ShowSettingsButton）
if (meta) {
    meta.title = 'Comment'
    meta.icon = 'i-lucide-message-circle'
    meta.hasSettings = true
}

const emit = defineEmits(['init'])

const commentId = computed(() => Number(props.node?.attrs?.content) || 0)

// Get CommentData
const apiUrl = computed(() => {
    if (!commentId.value || !courseId.value) return ''
    return `/api/comments/show?course_id=${courseId.value}&cid=${commentId.value}`
})

const { data: comment } = cRequest.use(apiUrl, {
    transform: (raw) => {
        if (!raw) return null
        return {
            name: raw.name || '',
            content: raw.content || '',
            tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
            point: Number(raw.point) || 0,
        }
    },
})

// New Commenttake whento cid BackNotificationparent nodePointUpdate content Property
function onSaved(cm) {
    if (cm.cid && Number(cm.cid) !== commentId.value) {
        emit('init', cm.cid)
        props.updateAttributes({ content: String(cm.cid) })
    }
    // EditSaveBackCloseConfigurationPanel
    if (showConfig.value) {
        showConfig.value = false
    }
}
</script>
