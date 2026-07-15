<template>
    <div class="quiz-render w-full relative">
        <!-- InsideinlineEditPanel（UpsideShow） -->
        <div v-if="showConfig" class="vue-node-config">
            <Edit :quiz-id="quizId" :quiz="quiz" :course-id="courseId" @saved="onSaved" />
        </div>

        <Render ref="renderRef" :node="node" :course-id="courseId" @saved="onSaved" />
    </div>
</template>

<script setup>
import { reactive, ref, inject, computed, watch } from 'vue'
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
    meta.title = 'Quiz'
    meta.icon = 'i-lucide-clipboard-check'
    meta.hasSettings = true
}

const emit = defineEmits(['init'])

const quizId = computed(() => Number(props.node?.attrs?.content) || 0)
const quiz = ref(null)
const renderRef = ref(null)

// from render.vue Get quiz Data
watch([renderRef, () => renderRef.value?.data], () => {
    if (renderRef.value?.data) {
        quiz.value = renderRef.value.data
    }
}, { immediate: true, deep: true })

// NewQuiztake whento cid BackNotificationparent nodePointUpdate content Property
function onSaved(qz) {
    // UpdatelocalGround quiz Data
    if (quiz.value) {
        Object.assign(quiz.value, qz)
    } else {
        quiz.value = qz
    }
    // NewQuiz：taketoAdd cid BackNotificationparent nodePointUpdate content Property
    if (qz.cid && Number(qz.cid) !== quizId.value) {
        emit('init', qz.cid)
        props.updateAttributes({ content: String(qz.cid) })
    }
    // EditSaveBackCloseConfigurationPanel
    if (showConfig.value) {
        showConfig.value = false
    }
}
</script>
