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
  /** 界面语言：'follow'=跟随站点默认，'en'=英文 */
  defaultLocale: string
}

/** 归一化个人语言值为表单取值（'' / 'cn' / 'en'），空值或中文一律视为跟随站点 */
function normalizeLocale(raw: string | null | undefined): string {
  const v = (raw || '').trim().toLowerCase()
  if (!v) return ''
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

  // immediate：组件为 v-if 惰性挂载，打开时 isOpen 初始即 true 且不再变化，
  // 非 immediate 的 watch 不会触发，导致表单无数据
  watch(isOpen, (val) => {
    if (val && user.value) {
      loadFormData()
    }
  }, { immediate: true })

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
      // '' / 'cn' 等非英文值统一映射为 'follow'（跟随站点默认）
      defaultLocale: normalizeLocale(user.value?.defaultLocale) || 'follow',
    }
  }

  function closeModal() {
    isOpen.value = false
  }

  async function saveProfile() {
    saving.value = true
    try {
      const body: any = { ...form.value }
      // 个人语言：'follow'=跟随站点默认 → 存 null
      body.defaultLocale = body.defaultLocale === 'en' ? 'en' : null
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
