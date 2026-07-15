<template>
  <div class="space-y-3">
    <!-- Reviewtarget -->
    <div>
      <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.evaluationGoalLabel') }}</label>
      <UTextarea
        v-model="goal"
        :placeholder="$t('question.evaluationGoalPlaceholder')"
        :rows="2"
        size="sm"
        class="w-full"
      />
    </div>

    <!-- PassthresholdValue -->
    <div>
      <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.evaluationThresholdLabel') }}</label>
      <div class="flex items-center gap-2">
        <UInput
          v-model.number="threshold"
          type="number"
          step="0.1"
          min="0"
          max="1"
          size="sm"
          class="w-24"
        />
        <span class="text-xs text-gray-400">{{ $t('question.evaluationThresholdHint') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  form: { type: Object, required: true },
})

// ensure options YesObject
if (!props.form.options || typeof props.form.options !== 'object' || Array.isArray(props.form.options)) {
  props.form.options = { goal: '', threshold: 0.8 }
}

// Reviewtarget（doubletobindto form.options.goal）
const goal = computed({
  get: () => props.form.options?.goal ?? '',
  set: (v) => { props.form.options = { ...props.form.options, goal: v } },
})

// PassthresholdValue（doubletobindto form.options.threshold）
const threshold = computed({
  get: () => props.form.options?.threshold ?? 0.8,
  set: (v) => {
    const val = Math.max(0, Math.min(1, Number(v) || 0))
    props.form.options = { ...props.form.options, threshold: val }
  },
})
</script>
