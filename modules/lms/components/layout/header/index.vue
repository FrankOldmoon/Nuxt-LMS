<template>
  <!-- import base header, inject doc navigation and search via slots -->
  <BaseHeader>
    <!-- Center horizontal navigation -->
    <template #nav>
      <div class="flex items-center gap-2">
        <LayoutHeaderNav orientation="horizontal" />
      </div>
    </template>

    <!-- RightSearch Button -->
    <template #header-right>
      <UModal v-model:open="showSearchModal">
        <UTooltip :text="$t('common.search')" :content="{ side: 'bottom' }">
          <UButton icon="i-lucide-search" color="neutral" variant="ghost" :aria-label="$t('common.search')" />
        </UTooltip>
        <template #content>
          <LayoutSearchModal @close="() => { showSearchModal = false }" />
        </template>
      </UModal>
    </template>

    <!-- mobile vertical navigation -->
    <template #nav-mobile>
      <LayoutHeaderNav orientation="vertical" class="w-full" />
    </template>
  </BaseHeader>
</template>

<script setup lang="ts">
import BaseHeader from '../../../../base/components/layout/header/index.vue'

const showSearchModal = ref(false)
</script>
