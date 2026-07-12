<template>
  <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-hard-drive" class="size-4 text-primary" />
      <span class="text-sm font-semibold">{{ $t('settings.storageSection') }}</span>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <UFormField :label="$t('settings.driveQuota')" class="w-full">
        <UInput v-model.number="form.siteDriveQuota" type="number" :min="0" :placeholder="$t('settings.driveQuotaPlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="$t('settings.teacherDriveMultiplier')" class="w-full">
        <UInput v-model.number="form.siteTeacherDriveMultiplier" type="number" :min="1" class="w-full" />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ form: any }>()
</script>
