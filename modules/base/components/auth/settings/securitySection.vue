<template>
  <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-shield" class="size-4 text-primary" />
      <span class="text-sm font-semibold">{{ $t('settings.securitySection') }}</span>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <UFormField :label="$t('settings.allowRegistration')" class="w-full">
        <USwitch v-model="form.siteAllowRegistration" />
      </UFormField>
      <UFormField :label="$t('settings.allowForgotPassword')" class="w-full">
        <USwitch v-model="form.siteAllowForgotPassword" />
      </UFormField>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <UFormField :label="$t('settings.defaultUserRole')" class="w-full">
        <UInput v-model="form.siteDefaultUserRole" :placeholder="$t('settings.defaultUserRolePlaceholder')" class="w-full" />
      </UFormField>
      <UFormField :label="$t('settings.passwordMinLength')" class="w-full">
        <UInput v-model.number="form.sitePasswordMinLength" type="number" :min="1" class="w-full" />
      </UFormField>
    </div>
    <div class="grid grid-cols-3 gap-3">
      <UFormField :label="$t('settings.sessionMaxAge')" class="w-full">
        <UInput v-model.number="form.siteSessionMaxAge" type="number" :min="0" class="w-full" />
      </UFormField>
      <UFormField :label="$t('settings.loginMaxAttempts')" class="w-full">
        <UInput v-model.number="form.siteLoginMaxAttempts" type="number" :min="0" class="w-full" />
      </UFormField>
      <UFormField :label="$t('settings.loginLockoutMinutes')" class="w-full">
        <UInput v-model.number="form.siteLoginLockoutMinutes" type="number" :min="0" class="w-full" />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ form: any }>()
</script>
