<template>
  <!-- import base 的 header，通过 slot 注入 doc 的导航和搜索 -->
  <BaseHeader>
    <!-- 中间水平导航 -->
    <template #nav>
      <div class="flex items-center gap-2">
        <LayoutHeaderNav orientation="horizontal" />
      </div>
    </template>

    <!-- 右侧搜索按钮 -->
    <template #header-right>
      <UModal v-model:open="showSearchModal">
        <UTooltip :text="$t('common.search')" :content="{ side: 'bottom' }">
          <UButton icon="i-lucide-search" color="neutral" variant="ghost" :aria-label="$t('common.search')" />
        </UTooltip>
        <template #content>
          <!-- Lazy：搜索弹窗只有点开才需要（内含索引查询逻辑），不进入口 chunk -->
          <LazyLayoutSearchModal @close="() => { showSearchModal = false }" />
        </template>
      </UModal>
    </template>

    <!-- 移动端垂直导航 -->
    <template #nav-mobile>
      <LayoutHeaderNav orientation="vertical" class="w-full" />
    </template>
  </BaseHeader>
</template>

<script setup lang="ts">
import BaseHeader from '../../../../base/components/layout/header/index.vue'

const showSearchModal = ref(false)
</script>
