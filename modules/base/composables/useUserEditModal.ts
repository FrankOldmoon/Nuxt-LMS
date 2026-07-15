interface UserProfileForm {
  name: string
  preferName: string
  englishName: string
  email: string
  gender: string
  avatarImg: string
  rollNumber: string
  telephone: string
  classId: number | null
}

const EMPTY_FORM: UserProfileForm = {
  name: '', preferName: '', englishName: '', email: '',
  gender: '', avatarImg: '', rollNumber: '', telephone: '',
  classId: null,
}

/**
 * User edit modal: load user data + save
 */
export function useUserEditModal(
  userId: () => number | null,
  onSaved: () => void,
) {
  const { t } = useI18n()
  const toast = useToast()

  const open = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const form = ref<UserProfileForm>({ ...EMPTY_FORM })

  async function loadUser() {
    if (!userId()) return
    loading.value = true
    try {
      const data = await cRequest<any>(`/api/users/show?id=${userId()}`)
      form.value = {
        name: data?.name || '',
        preferName: data?.preferName || '',
        englishName: data?.englishName || '',
        email: data?.email || '',
        gender: data?.gender || '',
        avatarImg: data?.avatarImg || '',
        rollNumber: data?.rollNumber || '',
        telephone: data?.telephone || '',
        classId: data?.classId ?? null,
      }
    } catch {
      toast.add({ title: t('profile.loadFailed'), color: 'error' })
    } finally {
      loading.value = false
    }
  }

  function closeModal() {
    open.value = false
  }

  async function saveUser() {
    if (!userId()) return
    saving.value = true
    try {
      await cRequest('/api/users/update', {
        method: 'POST',
        body: { id: userId(), ...form.value },
      })
      toast.add({ title: t('profile.updateSuccess'), color: 'success' })
      onSaved()
      open.value = false
    } catch (e: any) {
      toast.add({ title: e.message || t('profile.updateFailed'), color: 'error' })
    } finally {
      saving.value = false
    }
  }

  function show() {
    open.value = true
  }

  watch(open, (val) => {
    if (val && userId()) loadUser()
  })

  return { t, open, loading, saving, form, closeModal, saveUser, show }
}
