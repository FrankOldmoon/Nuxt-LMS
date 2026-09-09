<script setup lang="ts">
const { favicon } = useSiteConfig()

useHead(() => ({
  link: [{ rel: 'icon', type: 'image/x-icon', href: favicon.value }],
}))

// Global startup access gate: 需要访问验证的域名须用真实用户账号才能解锁。
// 仅当访问域名等于 NUXT_VERIFICATION_URL（如 mxlms.oldmoon.cn）时才需要账号验证；
// 其他访问（IP / localhost / 其余域名）直接放行。账号密码在 SERVER 端校验，
// 客户端只询问服务端是否已解锁。
const config = useRuntimeConfig()
const verificationUrl = String(config.verificationUrl || '').toLowerCase()

// 是否需要对当前访问域名做 Access Verification
const needsVerification = computed(() => {
  if (!verificationUrl) return false
  const host = useRequestURL().hostname.replace(/^\[|\]$/g, '').toLowerCase()
  return host === verificationUrl
})

// `useRequestURL()` resolves the same hostname on both server and client, so
// verification is decided synchronously at render time — no password-gate flash
// for hosts that don't need verification.
const appUnlocked = ref(!needsVerification.value)

const { refreshUser } = useAuth()

onMounted(async () => {
  // 无需验证的访问（IP/localhost/非指定域名）已直接解锁；nothing to do.
  if (appUnlocked.value) return
  // 目标域名访问：与服务器确认解锁状态（HttpOnly startup cookie）。
  // The gate stays locked until the server confirms.
  try {
    const res = await $fetch<{ data: { unlocked: boolean } }>('/api/auth/startup', {
      credentials: 'include',
    })
    if (res.data?.unlocked) {
      appUnlocked.value = true
    }
  } catch {
    // On error, keep locked and show the gate.
  }
})

function handleUnlocked() {
  appUnlocked.value = true
  // 门通过即已登录（startup 已下发 auth_token），刷新用户态让界面进入登录状态
  refreshUser()
}
</script>

<template>
  <UApp>
    <StartupGate v-if="!appUnlocked" @unlocked="handleUnlocked" />
    <NuxtLayout v-else>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>