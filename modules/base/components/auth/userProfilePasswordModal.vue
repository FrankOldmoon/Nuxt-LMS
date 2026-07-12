<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-sm' }">
    <template #content>
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-semibold">{{ $t('profile.changePassword') }}</h3>
        <UFormField :label="$t('profile.oldPassword')" required>
          <UInput v-model="pwdForm.oldPassword" type="password"
            :placeholder="$t('profile.oldPasswordPlaceholder')" class="w-full" />
        </UFormField>
        <UFormField :label="$t('profile.newPassword')" required>
          <UInput v-model="pwdForm.newPassword" type="password"
            :placeholder="$t('profile.newPasswordPlaceholder')" class="w-full" />
        </UFormField>
        <UFormField :label="$t('profile.confirmNewPassword')" required
          :error="pwdForm.newPassword && pwdForm.confirmPassword && pwdForm.newPassword !== pwdForm.confirmPassword ? $t('profile.passwordMismatch') : ''">
          <UInput v-model="pwdForm.confirmPassword" type="password"
            :placeholder="$t('profile.confirmNewPasswordPlaceholder')" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2 pt-2">
          <UButton :label="$t('common.cancel')" color="neutral" variant="ghost"
            @click="isOpen = false" />
          <UButton :label="$t('common.confirm')" color="primary" :loading="pwdSaving"
            :disabled="!pwdForm.oldPassword || !pwdForm.newPassword || pwdForm.newPassword !== pwdForm.confirmPassword"
            @click="submitChangePassword" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup>
const isOpen = defineModel('open', { default: false })

const { t } = useI18n()
const toast = useToast()

const pwdSaving = ref(false)
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

async function submitChangePassword() {
  if (pwdForm.newPassword !== pwdForm.confirmPassword) {
    toast.add({ title: t('profile.passwordMismatch'), color: 'error' })
    return
  }
  pwdSaving.value = true
  try {
    await cRequest('/api/auth/change-password', {
      method: 'POST',
      body: {
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword,
      },
    })
    toast.add({ title: t('profile.passwordChanged'), color: 'success' })
    isOpen.value = false
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
  } catch (e) {
    toast.add({ title: e.message || t('profile.passwordChangeFailed'), color: 'error' })
  } finally {
    pwdSaving.value = false
  }
}
</script>
