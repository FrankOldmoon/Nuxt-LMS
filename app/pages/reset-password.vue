<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <ULink to="/" class="inline-flex items-center gap-2 font-bold text-xl text-highlighted">
          <UIcon name="i-lucide-boxes" class="size-7 text-primary" />
          {{ siteTitle }}
        </ULink>
      </div>

      <UCard>
        <div class="p-2">
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
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const { t } = useI18n()
const { siteTitle } = useLmsConfig()

definePageMeta({
  layout: false,
})

const token = computed(() => String(route.query.token || ''))
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const done = ref(false)

async function handleSubmit() {
  if (!token.value || !newPassword.value || newPassword.value !== confirmPassword.value) return
  loading.value = true
  try {
    await cRequest('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, newPassword: newPassword.value },
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
