<template>
  <div>
    <label class="text-xs text-gray-500 mb-1 block">{{ t('question.ojPidLabel') }}</label>
    <UInput
      v-model="pid"
      :placeholder="t('question.ojPidPlaceholder')"
      size="sm"
      class="w-full font-mono"
    />
    <p class="text-xs text-gray-400 mt-1">{{ t('question.ojPidHint') }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
  form: { type: Object, required: true },
})
const { t } = useI18n()

const pid = ref('')

// 初始化 pid：优先从 options.pid（show.ts 已把 content 替换为题目内容），
// 否则回退到 form.content（新建时 pid 直接存 content）
function readPid(f) {
  if (!f) return ''
  const optPid = (f.options && typeof f.options === 'object' && !Array.isArray(f.options)) ? f.options.pid : ''
  if (optPid) return String(optPid)
  return typeof f.content === 'string' ? f.content : ''
}

watch(() => props.form, (f) => {
  const val = readPid(f)
  if (val !== pid.value) pid.value = val
}, { immediate: true })

// pid 变化时同步：content 存 pid（落库），options.pid 供回填
watch(pid, (val) => {
  if (!props.form) return
  const v = val || ''
  if (props.form.content !== v) props.form.content = v
  props.form.options = { pid: v }
})
</script>
