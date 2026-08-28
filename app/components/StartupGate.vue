<template>
  <div class="min-h-screen flex items-center justify-center bg-white px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-6">
        <div
          class="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
          style="background-color: var(--ui-primary)"
        >
          <UIcon name="i-lucide-lock" class="w-6 h-6 text-white" />
        </div>
        <h1 class="text-xl font-semibold text-gray-900">Access Verification</h1>
        <p class="text-sm text-gray-500 mt-1">This page requires authentication. Please enter the access password.</p>
      </div>

      <UForm class="space-y-4" @submit.prevent="verify">
        <UInput
          v-model="password"
          type="password"
          size="lg"
          placeholder="Enter access password"
          class="w-full"
          autocomplete="off"
          :ui="{ icon: 'trailing: i-lucide-lock' }"
          autofocus
        />
        <UButton type="submit" block size="lg" color="primary" :loading="loading">
          Enter System
        </UButton>
      </UForm>

      <p v-if="error" class="text-sm text-red-500 mt-3 text-center">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'StartupGate',
})

const emit = defineEmits<{ unlocked: [] }>()

const password = ref('')
const loading = ref(false)
const error = ref('')

// 密码校验在服务端完成，前端不保存/不泄露密码
async function verify() {
  if (!password.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ success: boolean; msg?: string }>('/api/auth/startup', {
      method: 'POST',
      body: { password: password.value },
    })
    if (res.success) {
      emit('unlocked')
      return
    }
    error.value = res.msg || 'Incorrect access password'
    password.value = ''
  } catch {
    error.value = 'Verification failed, please try again'
  } finally {
    loading.value = false
  }
}
</script>