<template>
    <div class="race-wrapper w-full relative">
        <!-- 内联编辑面板（在上方显示） -->
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
const { t } = useI18n()

const props = defineProps(nodeViewProps)

const { courseId } = useLmsContext()

// inject node-view 提供的状态
const showConfig = inject('nodeViewShowConfig', ref(false))
const meta = inject('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))

// 设置组件元信息（告知 node-view 显示设置按钮）
if (meta) {
    meta.title = t('race.label')
    meta.icon = 'i-lucide-trophy'
    meta.hasSettings = true
}

const emit = defineEmits(['init'])

const raceId = computed(() => Number(props.node?.attrs?.content) || 0)

// 默认竞赛
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

// raceId 为空时使用默认竞赛；否则使用接口数据
const race = ref(defaultRace)
watch([fetchedRace, raceId], () => {
    if (!raceId.value) {
        race.value = defaultRace
    } else if (fetchedRace.value) {
        race.value = fetchedRace.value
    }
}, { immediate: true, flush: 'sync' })

function onSaved(rc) {
    // 新建竞赛：拿到新增 cid 后通知父节点更新 content 属性
    if (rc.cid && Number(rc.cid) !== raceId.value) {
        emit('init', rc.cid)
        props.updateAttributes?.({ content: String(rc.cid) })
    }
    // 更新本地 race 数据
    if (race.value) {
        Object.assign(race.value, rc)
    }
    // 编辑保存后关闭配置面板
    if (showConfig.value) {
        showConfig.value = false
    }
}
</script>