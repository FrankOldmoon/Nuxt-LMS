<template>
  <div>
    <!-- 图片上传 -->
    <div>
      <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.puzzleImageLabel') }}</label>
      <FormInputFile v-model="config.url" :placeholder="$t('question.puzzleUploadHint')" />
    </div>

    <!-- 分割参数 -->
    <div class="mt-3">
      <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.puzzleSplitLabel') }}</label>
      <div class="flex items-center gap-2">
        <USelect v-model="config.split" :items="splitOptions" size="sm" class="w-32" />
        <span class="text-xs text-gray-400">{{ splitHint }}</span>
      </div>
    </div>

    <!-- 预览 -->
    <div v-if="config.url" class="mt-3">
      <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.puzzlePreview') }}</label>
      <div class="inline-block p-2 border border-gray-200 dark:border-gray-600 rounded">
        <div
          class="grid gap-0.5"
          :style="{ gridTemplateColumns: `repeat(${config.split}, minmax(0, 1fr))` }"
        >
          <div
            v-for="i in config.split * config.split"
            :key="i"
            class="bg-cover bg-no-repeat"
            :style="pieceStyle(i - 1)"
            style="aspect-ratio: 1; width: 60px;"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  form: { type: Object, required: true },
})
const { t } = useI18n()

const splitOptions = [
  { label: '2 × 2', value: 2 },
  { label: '3 × 3', value: 3 },
  { label: '4 × 4', value: 4 },
]

// 从 form.options 读取配置（可能是对象 {url, split} 或空）
const config = ref({
  url: '',
  split: 3,
})

function initConfig() {
  const opts = props.form.options
  if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
    config.value = {
      url: opts.url || '',
      split: Number(opts.split) || 3,
    }
  }
}
initConfig()

const splitHint = computed(() => t('question.puzzleSplitHint', { n: config.value.split * config.value.split }))

// config 变化时同步到 form.options 和 form.answer
watch(config, (val) => {
  props.form.options = { url: val.url, split: val.split }
  const n = val.split * val.split
  props.form.answer = Array.from({ length: n }, (_, i) => i)
}, { deep: true, immediate: true })

// 计算预览中每块的 background 样式
function pieceStyle(originalIndex) {
  const split = config.value.split
  const row = Math.floor(originalIndex / split)
  const col = originalIndex % split
  const posX = split > 1 ? (col / (split - 1)) * 100 : 0
  const posY = split > 1 ? (row / (split - 1)) * 100 : 0
  return {
    backgroundImage: `url(${config.value.url})`,
    backgroundSize: `${split * 100}% ${split * 100}%`,
    backgroundPosition: `${posX}% ${posY}%`,
  }
}
</script>
