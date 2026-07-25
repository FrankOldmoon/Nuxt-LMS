<template>
  <!-- 课程列表显隐与默认视图 -->
  <div class="space-y-2">
    <p class="text-sm font-medium">{{ $t('lmsConfig.courseList') }}</p>
    <div class="grid grid-cols-2 gap-2">
      <div class="flex items-center justify-between">
        <span class="text-xs">{{ $t('lmsConfig.showSearch') }}</span>
        <USwitch v-model="config.courseList.showSearch" />
      </div>
      <div class="flex items-center justify-between">
        <span class="text-xs">{{ $t('lmsConfig.showFilter') }}</span>
        <USwitch v-model="config.courseList.showFilter" />
      </div>
      <div class="flex items-center justify-between">
        <span class="text-xs">{{ $t('lmsConfig.showSort') }}</span>
        <USwitch v-model="config.courseList.showSort" />
      </div>
      <UFormField :label="$t('lmsConfig.defaultView')" size="xs" class="col-span-2">
        <USelect v-model="config.courseList.defaultView" :items="defaultViewOpts" size="xs" class="w-full" />
      </UFormField>
    </div>
  </div>

  <!-- 网盘存储 -->
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
const { config, defaultViewOpts } = useConfigEditorContext()
</script>
