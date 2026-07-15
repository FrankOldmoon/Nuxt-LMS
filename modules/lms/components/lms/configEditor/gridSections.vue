<template>
  <!-- Course ListvisibilityandDefaultview -->
  <div class="space-y-2">
    <p class="text-sm font-medium">{{ $t('lmsConfig.course list') }}</p>
    <div class="grid grid-cols-2 gap-2">
      <div class="flex items-center justify-between">
        <span class="text-xs">{{ $t('lmsConfig.showSearch') }}</span>
        <USwitch v-model="config.course list.showSearch" />
      </div>
      <div class="flex items-center justify-between">
        <span class="text-xs">{{ $t('lmsConfig.showFilter') }}</span>
        <USwitch v-model="config.course list.showFilter" />
      </div>
      <div class="flex items-center justify-between">
        <span class="text-xs">{{ $t('lmsConfig.showSort') }}</span>
        <USwitch v-model="config.course list.showSort" />
      </div>
      <UFormField :label="$t('lmsConfig.default view')" size="xs" class="col-span-2">
        <USelect v-model="config.course list.default view" :items="default viewOpts" size="xs" class="w-full" />
      </UFormField>
    </div>
  </div>

  <!-- cloud storage -->
  <div class="space-y-2">
    <p class="text-sm font-medium">{{ $t('lmsConfig.storage') }}</p>
    <div class="grid grid-cols-2 gap-2">
      <UFormField :label="$t('lmsConfig.driveSize')" size="xs" class="col-span-2">
        <template #hint>{{ $t('lmsConfig.driveSizeHint') }}</template>
        <UInput v-model.number="config.storage.driveSize" type="number" size="xs" class="w-full" />
      </UFormField>
      <UFormField :label="$t('lmsConfig.teacherMultiplier')" size="xs" class="col-span-2">
        <template #hint>{{ $t('lmsConfig.teacherMultiplierHint') }}</template>
        <UInput v-model.number="config.storage.teacherMultiplier" type="number" step="0.1" size="xs" class="w-full" />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
const { config, default viewOpts } = useConfigEditorContext()
</script>
