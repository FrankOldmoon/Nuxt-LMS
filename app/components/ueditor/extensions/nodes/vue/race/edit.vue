<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-3xl' }">
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <h2 class="text-lg font-semibold">{{ form.name || $t('race.namePlaceholder') }}</h2>

        <!-- 基本配置 -->
        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="$t('race.namePlaceholder')" size="sm">
            <UInput v-model="form.name" :placeholder="$t('race.namePlaceholder')" size="sm" class="w-full" />
          </UFormField>
          <UFormField :label="$t('race.point')" size="sm">
            <UInput v-model.number="form.point" type="number" size="sm" />
          </UFormField>
          <UFormField :label="$t('race.gapTime')" size="sm">
            <UInput v-model.number="form.gapTime" type="number" size="sm" />
          </UFormField>
        </div>

        <!-- 题目选择 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium">{{ $t('race.questionsLabel') }} ({{ form.questionIds.length }})</label>
            <UButton size="xs" variant="outline" icon="i-lucide-plus" :label="$t('race.selectQuestions')" @click="pickerOpen = true" />
          </div>
          <div v-if="form.questionIds.length" class="space-y-1 max-h-48 overflow-y-auto">
            <div v-for="(qid, idx) in form.questionIds" :key="idx" class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded">
              <UIcon name="i-lucide-circle-help" class="size-4 text-gray-400" />
              <span class="text-sm flex-1">{{ $t('courseData.questionLabel') }} #{{ qid }}</span>
              <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs" @click="form.questionIds.splice(idx, 1)" />
            </div>
          </div>
          <p v-else class="text-sm text-gray-400">{{ $t('race.noQuestions') }}</p>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
          <UButton variant="soft" @click="open = false">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" :loading="saving" @click="saveRace">{{ $t('common.save') }}</UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- 题目选择器 -->
  <UeditorContentPicker v-model="pickerOpen" type="questions" @confirm="onPickQuestions" />
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  raceId: { type: Number, default: 0 },
  race: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { t } = useI18n()
const { editableCourseId } = useLayoutState()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const saving = ref(false)
const saveMsg = ref('')
const saveOk = ref(true)
const form = ref(null)
const pickerOpen = ref(false)
let originalData = null

function initForm() {
  if (!props.race) {
    form.value = {
      name: '',
      point: 100,
      gapTime: 30,
      questionIds: [],
    }
    return
  }
  const normalized = {
    name: props.race.name || '',
    point: Number(props.race.point) || 100,
    gapTime: Number(props.race.gapTime) || 30,
    questionIds: Array.isArray(props.race.questionIds) ? [...props.race.questionIds] : [],
  }
  form.value = normalized
  originalData = JSON.parse(JSON.stringify(normalized))
}

function onPickQuestions(cids) {
  for (const cid of cids) {
    if (!form.value.questionIds.includes(cid)) {
      form.value.questionIds.push(cid)
    }
  }
}

async function saveRace() {
  if (!form.value) return
  saving.value = true
  saveMsg.value = ''
  try {
    if (props.raceId) {
      await cRequest('/api/lms/races/update', {
        method: 'POST',
        body: { id: props.raceId, course_id: editableCourseId.value, ...form.value },
      })
      emit('saved', { ...form.value, cid: props.raceId })
    } else {
      const result = await cRequest('/api/lms/races/add', {
        method: 'POST',
        body: { course_id: editableCourseId.value, ...form.value },
      })
      emit('saved', { ...form.value, cid: result.cid })
    }
    saveOk.value = true
    saveMsg.value = t('race.saveSuccess')
    setTimeout(() => { open.value = false }, 500)
  } catch (err) {
    saveOk.value = false
    saveMsg.value = err.message || t('race.saveFailed')
  } finally {
    saving.value = false
  }
}

watch(open, (val) => {
  if (val) initForm()
  else {
    form.value = null
    saveMsg.value = ''
  }
})
</script>
