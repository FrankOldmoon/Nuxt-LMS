<script setup lang="ts">
const { favicon } = useSiteConfig()

useHead(() => ({
  link: [{ rel: 'icon', type: 'image/x-icon', href: favicon.value }],
}))

// Global startup access password
// Hostnames that are IP addresses (e.g. 192.168.x.x, IPv6) or localhost are
// allowed in without a password; other cases (e.g. domain access) require the
// access password before the app is formally loaded.
const appUnlocked = ref(false)
const unlockKey = 'lms_startup_unlocked'

const isIpAddress = (hostname: string) => {
  if (!hostname) return false
  const host = hostname.replace(/^\[|\]$/g, '')
  // localhost and loopback addresses are password-free for local development
  if (/^localhost$/i.test(host)) return true
  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return true
  // IPv6
  if (host.includes(':')) return true
  return false
}

onMounted(() => {
  if (isIpAddress(window.location.hostname) || sessionStorage.getItem(unlockKey) === '1') {
    appUnlocked.value = true
  }
})

function handleUnlocked() {
  sessionStorage.setItem(unlockKey, '1')
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