/**
 * Class-related composable (global shared state)
 * Reused in aside.vue, profileModal.vue, userEditModal.vue, accessBar.vue, etc.
 * Uses useState to ensure global single load, no repeated requests when switching chapters
 */

export interface ClassItem {
  id: number
  name: string
  code: string
}

/**
 * Get class list (global cache, loads on first call, reads directly afterwards)
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
 * Gender options (reused in profileModal, userEditModal)
 */
export function useGenderOptions() {
  const { t } = useI18n()
  return computed(() => [
    { label: t('profile.genderMale'), value: 'male' },
    { label: t('profile.genderFemale'), value: 'female' },
    { label: t('profile.genderOther'), value: 'other' },
  ])
}
