<template>
  <!-- Python 在线运行器（codeflow / IDE）配置 -->
  <div class="space-y-2">
    <p class="text-sm font-medium">{{ $t('lmsConfig.codeflow') }}</p>
    <div class="grid grid-cols-2 gap-2">
      <UFormField :label="$t('lmsConfig.codeflowUrl')" size="xs" class="col-span-2">
        <template #hint>{{ $t('lmsConfig.codeflowUrlHint') }}</template>
        <UInput v-model="config.codeflow.url" :placeholder="$t('lmsConfig.codeflowUrlPlaceholder')" size="xs" class="w-full" />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
const { config } = useConfigEditorContext()
</script>
