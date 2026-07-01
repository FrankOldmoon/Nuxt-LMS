<template>
  <UPageAside>
    <UNavigationMenu
      :items="navigation"
      orientation="vertical"
      :highlight="true"
      color="primary"
      class="w-full"
    />

    <template #bottom>
      <div class="hidden lg:flex flex-col gap-2 p-2">
        <UButton
          to="https://github.com"
          target="_blank"
          icon="i-lucide-github"
          color="neutral"
          variant="ghost"
          size="sm"
          label="GitHub"
          class="justify-start"
        />
        <UButton
          to="https://github.com"
          target="_blank"
          icon="i-lucide-star"
          color="neutral"
          variant="ghost"
          size="sm"
          label="点个 Star"
          class="justify-start"
        />
      </div>
    </template>
  </UPageAside>
</template>

<script setup lang="ts">
const { navigation } = useSidebarNav()
</script>
