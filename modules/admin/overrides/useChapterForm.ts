import { ref, computed, reactive, onMounted, watch } from 'vue'

export interface ChapterFormProps {
  row: Record<string, any> | null
}

export function useChapterForm(props: ChapterFormProps, emit: (e: 'saved' | 'cancel', ...args: any[]) => void) {
  const { t } = useI18n()
  const toast = useToast()

  /** RichEditor component (provided by LMS) */
  const richEditorComp = computed(() => {
    if (!useRuntimeConfig().public.moduleLms) return null
    try {
      return resolveComponent('RichEditor')
    } catch {
      return null
    }
  })

  const isEdit = computed(() => !!props.row)

  const form = reactive<Record<string, any>>({
    name: '',
    content: null,
  })

  // In add mode, force course selection first
  const selectedCourseId = ref<number | undefined>(undefined)
  const courseOptions = ref<{ id: number; label: string }[]>([])
  const courseLoading = ref(false)

  // Derive courseId: edit mode → row's courseId; add mode → user-selected selectedCourseId
  const effectiveCourseId = computed(() => {
    if (isEdit.value) {
      const v = props.row?.courseId ?? props.row?.course_id
      if (v !== undefined && v !== null && v !== '') return Number(v) || undefined
    }
    return selectedCourseId.value ? Number(selectedCourseId.value) : undefined
  })

  const saving = ref(false)

  // Initialize form
  watch(
    () => props.row,
    (r) => {
      if (r) {
        form.name = r.name || ''
        form.content = r.content ?? { type: 'doc', content: [] }
      } else {
        form.name = ''
        form.content = { type: 'doc', content: [] }
      }
    },
    { immediate: true },
  )

  onMounted(async () => {
    if (!isEdit.value) {
      courseLoading.value = true
      try {
        const opts = await cRequest<{ id: number; label: string }[]>(
          '/api/admin/fk-options?table=courses&label=name',
        )
        courseOptions.value = opts || []
      } catch {
        courseOptions.value = []
      } finally {
        courseLoading.value = false
      }
    }
  })

  // JSON string (fallback)
  const contentJsonString = ref('')
  const contentError = ref(false)
  watch(
    () => form.content,
    (v) => {
      try {
        contentJsonString.value = v == null ? '' : JSON.stringify(v, null, 2)
        contentError.value = false
      } catch {
        contentError.value = true
      }
    },
    { immediate: true },
  )
  watch(contentJsonString, (s) => {
    if (!richEditorComp.value && s) {
      try {
        form.content = s.trim() ? JSON.parse(s) : null
        contentError.value = false
      } catch {
        contentError.value = true
      }
    }
  })

  async function onSave() {
    if (!form.name) {
      toast.add({ title: 'name: ' + t('admin.form.required'), color: 'error' })
      return
    }
    if (!effectiveCourseId.value) {
      toast.add({ title: 'courseId: ' + t('admin.form.required'), color: 'error' })
      return
    }
    saving.value = true
    try {
      emit('saved', {
        ...form,
        courseId: effectiveCourseId.value,
      })
    } finally {
      saving.value = false
    }
  }

  return {
    t,
    richEditorComp,
    isEdit,
    form,
    selectedCourseId,
    courseOptions,
    courseLoading,
    effectiveCourseId,
    saving,
    contentJsonString,
    contentError,
    onSave,
  }
}
