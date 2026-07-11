<template>
  <div>
    <!-- 无效 token -->
    <div v-if="!token" class="text-center py-8">
      <UIcon name="i-lucide-alert-circle" class="size-12 mx-auto text-error mb-3 opacity-50" />
      <p class="text-sm text-muted">{{ $t('auth.invalidResetToken') }}</p>
      <UButton class="mt-6" to="/" variant="outline">
        {{ $t('auth.backToHome') }}
      </UButton>
    </div>

    <!-- 成功 -->
    <div v-else-if="done" class="text-center py-8">
      <UIcon name="i-lucide-check-circle" class="size-12 mx-auto text-success mb-3" />
      <p class="text-sm font-medium">{{ $t('auth.passwordResetSuccess') }}</p>
      <UButton class="mt-6" to="/" color="primary">
        {{ $t('auth.goLogin') }}
      </UButton>
    </div>

    <!-- 重置表单 -->
    <div v-else>
      <h3 class="text-lg font-semibold mb-1">{{ $t('auth.resetPasswordTitle') }}</h3>
      <p class="text-sm text-(--ui-text-muted) mb-5">{{ $t('auth.resetPasswordSubtitle') }}</p>

      <UForm class="space-y-4" @submit.prevent="handleSubmit">
        <UFormField :label="$t('auth.newPassword')" required>
          <UInput v-model="newPassword" type="password"
            :placeholder="$t('auth.newPasswordPlaceholder')" size="lg" class="w-full" />
        </UFormField>
        <UFormField :label="$t('auth.confirmNewPassword')" required
          :error="newPassword && confirmPassword && newPassword !== confirmPassword ? $t('auth.passwordMismatch') : ''">
          <UInput v-model="confirmPassword" type="password"
            :placeholder="$t('auth.confirmPassword')" size="lg" class="w-full" />
        </UFormField>
        <UButton type="submit" block size="lg" :loading="loading"
          :disabled="!newPassword || newPassword !== confirmPassword">
          {{ $t('auth.resetPassword') }}
        </UButton>
      </UForm>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  token: string
}>()

const toast = useToast()
const { t } = useI18n()

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const done = ref(false)

async function handleSubmit() {
  if (!props.token || !newPassword.value || newPassword.value !== confirmPassword.value) return
  loading.value = true
  try {
    await cRequest('/api/auth/reset-password', {
      method: 'POST',
      body: { token: props.token, newPassword: newPassword.value },
    })
    done.value = true
  } catch (e: any) {
    toast.add({
      title: e.message || t('auth.resetFailed'),
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>
