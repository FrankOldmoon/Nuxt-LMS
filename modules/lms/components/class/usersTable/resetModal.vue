<template>
  <UModal v-model:open="resetOpen">
    <template #content>
      <div class="p-6 space-y-4 w-80">
        <h3 class="text-lg font-semibold">{{ $t('classSelector.resetPassword') }}</h3>
        <UInput v-model="resetPassword" type="text" :placeholder="$t('classSelector.resetPasswordPlaceholder')"
          class="w-full" />
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="close">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" :disabled="!resetPassword" @click="doResetPassword">
            {{ $t('classSelector.confirmReset') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const { resetOpen, resetPassword, doResetPassword } = useClassUsersTableContext()

function close() {
  resetOpen.value = false
}
</script>
