<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ $t('auth.loginTitle') }}</h3>
    <p class="text-sm text-(--ui-text-muted) mb-5">{{ $t('auth.loginSubtitle') }}</p>

    <UForm class="space-y-4" @submit.prevent="handleLogin">
      <UFormField :label="$t('auth.username')" required>
        <UInput
          v-model="username"
          :placeholder="$t('auth.username')"
          autocomplete="username"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('auth.password')" required>
        <UInput
          v-model="password"
          type="password"
          :placeholder="$t('auth.password')"
          autocomplete="current-password"
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
        {{ $t('auth.login') }}
      </UButton>
    </UForm>

    <p class="text-sm text-(--ui-text-muted) text-center mt-4">
      {{ $t('auth.noAccount') }}
      <button
        class="text-primary font-medium hover:underline cursor-pointer"
        @click="$emit('switchToRegister')"
      >
        {{ $t('auth.register') }}
      </button>
    </p>
  </div>
</template>

<script setup lang="ts">
const { login } = useAuth()
const toast = useToast()

const username = ref('')
const password = ref('')
const loading = ref(false)

const emit = defineEmits<{
  success: []
  switchToRegister: []
}>()

async function handleLogin() {
  if (!username.value.trim() || !password.value) return

  loading.value = true
  try {
    await login(username.value.trim(), password.value)
    toast.add({
      title: useNuxtApp().$i18n.t('auth.loginSuccess'),
      color: 'success',
    })
    emit('success')
  } catch (err: any) {
    toast.add({
      title: useNuxtApp().$i18n.t('auth.loginFailed'),
      description: err.message || '',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>
