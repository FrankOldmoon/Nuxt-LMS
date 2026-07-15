<template>
  <div>
    <label class="text-xs text-gray-500 mb-1 block">{{ fillHintText }}</label>
    <div v-if="parsedAnswers.length" class="space-y-2">
      <div
        v-for="(ans, idx) in parsedAnswers"
        :key="idx"
        class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded text-sm"
      >
        <span class="text-xs text-gray-400">#{{ idx + 1 }}</span>
        <span class="font-medium text-blue-700 dark:text-blue-300 flex-1 truncate font-mono">{{ ans }}</span>
        <UCheckbox
          v-model="regexFlags[idx]"
          :label="$t('question.fillRegex')"
          size="sm"
          @update:model-value="onRegexToggle(idx, $event)"
        />
      </div>
    </div>
    <div v-else class="text-xs text-gray-400 py-2">
      {{ $t('question.fillPlaceholderHint') }}
    </div>
    <p class="text-xs text-gray-400 mt-1">{{ $t('question.fillRegexHint') }}</p>

    <!-- regexTest -->
    <div v-if="hasRegex" class="mt-2 p-2 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 space-y-2">
      <div v-for="(ans, idx) in parsedAnswers" :key="'test-'+idx">
        <div v-if="regexFlags[idx]" class="space-y-1">
          <label class="text-xs text-gray-500 block">#{{ idx + 1 }} {{ $t('question.shortAnswerTestLabel') }}</label>
          <UInput v-model="testInputs[idx]" :placeholder="$t('question.shortAnswerTestPlaceholder')" size="xs" class="w-full" />
          <p class="text-xs" :class="testResults[idx] ? 'text-green-500' : 'text-red-500'">
            {{ testResults[idx] ? $t('question.fillRegexMatch') : $t('question.fillRegexNo match') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useFillEdit } from './useFillEdit'

const props = defineProps({
  form: { type: Object, required: true },
})

const { fillHintText, regexFlags, testInputs, hasRegex, parsedAnswers, testResults, onRegexToggle } = useFillEdit(props)
</script>
