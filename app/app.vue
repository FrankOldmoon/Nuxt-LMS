<script setup lang="ts">
const { favicon } = useSiteConfig()

useHead(() => ({
  link: [{ rel: 'icon', type: 'image/x-icon', href: favicon.value }],
}))

// Global startup access password
// Hostnames that are IP addresses (e.g. 192.168.x.x, IPv6) or localhost are
// allowed in without a password; other cases (e.g. domain access) require the
// access password before the app is formally loaded. The password is verified
// on the SERVER side; the client only asks the server whether it is unlocked.
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

// `useRequestURL()` resolves the same hostname on both server and client, so
// IP/localhost visitors are unlocked synchronously at render time and SSR
// renders the homepage directly - no password-gate flash before entry.
const requestHost = useRequestURL().hostname
const appUnlocked = ref(isIpAddress(requestHost))

onMounted(async () => {
  // IP/localhost are already unlocked via the initial value; nothing to do.
  if (appUnlocked.value) return
  // Non-IP/localhost access: confirm unlock status with the server via the
  // HttpOnly startup cookie. The gate stays locked until the server confirms.
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