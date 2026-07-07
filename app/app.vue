<template>
  <UApp>
    <Layout>
      <NuxtPage />
    </Layout>
  </UApp>
</template>

<script setup lang="ts">
const { siteTitle } = useSiteConfig()

useHead(() => ({
  title: siteTitle.value || 'AI LMS',
}))
</script>
