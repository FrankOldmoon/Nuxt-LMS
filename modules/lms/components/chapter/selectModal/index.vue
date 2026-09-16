<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-5xl' }" scrollable>
    <template #content>
      <div class="p-6 space-y-4 min-w-[600px]">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ $t('chapter.select') }}</h3>
          <div class="flex items-center gap-2">
            <UButton size="xs" variant="outline" :label="$t('chapter.selectAll')" @click="selectAll" />
            <UButton size="xs" variant="outline" :label="$t('chapter.selectNone')" @click="clearSelection" />
            <!-- 右上角：一键切换卡片网格 / 彩色大转盘 -->
            <UTooltip :text="pickerMode === 'wheel' ? $t('chapter.pickerGridMode') : $t('chapter.pickerWheelMode')">
              <UButton class="picker-mode-btn" size="xs" color="primary"
                :variant="pickerMode === 'wheel' ? 'solid' : 'outline'"
                :icon="pickerMode === 'wheel' ? 'i-lucide-layout-grid' : 'i-lucide-disc-3'"
                :aria-label="$t('chapter.pickerWheelMode')" @click="togglePickerMode" />
            </UTooltip>
          </div>
        </div>
        <div v-if="!classId" class="py-8 text-center text-muted text-sm">{{ $t('chapter.noClass') }}</div>
        <div v-else-if="loading" class="py-8 text-center text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2 inline-block" />{{ $t('common.loading') }}
        </div>
        <div v-else-if="!students.length" class="py-8 text-center text-muted text-sm">{{ $t('classSelector.noUsers') }}</div>
        <template v-else>
          <div class="flex items-center gap-2 p-3 bg-muted/30 rounded-lg flex-wrap">
            <template v-if="pickerMode === 'grid'">
              <span class="text-sm text-muted whitespace-nowrap">{{ $t('chapter.randomCount') }}</span>
              <UInput v-model.number="randomCount" type="number" min="1" :max="students.length" size="xs" class="w-20" />
              <UButton size="xs" color="primary" variant="soft" icon="i-lucide-shuffle"
                :label="randomizing ? $t('common.loading') : $t('chapter.randomPick')"
                :loading="randomizing" @click="randomSelect" />
            </template>
            <template v-else>
              <UButton size="xs" color="primary" variant="soft" icon="i-lucide-shuffle"
                :label="spinning ? $t('common.loading') : $t('chapter.wheelSpin')"
                :loading="spinning" :disabled="spinning" @click="spinWheel" />
            </template>
            <span v-if="selectedIds.length" class="ml-auto text-xs text-muted">
              {{ $t('chapter.selected', { n: selectedIds.length }) }}
            </span>
          </div>
          <ChapterSelectModalWheel v-if="pickerMode === 'wheel'" ref="wheelRef" :users="students"
            :selected-ids="selectedIds" :winner="winner" :celebrate="celebrate" :spinning="spinning"
            @spin="spinWheel" @pick="onWheelPick" @celebrate-end="onCelebrateEnd" />
          <div v-else class="max-h-[400px] overflow-y-auto">
            <div class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
              <AuthUserCard v-for="s in students" :key="s.id" :user="s"
                :selected="selectedIds.includes(s.id)" @click="toggleSelect(s.id)" />
            </div>
          </div>
          <div v-if="selectedIds.length" class="flex items-center justify-between gap-2 pt-4 border-t border-default flex-wrap">
            <div class="flex items-center gap-1">
              <ChapterSelectModalScoreButton v-for="n in [1,2,3,4,5]" :key="n" :delta="n"
                :selected-count="selectedIds.length" :saving="saving"
                @confirm="adjustScore" @cancel="closePopovers" />
            </div>
            <div class="flex items-center gap-1">
              <ChapterSelectModalScoreButton v-for="n in [1,2,3,4,5]" :key="n" :delta="-n"
                :selected-count="selectedIds.length" :saving="saving"
                @confirm="adjustScore" @cancel="closePopovers" />
            </div>
            <div class="flex items-center gap-2">
              <UInput v-model.number="customScore" type="number" size="sm" class="w-24" />
              <UPopover :modal="true">
                <UButton icon="i-lucide-minus" color="error" variant="solid" size="sm" :label="$t('chapter.subScore')" />
                <template #content="{ close }">
                  <div class="p-3 space-y-2 w-40">
                    <p class="text-sm text-muted">{{ $t('chapter.scoreConfirm', { delta: '-' + Math.abs(Number(customScore) || 0), n: selectedIds.length }) }}</p>
                    <div class="flex justify-end gap-2">
                      <UButton size="xs" variant="ghost" @click="onCancel(close)">{{ $t('common.cancel') }}</UButton>
                      <UButton size="xs" color="error" :loading="saving" @click="onAdjust(close, -Math.abs(Number(customScore) || 0))">{{ $t('common.save') }}</UButton>
                    </div>
                  </div>
                </template>
              </UPopover>
              <UPopover :modal="true">
                <UButton icon="i-lucide-plus" color="success" variant="solid" size="sm" :label="$t('chapter.addScore')" />
                <template #content="{ close }">
                  <div class="p-3 space-y-2 w-40">
                    <p class="text-sm text-muted">{{ $t('chapter.scoreConfirm', { delta: '+' + Math.abs(Number(customScore) || 0), n: selectedIds.length }) }}</p>
                    <div class="flex justify-end gap-2">
                      <UButton size="xs" variant="ghost" @click="onCancel(close)">{{ $t('common.cancel') }}</UButton>
                      <UButton size="xs" color="success" :loading="saving" @click="onAdjust(close, Math.abs(Number(customScore) || 0))">{{ $t('common.save') }}</UButton>
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
import { playWinSound } from './useWheel'

