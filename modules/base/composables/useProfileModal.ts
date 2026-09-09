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
  /** 界面语言：''=跟随站点默认，'cn'=中文，'en'=英文 */
  defaultLocale: string
}

/** 归一化个人语言值为表单取值（'' / 'cn' / 'en'） */
function normalizeLocale(raw: string | null | undefined): string {
  const v = (raw || '').trim().toLowerCase()
  if (!v) return ''
  if (v === 'zh-cn' || v === 'zh' || v === 'cn' || v === '中文') return 'cn'
  if (v === 'en-us' || v === 'en' || v === '英文') return 'en'
  return ''
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
    defaultLocale: '',
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
      defaultLocale: normalizeLocale(user.value?.defaultLocale),
    }
  }

  function closeModal() {
    isOpen.value = false
  }

  async function saveProfile() {
    saving.value = true
    try {
      const body: any = { ...form.value }
      // 个人语言：''=跟随站点默认 → 存 null
      body.defaultLocale = body.defaultLocale ? body.defaultLocale : null
      await cRequest('/api/auth/me', {
        method: 'PUT',
        body,
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
