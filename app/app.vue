<template>
  <UApp>
    <Layout>
      <NuxtPage />
    </Layout>
  </UApp>
</template>

<script setup lang="ts">
// 获取网站配置（SSR 兼容）
const { siteTitle } = useLmsConfig()

// 设置页面标题（SSR 兼容，响应式）
useHead(() => ({
  title: siteTitle.value || 'Nuxt Hub',
}))
</script>
