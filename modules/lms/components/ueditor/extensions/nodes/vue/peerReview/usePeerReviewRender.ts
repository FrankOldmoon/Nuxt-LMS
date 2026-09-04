import { ref, computed, watch } from 'vue'

export function usePeerReviewRender(props: any, emit: any) {
    const { t } = useI18n()
    const { courseId: ctxCourseId, chapterId } = useLmsContext()
    const effectiveCourseId = computed(() => {
        if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
            return Number(props.courseId) || 0
        }
        return ctxCourseId.value
    })

    const peerCid = computed(() => Number(props.node?.attrs?.content) || 0)

    const loading = ref(false)
    const config = ref<any>(null)
    const myScores = ref<Record<number, Record<string, number>>>({})
    const isTeacher = ref(false)

    // 班级名单来自 default_class（参考 race 拓展）
    const { user } = useAuth()
    const classId = computed(() => user.value?.defaultClass?.id || user.value?.classId || 0)
    const { students: classStudents, fetchUsers } = useClassUsers()
    // 适配 peerReview 预期的学生结构（userId/name/avatarImg）
    const students = computed(() =>
        classStudents.value.map((s: any) => ({
            userId: s.id,
            name: s.name,
            avatarImg: s.avatarImg,
        })),
    )

    // 学生评价面板状态
    const selectedTarget = ref<any>(null)
    const draftScores = ref<Record<string, number>>({})
    const submitting = ref(false)
    const submitMsg = ref('')
    const submitOk = ref(true)

    // 教师结果
    const resultOpen = ref(false)
    const resultData = ref<any>(null)
    const resultLoading = ref(false)
    const settling = ref(false)

    async function load() {
        if (!peerCid.value || !effectiveCourseId.value) return
        loading.value = true
        try {
            // 拉取 default_class 班级名单（参考 race 拓展 ~useClassUsers）
            if (classId.value) await fetchUsers(Number(classId.value), effectiveCourseId.value)
            const data = await cRequest(`/api/peer-reviews/show?course_id=${effectiveCourseId.value}&cid=${peerCid.value}`)
            if (!data) return
            config.value = data.config || null
            myScores.value = data.myScores || {}
            isTeacher.value = !!data.isTeacher
        } catch {
            config.value = null
        } finally {
            loading.value = false
        }
    }

    watch([peerCid, effectiveCourseId, classId], load, { immediate: true })

    /** 选中某学生开始评价 */
    function openRating(student: any) {
        if (isTeacher.value) return
        selectedTarget.value = student
        // 回填已评分值（可覆盖修改）
        const prev = myScores.value[student.userId] || {}
        draftScores.value = { ...prev }
        submitMsg.value = ''
    }

    function closeRating() {
        selectedTarget.value = null
        draftScores.value = {}
    }

    function isRated(studentId: number): boolean {
        return !!myScores.value[studentId]
    }

    async function submitRating() {
        if (!selectedTarget.value) return
        submitting.value = true
        submitMsg.value = ''
        try {
            await cRequest('/api/peer-reviews/submit', {
                method: 'POST',
                body: {
                    course_id: effectiveCourseId.value,
                    chapter_id: chapterId?.value || 0,
                    cid: peerCid.value,
                    target_user_id: selectedTarget.value.userId,
                    scores: draftScores.value,
                },
            })
            submitMsg.value = t('peerReview.submitSuccess')
            submitOk.value = true
            await load()
            // 保留评价面板并标记已评
        } catch (e: any) {
            submitMsg.value = e?.message || t('common.operationFailed')
            submitOk.value = false
        } finally {
            submitting.value = false
        }
    }

    /** 教师：拉取结果汇总 */
    async function loadResult(settle = false) {
        if (!effectiveCourseId.value) return
        resultLoading.value = true
        try {
            const data = await cRequest(`/api/peer-reviews/result?course_id=${effectiveCourseId.value}${settle ? '&settle=1' : ''}`)
            resultData.value = data || null
            if (settle) settling.value = true
        } catch {
            resultData.value = null
        } finally {
            resultLoading.value = false
        }
    }

    function openResult() {
        resultOpen.value = true
        loadResult(false)
    }

    function closeResult() {
        resultOpen.value = false
        resultData.value = null
        settling.value = false
    }

    async function settleScores() {
        await loadResult(true)
    }

    return {
        t, loading, config, students, myScores, isTeacher, peerCid,
        selectedTarget, draftScores, submitting, submitMsg, submitOk,
        resultOpen, resultData, resultLoading, settling,
        openRating, closeRating, isRated, submitRating,
        openResult, closeResult, settleScores,
    }
}
