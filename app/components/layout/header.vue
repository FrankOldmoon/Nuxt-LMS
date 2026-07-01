<template>
  <UHeader
    title="Nuxt Hub"
    to="/"
    :ui="{ left: 'lg:flex-1 flex items-center gap-1.5' }"
  >
    <!-- 左侧：Logo + 标题 -->
    <template #left>
      <ULink
        to="/"
        class="flex items-center gap-2 font-bold text-lg text-highlighted"
        aria-label="Nuxt Hub"
      >
        <UIcon name="i-lucide-boxes" class="size-6 text-primary" />
        <span class="hidden sm:inline">Nuxt Hub</span>
      </ULink>
    </template>

    <!-- 中间：水平导航菜单（仅桌面端显示） + 编辑按钮 -->
    <div class="flex items-center gap-2">
      <LayoutNav orientation="horizontal" />
    </div>

    <!-- 右侧：操作按钮 -->
    <template #right>
      <UTooltip :text="$t('common.search')" :content="{ side: 'bottom' }">
        <UButton
          icon="i-lucide-search"
          color="neutral"
          variant="ghost"
          :aria-label="$t('common.search')"
        />
      </UTooltip>
      <UColorModeButton />

      
    </template>

    <!-- 移动端菜单内容：显示 header 中间的导航菜单 -->
    <template #body>
      <LayoutNav orientation="vertical" class="w-full" />
    </template>
  </UHeader>
</template>

<script setup lang="ts">

</script>
