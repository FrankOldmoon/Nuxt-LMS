<template>
  <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-mail" class="size-4 text-primary" />
      <span class="text-sm font-semibold">{{ $t('settings.mailSection') }}</span>
    </div>
    <p class="text-xs text-muted">{{ $t('settings.mailConfigHint') }}</p>
    <UFormField :label="$t('settings.mailHost')" class="w-full">
      <UInput v-model="form.mail.host" :placeholder="$t('settings.mailHostPlaceholder')" class="w-full" />
    </UFormField>
    <div class="grid grid-cols-2 gap-3">
      <UFormField :label="$t('settings.mailPort')" class="w-full">
        <UInput v-model.number="form.mail.port" type="number" :placeholder="'465'" class="w-full" />
      </UFormField>
      <UFormField :label="$t('settings.mailSecure')" class="w-full">
        <USwitch v-model="form.mail.secure" />
      </UFormField>
    </div>
    <UFormField :label="$t('settings.mailUser')" class="w-full">
      <UInput v-model="form.mail.user" :placeholder="$t('settings.mailUserPlaceholder')" class="w-full" />
    </UFormField>
    <UFormField :label="$t('settings.mailPass')" class="w-full">
      <UInput v-model="form.mail.pass" type="password" :placeholder="$t('settings.mailPassPlaceholder')" class="w-full" />
    </UFormField>
    <UFormField :label="$t('settings.mailFrom')" class="w-full">
      <UInput v-model="form.mail.from" :placeholder="$t('settings.mailFromPlaceholder')" class="w-full" />
    </UFormField>
    <UFormField :label="$t('settings.siteUrl')" class="w-full">
      <UInput v-model="form.mail.siteUrl" :placeholder="$t('settings.siteUrlPlaceholder')" class="w-full" />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
defineProps<{ form: any }>()
</script>
