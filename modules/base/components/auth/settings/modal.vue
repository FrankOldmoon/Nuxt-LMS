<template>
  <UModal v-model:open="isOpen" scrollable>
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-6">{{ $t('settings.title') }}</h3>

        <div v-if="loading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-(--ui-text-muted)" />
        </div>

        <div v-else class="space-y-4">
          <AuthSettingsGeneralSection :form="form" />
          <AuthSettingsSecuritySection :form="form" />
          <AuthSettingsStorageSection :form="form" />
          <AuthSettingsUiSection :form="form" />
          <AuthSettingsMailSection :form="form" />

          <!-- Extension slot: subsequent modules (e.g. lms) can inject additional config editors -->
          <slot name="settings-extra" :on-save="registerSlotSave" :on-reload="loadSettings" />

          <!-- Save button -->
          <div class="flex justify-end gap-2 pt-4">
            <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" @click="closeModal" />
            <UButton :label="$t('common.save')" color="primary" :loading="saving" @click="saveSettings" />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })

const {
  loading,
  saving,
  form,
  registerSlotSave,
  loadSettings,
  closeModal,
  saveSettings,
} = useSettingsForm(isOpen)
</script>
