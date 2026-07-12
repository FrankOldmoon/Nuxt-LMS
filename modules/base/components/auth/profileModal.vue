<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-lg' }" scrollable>
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('profile.title') }}</h3>
        </div>

        <AuthUserProfileForm v-model="form">
          <template v-for="(_, name) in $slots" #[name]="slotData">
            <slot :name="name" v-bind="slotData" />
          </template>
        </AuthUserProfileForm>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            :label="$t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="closeModal"
          />
          <UButton
            :label="$t('common.save')"
            color="primary"
            :loading="saving"
            @click="saveProfile"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })

const { form, saving, closeModal, saveProfile } = useProfileModal(isOpen)
</script>
