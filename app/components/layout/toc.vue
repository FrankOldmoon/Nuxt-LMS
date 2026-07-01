<template>
  <UPageAside>
    <LayoutTocList
      :links="links"
      title="本页目录"
      class="w-full"
    />

    <template #bottom>
      <div class="hidden lg:flex flex-col gap-3 pt-4 mt-4 border-t border-default">
        <UButton
          to="https://github.com"
          target="_blank"
          icon="i-lucide-edit"
          color="neutral"
          variant="ghost"
          size="sm"
          label="编辑此页"
          class="justify-start"
        />
        <UButton
          to="https://github.com"
          target="_blank"
          icon="i-lucide-bug"
          color="neutral"
          variant="ghost"
          size="sm"
          label="报告问题"
          class="justify-start"
        />
      </div>
    </template>
  </UPageAside>
</template>

<script setup lang="ts">
defineProps<{
  links?: { id: string; text: string; children?: any[] }[]
}>()
</script>
