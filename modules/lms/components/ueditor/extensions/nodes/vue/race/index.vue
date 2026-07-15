<template>
    <div class="race-wrapper w-full relative">
        <!-- InsideinlineEditPanel（UpsideShow） -->
        <div v-if="showConfig" class="vue-node-config">
            <Edit :race-id="raceId" :race="race" :course-id="courseId" @saved="onSaved" />
        </div>

        <Render :node="node" :course-id="courseId" @saved="onSaved" />
    </div>
</template>

<script setup>
import { inject, ref, computed, reactive, watch } from 'vue'
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
    meta.title = 'Competition'
    meta.icon = 'i-lucide-trophy'
    meta.hasSettings = true
}

const emit = defineEmits(['init'])

const raceId = computed(() => Number(props.node?.attrs?.content) || 0)

// DefaultCompetition
const defaultRace = reactive({
    name: '',
    gapTime: 30,
    point: 100,
    questionIds: [],
})

const apiUrl = computed(() => {
    if (!raceId.value || !courseId.value) return ''
    return `/api/races/show?course_id=${courseId.value}&cid=${raceId.value}`
})

const { data: fetchedRace } = cRequest.use(apiUrl, {
    transform: (raw) => {
        if (!raw) return null
        return reactive({
            name: raw.name || '',
            gapTime: Number(raw.gapTime) || 30,
            point: Number(raw.point) || 100,
            questionIds: raw.questionIds || [],
        })
    },
})

// raceId EmptywhenmakeuseDefaultCompetition；ElsemakeuseAPIData
const race = ref(defaultRace)
watch([fetchedRace, raceId], () => {
    if (!raceId.value) {
        race.value = defaultRace
    } else if (fetchedRace.value) {
        race.value = fetchedRace.value
    }
}, { immediate: true, flush: 'sync' })

function onSaved(rc) {
    // NewCompetition：taketoAdd cid BackNotificationparent nodePointUpdate content Property
    if (rc.cid && Number(rc.cid) !== raceId.value) {
        emit('init', rc.cid)
        props.updateAttributes?.({ content: String(rc.cid) })
    }
    // UpdatelocalGround race Data
    if (race.value) {
        Object.assign(race.value, rc)
    }
    // EditSaveBackCloseConfigurationPanel
    if (showConfig.value) {
        showConfig.value = false
    }
}
</script>