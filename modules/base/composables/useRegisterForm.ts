/**
 * 注册表单：验证 + 调用注册 API
 */
export function useRegisterForm(
  onSuccess: () => void,
  onSwitchToLogin: () => void,
) {
  const { register } = useAuth()
  const toast = useToast()
  const { t } = useI18n()

  const username = ref('')
  const name = ref('')
  const email = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  const loading = ref(false)

  async function handleRegister() {
    if (!username.value.trim() || !name.value.trim() || !password.value) return

    if (password.value !== confirmPassword.value) {
      toast.add({
        title: t('auth.registerFailed'),
        description: t('auth.passwordMismatch'),
        color: 'error',
      })
      return
    }

    loading.value = true
    try {
      await register(
        username.value.trim(),
        password.value,
        name.value.trim(),
        email.value.trim() || undefined,
      )
      toast.add({ title: t('auth.registerSuccess'), color: 'success' })
      onSuccess()
    } catch (err: any) {
      toast.add({
        title: t('auth.registerFailed'),
        description: err.message || '',
        color: 'error',
      })
    } finally {
      loading.value = false
    }
  }

  return {
    t, username, name, email, password, confirmPassword, loading,
    handleRegister, switchToLogin: onSwitchToLogin,
  }
}
