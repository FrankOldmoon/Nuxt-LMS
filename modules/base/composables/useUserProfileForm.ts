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
 * 用户资料表单：头像上传 + 可编辑性 + 班级选项
 */
export function useUserProfileForm(form: Ref<UserProfileForm>) {
  const toast = useToast()
  const { t } = useI18n()
  const { hasRole } = useAuth()
  const { classes, loadClasses } = useClasses()

  const {
    allowSelfAvatarUpload,
    allowChangePassword,
    allowChangeEmail,
  } = useUserProfileConfig()

  // 基于角色的可编辑性
  const canEditGeneral = computed(() => hasRole('admin') || hasRole('teacher'))
  const canEditAvatar = computed(() => allowSelfAvatarUpload.value && canEditGeneral.value)
  const canEditClass = computed(() => hasRole('admin'))
  const canEditEmail = computed(() => allowChangeEmail.value && canEditGeneral.value)
  // 修改密码：任何已登录用户（含普通学生）都可修改自己的密码，仅受全局配置开关约束
  const canEditPassword = computed(() => allowChangePassword.value)

  const genderOptions = computed(() => [
    { label: t('profile.genderMale'), value: 'male' },
    { label: t('profile.genderFemale'), value: 'female' },
    { label: t('profile.genderOther'), value: 'other' },
  ])

  const classOptions = computed(() => {
    const opts = classes.value.map((c: any) => ({ label: c.name, value: c.id }))
    return [{ label: '', value: null }, ...opts]
  })

  // 当前班级未出现在已缓存的班级列表时，强制刷新班级列表，
  // 确保班级下拉框显示班级真实名称，而不是构造出的 "#id" 占位。
  watch(() => form.value.classId, (cur) => {
    if (cur != null && !classes.value.some((c: any) => c.id === Number(cur))) {
      loadClasses(true)
    }
  }, { immediate: true })

  const fileInputRef = ref<HTMLInputElement>()
  const uploading = ref(false)
  const cropperRef = ref<{ setImage: (file: File) => void } | null>(null)
  const showPwdModal = ref(false)

  onMounted(() => {
    loadClasses()
  })

  function triggerFileInput() {
    if (!canEditAvatar.value) return
    fileInputRef.value?.click()
  }

  async function onFileSelect(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    target.value = ''

    if (!file.type.startsWith('image/')) {
      toast.add({ title: t('profile.invalidImageType'), color: 'error' })
      return
    }

    cropperRef.value?.setImage(file)
  }

  function onCropped(url: string) {
    form.value.avatarImg = url
    toast.add({ title: t('profile.uploadSuccess'), color: 'success' })
  }

  return {
    t,
    canEditGeneral,
    canEditAvatar,
    canEditClass,
    canEditEmail,
    canEditPassword,
    genderOptions,
    classOptions,
    fileInputRef,
    uploading,
    cropperRef,
    showPwdModal,
    triggerFileInput,
    onFileSelect,
    onCropped,
  }
}
