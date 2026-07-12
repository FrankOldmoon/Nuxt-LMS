<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-lg' }" scrollable>
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('profile.title') }}</h3>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-10 text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
          <span class="text-sm">{{ $t('profile.loading') }}</span>
        </div>

        <template v-else>
          <AuthUserProfileForm v-model="form">
            <template v-for="(_, name) in $slots" #[name]="slotData">
              <slot :name="name" v-bind="slotData" />
            </template>
          </AuthUserProfileForm>

          <div class="flex justify-end gap-2 pt-4">
            <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" @click="closeModal" />
            <UButton :label="$t('common.save')" color="primary" :loading="saving" @click="saveUser" />
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{ userId: number | null }>()

const emit = defineEmits<{ (e: 'saved'): void }>()

const { open, loading, saving, form, closeModal, saveUser, show } = useUserEditModal(
  () => props.userId,
  () => emit('saved'),
)

defineExpose({ show })
</script>
