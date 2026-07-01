<template>
  <div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-(--ui-bg-muted)">
    <span class="text-sm font-medium text-(--ui-text-muted) min-w-20">{{ label }}</span>
    <span class="text-sm text-(--ui-text) break-all">{{ value ?? '-' }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value?: string | null
}>()
</script>
