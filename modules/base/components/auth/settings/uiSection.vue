<template>
  <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-eye" class="size-4 text-primary" />
      <span class="text-sm font-semibold">{{ $t('settings.uiSection') }}</span>
    </div>
    <p class="text-xs text-muted">控制前端页面/按钮的显示，保存后通过 WebSocket 实时推送给所有在线客户端</p>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <UFormField :label="$t('settings.showNotify')" class="w-full">
        <USwitch v-model="form.siteShowNotify" />
      </UFormField>
      <UFormField :label="$t('settings.showMsg')" class="w-full">
        <USwitch v-model="form.siteShowMsg" />
      </UFormField>
      <UFormField :label="$t('settings.showMyFiles')" class="w-full">
        <USwitch v-model="form.siteShowMyFiles" />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ form: any }>()
</script>
