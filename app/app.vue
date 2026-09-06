<script setup lang="ts">
const { favicon } = useSiteConfig()
const { analytics } = useLmsPublicConfig()

useHead(() => ({
  link: [{ rel: 'icon', type: 'image/x-icon', href: favicon.value }],
  // 站点统计脚本（谷歌分析 / 百度统计），token 留空则不注入
  script: buildAnalyticsScripts(analytics.value.googleTrackingId, analytics.value.baiduTrackingId),
}))

// Global startup access password
// 仅当访问域名等于 NUXT_VERIFICATION_URL（如 mxlms.oldmoon.cn）时才需要访问密码；
// 其他访问（IP / localhost / 其余域名）直接放行。密码在 SERVER 端校验，
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