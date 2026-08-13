/**
 * 课程编辑器：加载/保存课程内容、基础信息、配置、成员管理
 */
export function useCourseEditor(
  props: { courseId: number },
  emit: (e: 'saved') => void,
) {
  const { t } = useI18n()
  const toast = useToast()
  const { hasRole } = useAuth()
  const { isCourseEditor } = useAuthLms()

  const open = ref(false)
  const loading = ref(false)
  const saving = ref(false)

  const canEdit = computed(() => hasRole('admin') || isCourseEditor(props.courseId))
  const lockId = computed(() => `courses_${props.courseId}`)

  const configFormRef = ref<{ initFromConfig: (cfg: Record<string, any>) => void; buildConfig: () => Record<string, any> | null } | null>(null)
  const membersRef = ref<{ loadMembers: () => Promise<void> } | null>(null)

  const form = ref({
    name: '',
    code: '',
    tags: [] as string[],
  })

  const contentJson = ref<any>(null)

  function openModal() {
    open.value = true
  }

  function closeModal() {
    open.value = false
  }

  async function loadCourse() {
    loading.value = true
    try {
      const data = await cRequest<any>(`/api/courses/show?id=${props.courseId}`)
      form.value = {
        name: data?.title || '',
        code: data?.code || '',
        tags: (data?.tags as string[]) || [],
      }
      contentJson.value = data?.content || null
      const cfg = (data?.config as Record<string, any>) || {}
      configFormRef.value?.initFromConfig(cfg)
      await membersRef.value?.loadMembers()
    } catch {
      toast.add({ title: t('courseEditor.loadFailed'), color: 'error' })
    } finally {
      loading.value = false
    }
  }

  async function save() {
    const finalConfig = configFormRef.value?.buildConfig()
    if (!finalConfig) return

    saving.value = true
    try {
      await cRequest('/api/courses/update', {
        method: 'POST',
        body: {
          id: props.courseId,
          name: form.value.name,
          code: form.value.code,
          tags: form.value.tags,
          config: finalConfig,
          content: contentJson.value,
        },
      })
      toast.add({ title: t('courseEditor.saveSuccess'), color: 'success' })
      emit('saved')
      closeModal()
    } catch (e: any) {
      toast.add({ title: e.message || t('courseEditor.saveFailed'), color: 'error' })
    } finally {
      saving.value = false
    }
  }

  watch(open, (val) => {
    if (val) loadCourse()
  })

  return {
    open,
    loading,
    saving,
    canEdit,
    lockId,
    form,
    contentJson,
    configFormRef,
    membersRef,
    openModal,
    closeModal,
    loadCourse,
    save,
  }
}