const isOpen = defineModel('open', { default: false })
const props = defineProps({
  courseId: { type: Number, default: 0 },
  classId: { type: Number, default: 0 },
  chapterId: { type: Number, default: 0 },
})
const {
  loading, saving, randomizing, students, selectedIds, randomCount, customScore,
  closePopovers, toggleSelect, selectAll, clearSelection, randomSelect, adjustScore,
} = useChapterSelect(props, isOpen)

// 选人模式：grid = 卡片网格（可多选），wheel = 彩色大转盘（一次抽一人）
const pickerMode = ref<'grid' | 'wheel'>('grid')
const wheelRef = ref<any>(null)
const spinning = ref(false)
// 中奖学生：卡片从小到大放大；celebrate 额外触发烟花与音效
const winner = ref<any>(null)
const celebrate = ref(false)

function togglePickerMode() {
  pickerMode.value = pickerMode.value === 'wheel' ? 'grid' : 'wheel'
  winner.value = null
  celebrate.value = false
}

// 随机抽取：转盘转到随机扇区，停下后放大该学生卡片 + 烟花 + 音效
async function spinWheel() {
  if (spinning.value || !students.value.length) return
  const index = Math.floor(Math.random() * students.value.length)
  spinning.value = true
  winner.value = null
  celebrate.value = false
  selectedIds.value = []
  await wheelRef.value?.spinTo(index, students.value.length)
  const picked = students.value[index]
  spinning.value = false
  if (!picked) return
  selectedIds.value = [picked.id]
  winner.value = picked
  celebrate.value = true
  playWinSound()
}

// 手动点选扇区：切换该学生选中状态，选中时同样放大卡片（不放烟花与音效）
function onWheelPick(user: any) {
  if (spinning.value || !user?.id) return
  toggleSelect(user.id)
  winner.value = selectedIds.value.includes(user.id) ? user : null
  celebrate.value = false
}

// 烟花播放结束 → 收起放大卡片
function onCelebrateEnd() {
  celebrate.value = false
  winner.value = null
}

// 关闭弹窗时复位转盘状态
watch(isOpen, (val) => {
  if (!val) {
    spinning.value = false
    winner.value = null
    celebrate.value = false
  }
})

// 确认后立即关闭本 popover，再执行加减分
function onAdjust(close?: () => void, delta?: number) {
  close?.()
  if (delta) adjustScore(delta)
}
function onCancel(close?: () => void) {
  close?.()
}
</script>
