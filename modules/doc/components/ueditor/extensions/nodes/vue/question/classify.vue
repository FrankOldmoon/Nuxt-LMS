<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <label class="text-xs text-gray-500">{{ $t('question.classifyHint') }}</label>
      <UButton variant="ghost" size="2xs" icon="i-heroicons-plus" @click="addCategory">{{ $t('question.addClassifyCategory') }}</UButton>
    </div>
    <p class="text-xs text-gray-400 mb-2">{{ $t('question.classifyDragHint') }}</p>

    <!-- 分类列表 -->
    <div class="space-y-3">
      <div v-for="(cat, ci) in form.options" :key="ci"
        class="rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden">
        <!-- 分类头部 -->
        <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800">
          <span class="shrink-0 w-6 h-6 rounded-full bg-teal-500 text-white text-xs flex items-center justify-center font-medium">
            {{ ci + 1 }}
          </span>
          <UInput v-model="cat.name" :placeholder="$t('question.classifyNamePlaceholder')" size="sm" class="flex-1" />
          <UButton variant="ghost" size="2xs" color="red" icon="i-heroicons-x-mark" class="shrink-0" @click="removeCategory(ci)" />
        </div>
        <!-- 分类内选项 -->
        <div class="p-2 space-y-1.5">
          <div v-for="(item, ii) in cat.items" :key="ii" class="flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-right" class="w-3 h-3 text-gray-400 shrink-0" />
            <UInput v-model="cat.items[ii]" :placeholder="$t('question.classifyItemPlaceholder')" size="xs" class="flex-1" />
            <UButton variant="ghost" size="2xs" color="red" icon="i-heroicons-x-mark" class="shrink-0" @click="removeItem(ci, ii)" />
          </div>
          <UButton variant="ghost" size="2xs" icon="i-heroicons-plus" @click="addItem(ci)">
            {{ $t('question.addClassifyItem') }}
          </UButton>
        </div>
      </div>
    </div>

    <div v-if="!form.options.length" class="text-xs text-gray-400 py-2 text-center">
      {{ $t('question.classifyEmpty') }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  form: { type: Object, required: true },
})

// 初始化分类结构
if (!Array.isArray(props.form.options) || !props.form.options.length) {
  props.form.options = [
    { name: '', items: ['', ''] },
    { name: '', items: ['', ''] },
  ]
}

// answer 自动生成为扁平化的分类索引数组
// 例如 [{ name:'A', items:['x','y'] }, { name:'B', items:['z'] }] → [0, 0, 1]
watch(() => JSON.stringify(props.form.options), () => {
  const ans = []
  props.form.options.forEach((cat, ci) => {
    (cat.items || []).forEach(() => ans.push(ci))
  })
  props.form.answer = ans
}, { immediate: true })

function addCategory() {
  props.form.options.push({ name: '', items: [''] })
}

function removeCategory(ci) {
  props.form.options.splice(ci, 1)
}

function addItem(ci) {
  if (!props.form.options[ci].items) props.form.options[ci].items = []
  props.form.options[ci].items.push('')
}

function removeItem(ci, ii) {
  props.form.options[ci].items.splice(ii, 1)
}
</script>
