<template>
  <UModal v-model:open="isOpen" fullscreen>
    <template #content>
      <div class="flex flex-col h-full">
        <!-- 头部 -->
        <div class="flex items-center justify-between border-b border-default px-6 py-4 shrink-0">
          <h3 class="text-lg font-semibold">{{ $t('settings.title') }}</h3>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" aria-label="Close" @click="closeModal" />
        </div>

        <!-- 加载态 -->
        <div v-if="loading" class="flex justify-center py-16">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-(--ui-text-muted)" />
        </div>

        <!-- 多 Tab 内容 -->
        <div v-else class="flex flex-col min-h-0 flex-1">
          <UTabs v-model="activeTab" :items="tabItems" class="px-6 pt-4 shrink-0" />

          <div class="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            <div v-if="activeTab === 'general'" class="space-y-4">
              <AuthSettingsGeneralSection :form="form" />
            </div>
            <div v-else-if="activeTab === 'security'" class="space-y-4">
              <AuthSettingsSecuritySection :form="form" />
            </div>
            <div v-else-if="activeTab === 'storage'" class="space-y-4">
              <AuthSettingsStorageSection :form="form" />
            </div>
            <div v-else-if="activeTab === 'ui'" class="space-y-4">
              <AuthSettingsUiSection :form="form" />
            </div>
            <div v-else-if="activeTab === 'mail'" class="space-y-4">
              <AuthSettingsMailSection :form="form" />
            </div>
            <div v-else-if="activeTab === 'extra'" class="space-y-4">
              <!-- 扩展 slot：后续模块（如 lms）可注入额外配置编辑器 -->
              <slot name="settings-extra" :on-save="registerSlotSave" :on-reload="loadSettings" />
            </div>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="flex justify-end gap-2 border-t border-default px-6 py-4 shrink-0">
          <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" @click="closeModal" />
          <UButton :label="$t('common.save')" color="primary" :loading="saving" @click="saveSettings" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })

const {
  t,
  loading,
  saving,
  form,
  registerSlotSave,
  loadSettings,
  closeModal,
  saveSettings,
} = useSettingsForm(isOpen)

const activeTab = ref('general')

const tabItems = computed(() => [
  { label: t('settings.generalSection'), icon: 'i-lucide-settings', value: 'general' },
  { label: t('settings.securitySection'), icon: 'i-lucide-shield-check', value: 'security' },
  { label: t('settings.storageSection'), icon: 'i-lucide-hard-drive', value: 'storage' },
  { label: t('settings.uiSection'), icon: 'i-lucide-palette', value: 'ui' },
  { label: t('settings.mailSection'), icon: 'i-lucide-mail', value: 'mail' },
  // 扩展 slot：lms 等模块可能注入额外配置编辑器
  { label: t('settings.extraSection'), icon: 'i-lucide-puzzle', value: 'extra' },
])
</script>