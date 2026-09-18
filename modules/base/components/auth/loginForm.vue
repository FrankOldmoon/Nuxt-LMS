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
        :disabled="disabled"
      >
        {{ $t('auth.login') }}
      </UButton>
    </UForm>

    <div class="flex items-center justify-between mt-4">
      <span></span>
      <button
        class="text-xs text-primary hover:underline cursor-pointer"
        @click="$emit('switchToForgotPassword')"
      >
        {{ $t('auth.forgotPassword') }}
      </button>
    </div>

    <p v-if="allowRegistration" class="text-sm text-(--ui-text-muted) text-center mt-4">
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
const { allowRegistration } = useSiteConfig()

const username = ref('')
const password = ref('')
const loading = ref(false)

// 登录冷却：点击一次后倒计时 3 秒才允许再次点击
const COOLDOWN_SECONDS = 3
const cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const disabled = computed(() => loading.value || cooldown.value > 0)

function startCooldown() {
  cooldown.value = COOLDOWN_SECONDS
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) {
      cooldown.value = 0
      if (cooldownTimer) {
        clearInterval(cooldownTimer)
        cooldownTimer = null
      }
    }
  }, 1000)
}

onBeforeUnmount(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
})

const emit = defineEmits<{
  success: []
  switchToRegister: []
  switchToForgotPassword: []
}>()

async function handleLogin() {
  if (disabled.value) return
  if (!username.value.trim() || !password.value) return

  startCooldown()
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
