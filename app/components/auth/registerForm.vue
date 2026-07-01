<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ $t('auth.registerTitle') }}</h3>
    <p class="text-sm text-(--ui-text-muted) mb-5">{{ $t('auth.registerSubtitle') }}</p>

    <UForm class="space-y-4" @submit.prevent="handleRegister">
      <UFormField :label="$t('auth.username')" required>
        <UInput
          v-model="username"
          :placeholder="$t('auth.username')"
          autocomplete="username"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('auth.name')" required>
        <UInput
          v-model="name"
          :placeholder="$t('auth.name')"
          autocomplete="name"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('auth.email')">
        <UInput
          v-model="email"
          type="email"
          :placeholder="$t('auth.email')"
          autocomplete="email"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('auth.password')" required>
        <UInput
          v-model="password"
          type="password"
          :placeholder="$t('auth.password')"
          autocomplete="new-password"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('auth.confirmPassword')" required>
        <UInput
          v-model="confirmPassword"
          type="password"
          :placeholder="$t('auth.confirmPassword')"
          autocomplete="new-password"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        block
        size="lg"
        :loading="loading"
      >
        {{ $t('auth.register') }}
      </UButton>
    </UForm>

    <p class="text-sm text-(--ui-text-muted) text-center mt-4">
      {{ $t('auth.hasAccount') }}
      <button
        class="text-primary font-medium hover:underline cursor-pointer"
        @click="$emit('switchToLogin')"
      >
        {{ $t('auth.login') }}
      </button>
    </p>
  </div>
</template>

<script setup lang="ts">
const { register } = useAuth()
const toast = useToast()

const username = ref('')
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const emit = defineEmits<{
  success: []
  switchToLogin: []
}>()

const { t } = useI18n()

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
    toast.add({
      title: t('auth.registerSuccess'),
      color: 'success',
    })
    emit('success')
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
</script>
