<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ $t('auth.forgotPasswordTitle') }}</h3>
    <p class="text-sm text-(--ui-text-muted) mb-5">{{ $t('auth.forgotPasswordSubtitle') }}</p>

    <UForm v-if="!sent" class="space-y-4" @submit.prevent="handleSubmit">
      <UFormField :label="$t('auth.email')" required>
        <UInput v-model="email" type="email" :placeholder="$t('auth.emailPlaceholder')" size="lg"
          class="w-full" />
      </UFormField>

      <UButton type="submit" block size="lg" :loading="loading">
        {{ $t('auth.sendResetLink') }}
      </UButton>
    </UForm>

    <div v-else class="space-y-4">
      <div class="flex items-center gap-3 p-4 rounded-lg bg-(--ui-bg-elevated)">
        <UIcon name="i-lucide-mail-check" class="size-6 text-(--ui-color-primary-500)" />
        <div>
          <p class="text-sm font-medium">{{ $t('auth.resetEmailSent') }}</p>
          <p class="text-xs text-(--ui-text-muted) mt-0.5">{{ email }}</p>
        </div>
      </div>
      <UButton block variant="outline" @click="$emit('switchToLogin')">
        {{ $t('auth.backToLogin') }}
      </UButton>
    </div>

    <p v-if="!sent" class="text-sm text-(--ui-text-muted) text-center mt-4">
      <button class="text-primary font-medium hover:underline cursor-pointer"
        @click="$emit('switchToLogin')">
        {{ $t('auth.backToLogin') }}
      </button>
    </p>
  </div>
</template>

<script setup lang="ts">
const toast = useToast()
const { t } = useI18n()

const email = ref('')
const loading = ref(false)
const sent = ref(false)

const emit = defineEmits<{
  switchToLogin: []
}>()

async function handleSubmit() {
  if (!email.value.trim()) return
  loading.value = true
  try {
    await cRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value.trim() },
    })
    sent.value = true
  } catch (e: any) {
    toast.add({
      title: e.message || t('auth.sendResetFailed'),
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>
