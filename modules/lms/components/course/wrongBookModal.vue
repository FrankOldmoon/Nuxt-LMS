<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-4xl' }">
    <template #content>
      <div class="flex flex-col" style="height: 80vh;">
        <!-- 固定头部 -->
        <div class="p-4 space-y-3 shrink-0 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-book-x" class="text-red-500" />
              {{ $t('chapter.wrongBook') }}
            </h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="isOpen = false" />
          </div>

          <!-- 搜索 + 题型筛选 -->
          <div class="flex items-center gap-2">
            <USelect v-model="filterType" :items="typeOptions" size="sm" class="w-36" />
            <UInput v-model="keyword" :placeholder="$t('courseData.searchPlaceholder')"
              icon="i-lucide-search" size="sm" class="flex-1" @keydown.enter="refetch" />
            <UButton size="sm" color="primary" variant="soft" icon="i-lucide-refresh-cw" @click="refetch">
              {{ $t('common.refresh') }}
            </UButton>
          </div>
        </div>

        <!-- 滚动列表区 -->
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="loading" class="flex items-center justify-center py-10 text-gray-400">
            <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
            <span class="text-sm">{{ $t('common.loading') }}</span>
          </div>

          <div v-else-if="!items.length" class="flex items-center justify-center h-full text-gray-400 text-sm">
            <UIcon name="i-lucide-check-circle-2" class="size-8 mr-2 text-green-400" />
            {{ $t('chapter.wrongBookEmpty') }}
          </div>

          <div v-else class="space-y-3">
            <div v-for="item in items" :key="`${item.courseId}-${item.cid}`"
              class="rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
              <!-- 头部：题型 / 名称 / 错题次数 / 课程ID -->
              <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800">
                <UIcon name="i-lucide-x-circle" class="size-4 text-red-500 shrink-0" />
                <span class="text-sm font-medium flex-1 truncate">
                  {{ item.name || $t('common.unnamed') }}
                </span>
                <UTooltip :text="$t('chapter.wrongCountHint')">
                  <span class="text-xs px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded">
                    {{ $t('chapter.wrongTimes', { n: item.wrongCount }) }}
                  </span>
                </UTooltip>
                <span class="text-xs text-gray-400 font-mono">#{{ item.cid }}</span>
              </div>
              <!-- 题目渲染（错题本支持作答） -->
              <div class="p-3">
                <component :is="QuestionRender"
                  :node="{ attrs: { type: 'question', content: String(item.cid) } }"
                  :course-id="item.courseId" />
              </div>
            </div>
          </div>
        </div>

        <!-- 固定底部：分页 -->
        <div class="p-4 shrink-0 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400">
                {{ total === 0 ? '0 / 0' : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} / ${total}` }}
              </span>
              <USelect v-model="pageSize" :items="pageSizeOptions" size="xs" class="w-16" />
            </div>
            <div class="flex items-center gap-1">
              <UButton icon="i-lucide-chevron-left" size="xs" color="neutral" variant="ghost"
                :disabled="page <= 1" @click="prevPage" />
              <span class="text-xs text-gray-400">{{ page }} / {{ totalPages }}</span>
              <UButton icon="i-lucide-chevron-right" size="xs" color="neutral" variant="ghost"
                :disabled="page >= totalPages" @click="nextPage" />
            </div>
          </div>
          <div class="flex justify-end">
            <UButton variant="ghost" size="sm" @click="isOpen = false">{{ $t('common.close') }}</UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
// 跨模块导入：错题本需直接渲染 question 组件，并显式传入 courseId
import QuestionRender from '../../../doc/components/ueditor/extensions/nodes/render/vue/question.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  courseId: { type: Number, default: 0 },
})
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const { t } = useI18n()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const keyword = ref('')
const filterType = ref('all')

const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
]

const typeOptions = computed(() => [
  { label: t('question.allTypes'), value: 'all' },
  { label: t('question.typeSingle'), value: 'single' },
  { label: t('question.typeJudge'), value: 'judge' },
  { label: t('question.typeMultiple'), value: 'multiple' },
  { label: t('question.typeFill'), value: 'fill' },
  { label: t('question.typeSelect'), value: 'select' },
  { label: t('question.typeSort'), value: 'sort' },
  { label: t('question.typeClassify'), value: 'classify' },
  { label: t('question.typeMatch'), value: 'match' },
  { label: t('question.typeShortAnswer'), value: 'short-answer' },
])

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

// 防抖
let searchTimer: any = null
watch(keyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    refetch()
  }, 400)
})
watch(filterType, () => {
  page.value = 1
  refetch()
})
watch(pageSize, () => { page.value = 1; refetch() })

watch(isOpen, (val) => {
  if (val) {
    page.value = 1
    keyword.value = ''
    filterType.value = 'all'
    refetch()
  }
})

function prevPage() {
  if (page.value > 1) {
    page.value--
    refetch()
  }
}
function nextPage() {
  if (page.value < totalPages.value) {
    page.value++
    refetch()
  }
}

async function refetch() {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
    }
    if (props.courseId) params.course_id = props.courseId
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (filterType.value && filterType.value !== 'all') params.type = filterType.value

    const qs = new URLSearchParams(params).toString()
    const res = await cRequest(`/api/questions/wrong-list?${qs}`)
    items.value = res?.items || []
    total.value = res?.total || 0
  } catch {
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}
</script>
