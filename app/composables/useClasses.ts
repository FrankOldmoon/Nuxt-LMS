/**
 * 班级相关 composable
 * 复用于 aside.vue、profileModal.vue、userEditModal.vue
 */

export interface ClassItem {
  id: number
  name: string
  code: string
}

/**
 * 获取班级列表
 * @returns { classes, classOptions, loadClasses }
 */
export function useClasses() {
  const classes = ref<ClassItem[]>([])

  const classOptions = computed(() => [
    { label: '', value: null },
    ...classes.value.map((c) => ({ label: c.name, value: c.id })),
  ])

  async function loadClasses() {
    try {
      const data = await cRequest<ClassItem[]>('/api/lms/classes/list')
      classes.value = data || []
    } catch {
      classes.value = []
    }
  }

  return { classes, classOptions, loadClasses }
}

/**
 * 性别选项（复用于 profileModal、userEditModal）
 */
export function useGenderOptions() {
  const { t } = useI18n()
  return computed(() => [
    { label: t('profile.genderMale'), value: 'male' },
    { label: t('profile.genderFemale'), value: 'female' },
    { label: t('profile.genderOther'), value: 'other' },
  ])
}
