<template>
  <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-settings" class="size-4 text-primary" />
      <span class="text-sm font-semibold">{{ $t('settings.generalSection') }}</span>
    </div>
    <UFormField :label="$t('settings.siteTitle')" class="w-full">
      <UInput v-model="form.siteTitle" :placeholder="$t('settings.siteTitlePlaceholder')" class="w-full" />
    </UFormField>
    <UFormField :label="$t('settings.siteDescription')" class="w-full">
      <UTextarea v-model="form.siteDescription" :placeholder="$t('settings.siteDescriptionPlaceholder')" :rows="2" class="w-full" />
    </UFormField>
    <UFormField :label="$t('settings.siteKeywords')" class="w-full">
      <UInput v-model="form.siteKeywords" :placeholder="$t('settings.siteKeywordsPlaceholder')" class="w-full" />
    </UFormField>
    <div class="grid grid-cols-2 gap-3">
      <UFormField :label="$t('settings.siteLogo')" class="w-full">
        <UInput v-model="form.siteLogo" :placeholder="$t('settings.siteLogoPlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="$t('settings.siteFavicon')" class="w-full">
        <UInput v-model="form.siteFavicon" :placeholder="$t('settings.siteFaviconPlaceholder')" class="w-full" />
      </UFormField>
    </div>
    <UFormField :label="$t('settings.siteFooterText')" class="w-full">
      <UInput v-model="form.siteFooterText" :placeholder="$t('settings.siteFooterTextPlaceholder')" class="w-full" />
    </UFormField>
    <div class="grid grid-cols-2 gap-3">
      <UFormField :label="$t('settings.defaultLocale')" class="w-full">
        <UInput v-model="form.siteDefaultLocale" placeholder="en" class="w-full" />
      </UFormField>
      <UFormField :label="$t('settings.timezone')" class="w-full">
        <UInput v-model="form.siteTimezone" placeholder="UTC" class="w-full" />
      </UFormField>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <UFormField :label="$t('settings.pageSize')" class="w-full">
        <UInput v-model.number="form.sitePageSize" type="number" :min="1" :placeholder="$t('settings.pageSizePlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="$t('settings.maxFileSize')" class="w-full">
        <UInput v-model.number="form.siteMaxFileSize" type="number" :min="1" :placeholder="$t('settings.maxFileSizePlaceholder')" class="w-full">
          <template #trailing>
            <span class="text-xs text-muted">MB</span>
          </template>
        </UInput>
      </UFormField>
    </div>
    <UFormField :label="$t('settings.allowedFileTypes')" class="w-full">
      <UInput v-model="form.siteAllowedFileTypes" :placeholder="$t('settings.allowedFileTypesPlaceholder')" class="w-full" />
    </UFormField>
    <UFormField :label="$t('settings.maintenanceMode')" class="w-full">
      <USwitch v-model="form.siteMaintenanceMode" />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
defineProps<{ form: any }>()
</script>
