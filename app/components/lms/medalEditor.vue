<template>
  <div class="space-y-4">
    <USeparator :label="$t('medal.editorTitle')" class="my-4" />

    <div v-if="loading" class="flex justify-center py-4">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
    </div>

    <div v-else class="space-y-3">
      <!-- 已有奖章列表 -->
      <div v-for="(medal, idx) in medals" :key="medal.id || `new_${idx}`"
        class="border border-default rounded-lg p-3 space-y-2 bg-elevated/30">
        <div class="flex items-center gap-2">
          <UIcon :name="fullIconName(medal.content.icon)" :class="iconColorClass(medal.content.color)" class="size-5 shrink-0" />
          <UInput v-model="medal.name" size="xs" class="flex-1" :placeholder="$t('medal.namePlaceholder')" />
          <USelect v-model="medal.content.tier" :items="tierOpts" size="xs" class="w-24" />
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs"
            :loading="deletingId === medal.id" @click="deleteMedal(medal.id)" />
        </div>
        <div class="flex items-center gap-2">
          <USelect v-model="medal.content.color" :items="colorOpts" size="xs" class="w-28" />
          <!-- 图标选择器（Popover 弹窗），图标带当前颜色 -->
          <FormInputIcon v-model="medal.content.icon" :icon-color="iconColorClass(medal.content.color)" />
        </div>
        <UInput v-model="medal.content.description" size="xs" class="w-full"
          :placeholder="$t('medal.descPlaceholder')" />
        <!-- 条件编辑 -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">{{ $t('medal.conditions') }}</span>
            <div class="flex items-center gap-2">
              <USelect v-model="medal.content.logic" :items="logicOpts" size="xs" class="w-24" />
              <UButton icon="i-lucide-plus" size="xs" variant="ghost" @click="addCondition(medal)" />
            </div>
          </div>
          <div v-for="(cond, idx) in medal.content.conditions" :key="idx"
            class="flex items-center gap-1">
            <USelect v-model="cond.metric" :items="metricOpts" size="xs" class="flex-1" />
            <USelect v-model="cond.op" :items="opOpts" size="xs" class="w-16" />
            <UInput v-model.number="cond.value" type="number" size="xs" class="w-24" />
            <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error"
              @click="medal.content.conditions.splice(idx, 1)" />
          </div>
        </div>
      </div>

      <!-- 新增按钮 -->
      <UButton :label="$t('medal.add')" icon="i-lucide-plus" color="primary" variant="outline" size="sm"
        block @click="addMedal" />

      <!-- 保存按钮 -->
      <div class="flex justify-end pt-2">
        <UButton :label="$t('common.save')" color="primary" size="sm" :loading="saving" @click="saveAll" />
      </div>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const deletingId = ref(null)
const medals = ref([])

const tierOpts = [
  { label: t('medal.tier1'), value: 1 },
  { label: t('medal.tier2'), value: 2 },
  { label: t('medal.tier3'), value: 3 },
  { label: t('medal.tier4'), value: 4 },
]
const colorOpts = [
  { label: 'Bronze', value: 'bronze' },
  { label: 'Silver', value: 'silver' },
  { label: 'Gold', value: 'gold' },
  { label: 'Diamond', value: 'diamond' },
  { label: 'Primary', value: 'primary' },
  { label: 'Success', value: 'success' },
  { label: 'Warning', value: 'warning' },
  { label: 'Error', value: 'error' },
  { label: 'Info', value: 'info' },
]
const logicOpts = [
  { label: t('medal.logicAll'), value: 'all' },
  { label: t('medal.logicAny'), value: 'any' },
]
const metricOpts = [
  { label: t('medal.metricCourseScore'), value: 'courseScore' },
  { label: t('medal.metricExp'), value: 'exp' },
  { label: t('medal.metricLevel'), value: 'level' },
  { label: t('medal.metricQuestionScore'), value: 'questionScore' },
  { label: t('medal.metricHomeworkScore'), value: 'homeworkScore' },
  { label: t('medal.metricCommentScore'), value: 'commentScore' },
  { label: t('medal.metricQuizScore'), value: 'quizScore' },
  { label: t('medal.metricRaceScore'), value: 'raceScore' },
  { label: t('medal.metricQuestionCount'), value: 'questionCount' },
  { label: t('medal.metricHomeworkCount'), value: 'homeworkCount' },
  { label: t('medal.metricCommentCount'), value: 'commentCount' },
  { label: t('medal.metricChapterPassCount'), value: 'chapterPassCount' },
]
const opOpts = [
  { label: '≥', value: '>=' },
  { label: '>', value: '>' },
  { label: '≤', value: '<=' },
  { label: '<', value: '<' },
  { label: '=', value: '==' },
]

function iconColorClass(color) {
  const map = {
    bronze: 'text-amber-700',
    silver: 'text-gray-400',
    gold: 'text-amber-400',
    diamond: 'text-cyan-400',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info',
  }
  return map[color] || 'text-primary'
}

// 图标全名：兼容 i-lucide-xxx 和 lucide:xxx，无前缀时补 i-lucide-
function fullIconName(name) {
  if (!name) return 'i-lucide-award'
  if (name.startsWith('i-') || name.includes(':')) return name
  return `i-lucide-${name}`
}

async function loadMedals() {
  loading.value = true
  try {
    const data = await cRequest('/api/lms/medals/list')
    // 用 reactive 包裹，确保深层属性变更（如 content.icon）能触发响应式更新
    medals.value = (data || []).map((m) => reactive(m))
  } catch {
    medals.value = []
  } finally {
    loading.value = false
  }
}

function addCondition(medal) {
  if (!medal.content.conditions) medal.content.conditions = []
  medal.content.conditions.push({ metric: 'courseScore', op: '>=', value: 0 })
}

function addMedal() {
  medals.value.push(reactive({
    id: 0,
    name: '',
    content: {
      icon: 'i-lucide-award',
      color: 'primary',
      tier: 1,
      description: '',
      conditions: [{ metric: 'courseScore', op: '>=', value: 0 }],
      logic: 'all',
    },
  }))
}

async function deleteMedal(id) {
  if (!id) {
    // 未保存的新项，直接从列表移除
    medals.value = medals.value.filter(m => m.id !== id)
    return
  }
  deletingId.value = id
  try {
    await cRequest('/api/lms/medals/delete', { method: 'POST', body: { id } })
    medals.value = medals.value.filter(m => m.id !== id)
    toast.add({ title: t('medal.deleted'), color: 'success' })
  } catch (e) {
    toast.add({ title: e.message, color: 'error' })
  } finally {
    deletingId.value = null
  }
}

async function saveAll() {
  saving.value = true
  try {
    for (const medal of medals.value) {
      if (medal.id) {
        await cRequest('/api/lms/medals/update', {
          method: 'POST',
          body: { id: medal.id, name: medal.name, content: medal.content },
        })
      } else {
        const result = await cRequest('/api/lms/medals/add', {
          method: 'POST',
          body: { name: medal.name, content: medal.content },
        })
        medal.id = result.id
      }
    }
    toast.add({ title: t('medal.saved'), color: 'success' })
  } catch (e) {
    toast.add({ title: e.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(loadMedals)
</script>
