<template>
  <!-- User（GlobalcontrolUserserver functioncanAvailableproperty；admin/teacher not restricted） -->
  <div class="space-y-2">
    <p class="text-sm font-medium">{{ $t('lmsConfig.user') }}</p>
    <div class="space-y-2">
      <div v-for="f in fields" :key="f.key" class="flex items-center justify-between">
        <div>
          <span class="text-xs">{{ $t(f.label) }}</span>
          <p class="text-[10px] text-muted">{{ $t(f.hint) }}</p>
        </div>
        <USwitch v-model="config.user[f.key]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { config } = useConfigEditorContext()

const fields = [
  { key: 'allowSelfAvatarUpload', label: 'lmsConfig.allowSelfAvatarUpload', hint: 'lmsConfig.allowSelfAvatarUploadHint' },
  { key: 'allowChangePassword', label: 'lmsConfig.allowChangePassword', hint: 'lmsConfig.allowChangePasswordHint' },
  { key: 'allowChangeEmail', label: 'lmsConfig.allowChangeEmail', hint: 'lmsConfig.allowChangeEmailHint' },
  { key: 'allowChangeLocale', label: 'lmsConfig.allowChangeLocale', hint: 'lmsConfig.allowChangeLocaleHint' },
  { key: 'allowExportData', label: 'lmsConfig.allowExportData', hint: 'lmsConfig.allowExportDataHint' },
]
</script>
