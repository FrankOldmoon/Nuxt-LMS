<template>
  <div class="space-y-4">
    <!-- 网盘配额 -->
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

    <!-- PeerTube 视频上传配置 -->
    <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-video" class="size-4 text-primary" />
        <span class="text-sm font-semibold">{{ $t('settings.peertubeConfig') }}</span>
      </div>
      <p class="text-xs text-muted">
        {{ $t('settings.peertubeConfigHint') }}
      </p>
      <div class="grid grid-cols-2 gap-3">
        <UFormField :label="$t('settings.peertubeUrl')" class="w-full col-span-2">
          <UInput v-model="form.peertube.url" :placeholder="$t('settings.peertubeUrlPlaceholder')" class="w-full" />
        </UFormField>
        <UFormField :label="$t('settings.peertubeUsername')" class="w-full">
          <UInput v-model="form.peertube.username" class="w-full" />
        </UFormField>
        <UFormField :label="$t('settings.peertubePassword')" class="w-full">
          <UInput v-model="form.peertube.password" type="password" class="w-full" />
        </UFormField>
        <UFormField :label="$t('settings.peertubePrivacy')" class="w-full">
          <UInput v-model="form.peertube.privacy" class="w-full" />
        </UFormField>
        <UFormField :label="$t('settings.peertubeChannelId')" class="w-full">
          <UInput v-model="form.peertube.channelId" class="w-full" />
        </UFormField>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ form: any }>()
</script>
