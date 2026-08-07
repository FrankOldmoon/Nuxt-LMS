<script setup>
const { favicon } = useSiteConfig()
useHead(() => ({
  link: [{ rel: 'icon', type: 'image/x-icon', href: favicon.value }],
}))
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

