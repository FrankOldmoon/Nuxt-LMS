import { ref, computed, watch } from 'vue'

export interface ConditionRenderProps {
    node?: any
}

export function useConditionRender(props: ConditionRenderProps) {
    const { t } = useI18n()
    const { roles } = useAuth()
    const { classIds } = useAuthLms()

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

    // role and class itemsconditioncanfrom User InformationlocalGroundjudge，Noneneed hover + API
    const LOCAL_CHECK_TYPES = new Set(['role', 'class'])

    // judgeYesNocontain needed hover + API checkitemscondition（non role、non class）
    const needsHoverCheck = computed(() => {
        const conditions = config.value.conditions
        if (!conditions || !conditions.length) return false
        return conditions.some((c: any) => !LOCAL_CHECK_TYPES.has(c.type))
    })

    // check role itemscondition（localGroundjudge）
    // teacher itemscondition admin also canPass
    function checkRoleConditions(conditions: any[]) {
        const roleConds = conditions.filter(c => c.type === 'role')
        if (roleConds.length === 0) return true
        const userRoles = (roles.value || []).map((r: any) => r.code)
        const isAdmin = userRoles.includes('admin')
        return roleConds.every(c => {
            if (c.value === 'teacher') return userRoles.includes('teacher') || isAdmin
            return userRoles.includes(c.value)
        })
    }

    // check class itemscondition（localGroundjudge，User classIds alreadyincludeAllattributeClass）
    function checkClassConditions(conditions: any[]) {
        const classConds = conditions.filter(c => c.type === 'class')
        if (classConds.length === 0) return true
        const ids = classIds.value || []
        return classConds.every(c => ids.includes(Number(c.value)))
    }

    // localGrounditemscondition（role + class）that isjudge when
    watch(() => [config.value.conditions, roles.value, classIds.value], () => {
        const conditions = config.value.conditions
        if (!conditions || !conditions.length) {
            conditionMet.value = true
            checked.value = true
            return
        }

        const localMet = checkRoleConditions(conditions) && checkClassConditions(conditions)
        const hoverConditions = conditions.filter((c: any) => !LOCAL_CHECK_TYPES.has(c.type))

        // AllYeslocalGrounditemscondition（role + class），directly judge
        if (hoverConditions.length === 0) {
            conditionMet.value = localMet
            checked.value = true
            return
        }

        // localGroundConditions Not Met，directly denied（not need hover）
        if (!localMet) {
            conditionMet.value = false
            checked.value = true
            return
        }

        // localGrounditemsconditionFullsufficientbutHasOtheritemscondition（question/homework/comment/quiz/race），need hover check
        conditionMet.value = false
        checked.value = false
    }, { immediate: true })

    const conditionTypeLabels: Record<string, any> = {
        role: t('ueditor.conditionRole'),
        class: t('ueditor.condition Class'),
        question: t('ueditor.condition Question'),
        homework: t('ueditor.conditionHomework'),
        comment: t('ueditor.conditionComment'),
        quiz: t('ueditor.conditionQuiz'),
        race: t('ueditor.conditionRace'),
    }

    function formatCondition(c: any) {
        const label = c.label || c.value
        return `${conditionTypeLabels[c.type] || c.type}: ${label}`
    }

    // hover check non when role itemscondition（betweeninterval 5 swithUponlyAllowthentimes check）
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
            const data = await cRequest('/api/condition/check', {
                method: 'POST',
                body: { conditions },
            })
            if (data) {
                conditionMet.value = data.met
                checked.value = true
            }
        } catch (e) {
            console.error('[condition] checkFailed', e)
        } finally {
            checking.value = false
        }
    }

    return {
        t, config, needsHoverCheck, checking, conditionMet,
        formatCondition, checkCondition,
    }
}
