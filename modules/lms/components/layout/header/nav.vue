<template>
  <div class="flex items-center gap-2">
    <UNavigationMenu
      :items="links"
      :orientation="orientation"
      :highlight="highlight"
      :content-orientation="orientation === 'horizontal' ? 'vertical' : 'vertical'"
      color="primary"
      variant="pill"
      :ui="{
        content: 'w-auto min-w-[220px] max-w-[480px]',
        childLinkLabel: 'overflow-visible whitespace-nowrap'
      }"
    />
    <NavEditor
      v-if="hasRole('admin')"
      mode="category"
      :navigation="links"
      @saved="handleSaved"
    />
    <!-- 课程导入（仅管理员） -->
    <UTooltip v-if="hasRole('admin')" :text="$t('navEditor.importCourse')">
      <UButton
        icon="i-lucide-upload"
        color="primary"
        variant="soft"
        size="sm"
        :loading="importing"
        @click="triggerFilePicker"
      />
    </UTooltip>
    <input
      ref="fileInputRef"
      type="file"
      accept="application/json,.json"
      class="hidden"
      @change="onFileSelected"
    >
  </div>
</template>

<script setup lang="ts">
import { useNav } from './useNav'

withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
  highlight?: boolean
}>(), {
  orientation: 'horizontal',
  highlight: true,
})

const {
  hasRole, links, handleSaved, importing, triggerFilePicker, fileInputRef, onFileSelected,
} = useNav()
</script>
