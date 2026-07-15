<template>
  <div class="flex items-center gap-1.5">
    <UIcon name="i-lucide-users" class="size-4" />
    <span>{{ count }} {{ $t('course.students') }}</span>
  </div>
</template>

<script setup lang="ts">
// Course student count badge
defineProps<{
  count: number
}>()
</script>
