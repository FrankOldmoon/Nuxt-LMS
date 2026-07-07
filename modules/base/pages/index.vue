<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
    <UIcon name="i-lucide-boxes" class="size-16 text-primary" />
    <h1 class="text-3xl font-bold text-highlighted">{{ siteTitle || 'Nuxt Hub' }}</h1>
    <p class="text-lg text-muted">{{ $t('welcome') }}</p>
  </div>
</template>

<script setup lang="ts">
const { siteTitle } = useSiteConfig()
</script>
