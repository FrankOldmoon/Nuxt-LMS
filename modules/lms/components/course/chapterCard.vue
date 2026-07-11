<template>
  <NuxtLink
    :to="item.accessible === false ? undefined : item.to"
    class="group block"
    :class="item.accessible === false ? 'cursor-not-allowed opacity-60' : ''"
  >
    <UCard
      class="transition-all h-full"
      :class="item.accessible === false ? '' : 'hover:ring-2 hover:ring-primary/30'"
      :ui="{ body: 'flex items-center gap-4' }"
    >
      <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0 font-bold text-muted">
        {{ String(index + 1).padStart(2, '0') }}
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-base font-medium text-highlighted flex items-center gap-2">
          <UIcon v-if="item.accessible === false" name="i-lucide-lock" class="size-4 text-muted" />
          <UIcon v-if="item.isPass" name="i-lucide-circle-check" class="size-4 text-success" />
          {{ item.label }}
        </h3>
      </div>
      <UIcon v-if="item.accessible !== false" name="i-lucide-arrow-right" class="size-5 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
    </UCard>
  </NuxtLink>
</template>

<script setup lang="ts">
// lms 扩展章节卡片：含锁/通过图标 + 不可访问禁用
defineProps<{
  item: {
    id: number | string
    label: string
    to?: string
    accessible?: boolean
    isPass?: boolean
  }
  index: number
}>()
</script>
