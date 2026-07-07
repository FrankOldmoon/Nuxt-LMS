<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-5xl' }" scrollable>
    <template #content>
      <div class="p-6 space-y-4 min-w-[600px]">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ $t('chapter.select') }}</h3>
          <div class="flex items-center gap-2">
            <UButton size="xs" variant="outline" :label="$t('chapter.selectAll')" @click="selectAll" />
            <UButton size="xs" variant="outline" :label="$t('chapter.selectNone')" @click="selectedIds = []" />
          </div>
        </div>

        <div v-if="!classId" class="py-8 text-center text-muted text-sm">
          {{ $t('chapter.noClass') }}
        </div>

        <div v-else-if="loading" class="py-8 text-center text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2 inline-block" />
          {{ $t('common.loading') }}
        </div>

        <div v-else-if="!students.length" class="py-8 text-center text-muted text-sm">
          {{ $t('classSelector.noUsers') }}
        </div>

        <template v-else>
          <!-- 随机选择 -->
          <div class="flex items-center gap-2 p-3 bg-muted/30 rounded-lg flex-wrap">
            <span class="text-sm text-muted whitespace-nowrap">{{ $t('chapter.randomCount') }}</span>
            <UInput v-model.number="randomCount" type="number" min="1" :max="students.length" size="xs" class="w-20" />
            <UButton
              size="xs"
              color="primary"
              variant="soft"
              icon="i-lucide-shuffle"
              :label="randomizing ? $t('common.loading') : $t('chapter.randomPick')"
              :loading="randomizing"
              @click="randomSelect"
            />
            <span v-if="selectedIds.length" class="ml-auto text-xs text-muted">
              {{ $t('chapter.selected', { n: selectedIds.length }) }}
            </span>
          </div>

          <!-- 学生卡片网格 -->
          <div class="max-h-[400px] overflow-y-auto">
            <div class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
              <AuthUserCard
                v-for="s in students"
                :key="s.id"
                :user="s"
                :selected="selectedIds.includes(s.id)"
                @click="toggleSelect(s.id)"
              />
            </div>
          </div>

          <!-- 加减分按钮 -->
          <div v-if="selectedIds.length" class="flex items-center justify-between gap-2 pt-4 border-t border-default flex-wrap">
            <!-- 1-5 加分快捷按钮 -->
            <div class="flex items-center gap-1">
              <UPopover v-for="n in [1, 2, 3, 4, 5]" :key="n" :modal="true">
                <UButton
                  icon="i-lucide-plus"
                  color="success"
                  variant="soft"
                  size="sm"
                  :label="String(n)"
                />
                <template #content>
                  <div class="p-3 space-y-2 w-40">
                    <p class="text-sm text-muted">{{ t('chapter.scoreConfirm', { delta: `+${n}`, n: selectedIds.length }) }}</p>
                    <div class="flex justify-end gap-2">
                      <UButton size="xs" variant="ghost" @click="closePopovers">{{ t('common.cancel') }}</UButton>
                      <UButton size="xs" color="success" :loading="saving" @click="adjustScore(n)">{{ t('common.save') }}</UButton>
                    </div>
                  </div>
                </template>
              </UPopover>
            </div>
            <!-- 1-5 减分快捷按钮 -->
            <div class="flex items-center gap-1">
              <UPopover v-for="n in [1, 2, 3, 4, 5]" :key="n" :modal="true">
                <UButton
                  icon="i-lucide-minus"
                  color="error"
                  variant="soft"
                  size="sm"
                  :label="String(n)"
                />
                <template #content>
                  <div class="p-3 space-y-2 w-40">
                    <p class="text-sm text-muted">{{ t('chapter.scoreConfirm', { delta: `-${n}`, n: selectedIds.length }) }}</p>
                    <div class="flex justify-end gap-2">
                      <UButton size="xs" variant="ghost" @click="closePopovers">{{ t('common.cancel') }}</UButton>
                      <UButton size="xs" color="error" :loading="saving" @click="adjustScore(-n)">{{ t('common.save') }}</UButton>
                    </div>
                  </div>
                </template>
              </UPopover>
            </div>
            <!-- 自定义输入分数 -->
            <div class="flex items-center gap-2">
              <UInput v-model.number="customScore" type="number" size="sm" class="w-24" />
              <UPopover :modal="true">
                <UButton
                  icon="i-lucide-minus"
                  color="error"
                  variant="solid"
                  size="sm"
                  :label="$t('chapter.subScore')"
                />
                <template #content>
                  <div class="p-3 space-y-2 w-40">
                    <p class="text-sm text-muted">{{ t('chapter.scoreConfirm', { delta: `-${Math.abs(Number(customScore) || 0)}`, n: selectedIds.length }) }}</p>
                    <div class="flex justify-end gap-2">
                      <UButton size="xs" variant="ghost" @click="closePopovers">{{ t('common.cancel') }}</UButton>
                      <UButton size="xs" color="error" :loading="saving" @click="adjustScore(-Math.abs(Number(customScore) || 0))">{{ t('common.save') }}</UButton>
                    </div>
                  </div>
                </template>
              </UPopover>
              <UPopover :modal="true">
                <UButton
                  icon="i-lucide-plus"
                  color="success"
                  variant="solid"
                  size="sm"
                  :label="$t('chapter.addScore')"
                />
                <template #content>
                  <div class="p-3 space-y-2 w-40">
                    <p class="text-sm text-muted">{{ t('chapter.scoreConfirm', { delta: `+${Math.abs(Number(customScore) || 0)}`, n: selectedIds.length }) }}</p>
                    <div class="flex justify-end gap-2">
                      <UButton size="xs" variant="ghost" @click="closePopovers">{{ t('common.cancel') }}</UButton>
                      <UButton size="xs" color="success" :loading="saving" @click="adjustScore(Math.abs(Number(customScore) || 0))">{{ t('common.save') }}</UButton>
                    </div>
                  </div>
                </template>
              </UPopover>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel('open', { default: false })
