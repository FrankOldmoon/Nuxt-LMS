/**
 * 班级相关 composable（全局共享状态）
 * 复用于 aside.vue、profileModal.vue、userEditModal.vue、accessBar.vue 等
 * 使用 useState 保证全局只加载一次，切换章节时不重复请求
 */

export interface ClassItem {
  id: number
  name: string
  code: string
}

/**
 * 获取班级列表（全局缓存，首次调用加载，后续直接读取）
 * @returns { classes, classOptions, loadClasses }
 */
export function useClasses() {
  const classes = useState<ClassItem[]>('global-classes', () => [])
  const loaded = useState<boolean>('global-classes-loaded', () => false)

  const classOptions = computed(() => [
    { label: '', value: null },
    ...classes.value.map((c) => ({ label: c.name, value: c.id })),
  ])

  async function loadClasses(force = false) {
    if (loaded.value && !force) return
    try {
      const data = await cRequest<ClassItem[]>('/api/classes/list')
      classes.value = data || []
      loaded.value = true
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
