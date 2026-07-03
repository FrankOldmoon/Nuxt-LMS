<template>
    <div class="condition-render-container" :class="{ 'condition-hoverable': needsHoverCheck }"
        @mouseenter="checkCondition">
        <!-- 条件满足时显示内容 -->
        <div v-if="conditionMet && config.content">
            <ueditorRender :json="config.content" />
        </div>

        <!-- 未满足：显示模糊内容 + 条件标签 -->
        <div v-else-if="config.content" class="condition-locked">
            <div class="condition-locked-content">
                <ueditorRender :json="config.content" />
            </div>
            <div class="condition-locked-overlay">
                <UIcon name="i-lucide-lock" class="size-5 text-gray-400" />
                <span class="text-xs text-gray-400 mt-1">{{ t('ueditor.conditionDenied') }}</span>
                <div v-if="config.conditions?.length" class="condition-tags">
                    <UBadge v-for="(c, i) in config.conditions" :key="i" variant="subtle" size="sm">
                        {{ formatCondition(c) }}
                    </UBadge>
                </div>
            </div>
        </div>

        <!-- 检查中 -->
        <div v-else-if="checking" class="condition-checking">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-gray-400" />
            <span class="text-xs text-gray-400 ml-1">{{ t('ueditor.conditionChecking') }}</span>
        </div>

        <!-- 无内容时的 hover 提示 -->
        <div v-else-if="needsHoverCheck" class="condition-hint">
            <UIcon name="i-lucide-shield-check" class="text-gray-400" />
            <span class="text-xs text-gray-400">{{ t('ueditor.conditionHint') }}</span>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    node: Object,
})
const { t } = useI18n()
const { roles } = useAuth()

const config = computed(() => {
    try {
        const raw = props.node?.attrs?.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
})

const checking = ref(false)
const checked = ref(false)
const conditionMet = ref(false)

// 判断是否包含非 role 条件（需要 hover + API 检查）
const needsHoverCheck = computed(() => {
    const conditions = config.value.conditions
    if (!conditions || !conditions.length) return false
    return conditions.some(c => c.type !== 'role')
})

// 检查 role 条件（本地判断）
function checkRoleConditions(conditions) {
    return conditions.filter(c => c.type === 'role').every(c => {
        return (roles.value || []).some(r => r.code === c.value)
    })
}

// role 条件本地即时判断
watch(() => [config.value.conditions, roles.value], () => {
    const conditions = config.value.conditions
    if (!conditions || !conditions.length) {
        conditionMet.value = true
        return
    }

    const roleMet = checkRoleConditions(conditions)
    const nonRoleConditions = conditions.filter(c => c.type !== 'role')

    // 只有 role 条件，直接本地判断
    if (nonRoleConditions.length === 0) {
        conditionMet.value = roleMet
        checked.value = true
        return
    }

    // role 条件不满足，直接 denied（不需要 hover）
    if (!roleMet) {
        conditionMet.value = false
        checked.value = true
        return
    }

    // role 满足但有其他条件，需要 hover 检查
    conditionMet.value = false
    checked.value = false
}, { immediate: true })

const conditionTypeLabels = {
    role: t('ueditor.conditionRole'),
    class: t('ueditor.conditionClass'),
    question: t('ueditor.conditionQuestion'),
    homework: t('ueditor.conditionHomework'),
    comment: t('ueditor.conditionComment'),
}

function formatCondition(c) {
    const label = c.label || c.value
    return `${conditionTypeLabels[c.type] || c.type}: ${label}`
}

// hover 时检查非 role 条件（间隔 5 秒以上才允许再次 check）
let lastCheckTime = 0
async function checkCondition() {
    if (conditionMet.value || checking.value) return
    if (!needsHoverCheck.value) return

    const now = Date.now()
    if (now - lastCheckTime < 5000) return
    lastCheckTime = now

    const conditions = config.value.conditions
    if (!conditions) return

    checking.value = true
    try {
        const data = await cRequest('/api/lms/condition/check', {
            method: 'POST',
            body: { conditions },
        })
        if (data) {
            conditionMet.value = data.met
            checked.value = true
        }
    } catch (e) {
        console.error('[condition] 检查失败', e)
    } finally {
        checking.value = false
    }
}
</script>

<style scoped>
.condition-render-container {
    margin: 12px 0;
    padding: 8px;
    border: 1px dashed #e5e7eb;
    border-radius: 8px;
    min-height: 40px;
}

.condition-hoverable {
    cursor: pointer;
}

.condition-hint {
    display: flex;
    align-items: center;
    gap: 4px;
    justify-content: center;
}

.condition-checking {
    display: flex;
    align-items: center;
    justify-content: center;
}

.condition-locked {
    position: relative;
}

.condition-locked-content {
    filter: blur(4px);
    user-select: none;
    pointer-events: none;
}

.condition-locked-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 8px;
    pointer-events: none;
}

.condition-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
    justify-content: center;
}
</style>
