<template>
  <UFooter v-if="footerText">
    <p class="w-full text-center text-sm text-muted">{{ footerText }}</p>
  </UFooter>
</template>

<script setup lang="ts">
// footer 内容来自站点配置 siteFooterText（System Config → Footer Text），居中显示
const { config } = useSiteConfig()
const footerText = computed(() => String(config.value?.siteFooterText || '').trim())
</script>