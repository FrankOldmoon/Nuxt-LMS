import type { Ref } from 'vue'

interface UserProfileForm {
  name: string
  preferName: string
  englishName: string
  email: string
  gender: string
  avatarImg: string
  telephone: string
  classId: number | null
}

/**
 * 个人资料弹窗：加载当前用户数据 + 保存
 */
export function useProfileModal(isOpen: Ref<boolean>) {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const { t } = useI18n()

  const saving = ref(false)

  const form = ref<UserProfileForm>({
    name: '', preferName: '', englishName: '', email: '',
    gender: '', avatarImg: '', telephone: '',
    classId: null,
  })

  watch(isOpen, (val) => {
    if (val && user.value) {
      loadFormData()
    }
  })

  function loadFormData() {
    form.value = {
      name: user.value?.name || '',
      preferName: user.value?.preferName || '',
      englishName: user.value?.englishName || '',
      email: user.value?.email || '',
      gender: user.value?.gender || '',
      avatarImg: user.value?.avatarImg || '',
      telephone: user.value?.telephone || '',
      classId: user.value?.classId ?? null,
    }
  }

  function closeModal() {
    isOpen.value = false
  }

  async function saveProfile() {
    saving.value = true
    try {
      await cRequest('/api/auth/me', {
        method: 'PUT',
        body: form.value,
      })
      await refreshUser()
      isOpen.value = false
      toast.add({ title: t('profile.updateSuccess'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: e.message || t('profile.updateFailed'), color: 'error' })
    } finally {
      saving.value = false
    }
  }

  return { t, form, saving, closeModal, saveProfile }
}
