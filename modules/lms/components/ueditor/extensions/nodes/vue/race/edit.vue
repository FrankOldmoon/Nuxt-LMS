<template>
  <!-- Modal mode (preview mode, has modelValue) -->
  <UModal v-if="isModal" v-model:open="open" scrollable>
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <h2 class="text-lg font-semibold">{{ $t('common.edit') }} - {{ form.name || $t('race.namePlaceholder') }}</h2>
        <RaceEditFormContent />
        <!-- Action button -->
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
          <UButton variant="soft" @click="reset form">{{ $t('common.reset') }}</UButton>
          <UButton variant="soft" @click="() => { open = false }">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" :loading="saving" @click="saveRace">{{ $t('common.save') }}</UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Inline panel mode (editor mode, no modelValue) -->
  <div v-else-if="form" class="p-6 space-y-4">
    <h2 class="text-lg font-semibold">{{ $t('common.edit') }} - {{ form.name || $t('race.namePlaceholder') }}</h2>
    <RaceEditFormContent />
    <!-- Action button -->
    <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
      <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
      <UButton variant="soft" @click="reset form">{{ $t('common.reset') }}</UButton>
      <UButton color="primary" :loading="saving" @click="saveRace">{{ $t('common.save') }}</UButton>
    </div>
  </div>

  <!-- Question picker -->
  <UeditorContentPicker v-model="pickerOpen" type="questions" @confirm="onPickQuestions" />
</template>

<script setup>
import { useRaceEdit } from './useRaceEdit'
import RaceEditFormContent from './edit/form-content.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: undefined },
  raceId: { type: Number, default: 0 },
  race: { type: Object, default: null },
  courseId: { type: [Number, String], default: undefined },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const {
  isModal, open, saving, saveMsg, saveOk, form, pickerOpen,
  onPickQuestions, resetForm, saveRace,
} = useRaceEdit(props, emit)
</script>
