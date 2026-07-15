<template>
    <div class="homework-node w-full relative">
        <!-- InsideinlineEditPanel（UpsideShow） -->
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

// inject node-view provideStatus
const showConfig = inject('nodeViewShowConfig', ref(false))
const meta = inject('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))

// SettingsComponentelementInfo（informNode-view ShowSettingsButton）
if (meta) {
    meta.title = 'Homework'
    meta.icon = 'i-lucide-book-open'
    meta.hasSettings = true
}

const homeworkId = computed(() => Number(props.node?.attrs?.content) || 0)

// from Render ComponentGet homework Data
const renderRef = ref(null)
const homework = computed(() => renderRef.value?.data || null)

// New Homeworktake whento cid BackNotificationparent nodePointUpdate content Property
function onSaved(hw) {
    // New Homework：taketoAdd cid BackNotificationparent nodePointUpdate content Property
    if (hw.cid && Number(hw.cid) !== homeworkId.value) {
        emit('init', hw.cid)
        props.updateAttributes?.({ content: String(hw.cid) })
    }
    // UpdatelocalGroundData
    if (homework.value) {
        Object.assign(homework.value, hw)
    }
    // EditSaveBackCloseConfigurationPanel
    if (showConfig.value) {
        showConfig.value = false
    }
}

const emit = defineEmits(['init'])
</script>