const { t } = useI18n()
const toast = useToast()
const { students, fetchUsers } = useClassUsers()

const props = defineProps({
  courseId: { type: Number, default: 0 },
  classId: { type: Number, default: 0 },
})

const loading = ref(false)
const saving = ref(false)
const randomizing = ref(false)
const selectedIds = ref<number[]>([])
const randomCount = ref(1)
const customScore = ref<number>(10)

// 关闭所有打开的 UPopover（点击确认/取消后）
function closePopovers() {
  document.querySelectorAll('[data-state="open"][role="dialog"]').forEach(el => {
    ;(el as HTMLElement).click()
  })
}

function toggleSelect(id: number) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function selectAll() {
  selectedIds.value = students.value.map(s => s.id)
}

let randomTimer: ReturnType<typeof setInterval> | null = null

function randomSelect() {
  if (randomizing.value || !students.value.length) return
  randomizing.value = true
  selectedIds.value = []

  const count = Math.min(randomCount.value || 1, students.value.length)
  const allIds = students.value.map(s => s.id)

  // 快速随机闪烁，模拟抽奖动画
  let ticks = 0
  const maxTicks = 20
  randomTimer = setInterval(() => {
    // 随机选中若干个，高亮闪烁
    const shuffled = [...allIds].sort(() => Math.random() - 0.5)
    selectedIds.value = shuffled.slice(0, count)
    ticks++
    if (ticks >= maxTicks) {
      // 停下，最终结果
      if (randomTimer) {
        clearInterval(randomTimer)
        randomTimer = null
      }
      randomizing.value = false
    }
  }, 80)
}

async function adjustScore(delta: number) {
  if (!props.courseId || !selectedIds.value.length || saving.value || delta === 0) return
  saving.value = true
  try {
    await cRequest('/api/courses/marks', {
      method: 'POST',
      body: {
        course_id: props.courseId,
        user_ids: selectedIds.value,
        delta,
      },
    })
    toast.add({ title: t('chapter.scoreUpdated'), color: 'success' })
    closePopovers()
  } catch (e: any) {
    toast.add({ title: e.message || t('chapter.scoreUpdateFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function loadData() {
  if (!props.classId || !props.courseId) return
  selectedIds.value = []
  loading.value = true
  try {
    await fetchUsers(props.classId, props.courseId)
  } catch (e) {
    console.error('加载学生失败', e)
  } finally {
    loading.value = false
  }
}

watch(isOpen, (val) => {
  if (val) loadData()
  else {
    selectedIds.value = []
    customScore.value = 10
    if (randomTimer) {
      clearInterval(randomTimer)
      randomTimer = null
    }
    randomizing.value = false
  }
})

onBeforeUnmount(() => {
  if (randomTimer) {
    clearInterval(randomTimer)
    randomTimer = null
  }
})
</script>
