<template>
  <!-- 站点统计（谷歌分析 / 百度统计，留空 = 禁用） -->
  <div class="space-y-2">
    <p class="text-sm font-medium">{{ $t('lmsConfig.analytics') }}</p>
    <div class="grid grid-cols-2 gap-2">
      <UFormField :label="$t('lmsConfig.googleTrackingId')" size="xs">
        <UInput v-model="config.analytics.googleTrackingId" type="text" size="xs" class="w-full"
          :placeholder="$t('lmsConfig.googleTrackingIdHint')" />
      </UFormField>
      <UFormField :label="$t('lmsConfig.baiduTrackingId')" size="xs">
        <UInput v-model="config.analytics.baiduTrackingId" type="text" size="xs" class="w-full"
          :placeholder="$t('lmsConfig.baiduTrackingIdHint')" />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
const { config } = useConfigEditorContext()
</script>
