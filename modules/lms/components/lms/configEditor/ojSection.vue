<template>
  <!-- OJ 在线评测平台配置 -->
  <div class="space-y-2">
    <p class="text-sm font-medium">{{ $t('lmsConfig.oj') }}</p>
    <div class="grid grid-cols-2 gap-2">
      <UFormField :label="$t('lmsConfig.ojUrl')" size="xs" class="col-span-2">
        <template #hint>{{ $t('lmsConfig.ojUrlHint') }}</template>
        <UInput v-model="config.oj.url" placeholder="http://10.28.1.155" size="xs" class="w-full" />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
const { config } = useConfigEditorContext()
</script>
