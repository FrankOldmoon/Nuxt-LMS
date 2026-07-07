<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-4 space-y-4">
        <!-- 教师：发起投票 -->
        <template v-if="canEdit">
          <template v-if="!activeVoteId">
            <h3 class="text-base font-semibold">{{ $t('chapter.vote') }}</h3>
            <UInput v-model="question" :placeholder="$t('chapter.voteQuestionPlaceholder')" />
            <div v-for="(opt, i) in options" :key="i" class="flex items-center gap-2">
              <UInput v-model="options[i]" :placeholder="`${$t('chapter.voteOption')} ${i + 1}`" class="flex-1" />
              <UButton v-if="options.length > 2" icon="i-lucide-x" size="xs" variant="ghost" color="error" @click="options.splice(i, 1)" />
            </div>
            <UButton icon="i-lucide-plus" size="xs" variant="outline" :label="$t('chapter.voteAddOption')" @click="options.push('')" />
            <UButton :label="$t('chapter.voteStart')" color="primary" size="sm" class="w-full" :disabled="!canStartVote" @click="startVote" />
          </template>

          <!-- 教师：查看投票进度 -->
          <template v-else>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold">{{ $t('chapter.vote') }}</h3>
              <UButton :label="$t('chapter.voteEnd')" color="error" size="xs" variant="soft" @click="endVote" />
            </div>
            <p class="text-sm text-muted">{{ question }}</p>
            <div v-for="(opt, i) in voteOptions" :key="i" class="space-y-1">
              <div class="flex justify-between text-sm">
                <span>{{ opt }}</span>
                <span class="text-muted">{{ voteResults[i] || 0 }}</span>
              </div>
              <div class="h-2 bg-elevated rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full transition-all" :style="{ width: barWidth(i) }" />
              </div>
            </div>
            <p class="text-xs text-muted text-right">{{ $t('chapter.voteTotal', { n: voteTotal }) }}</p>
          </template>
        </template>

        <!-- 学生：投票 -->
        <template v-else>
          <template v-if="activeVoteId && !voted">
            <h3 class="text-base font-semibold">{{ $t('chapter.vote') }}</h3>
            <p class="text-sm text-muted">{{ voteQuestion }}</p>
            <div class="space-y-2">
              <UButton v-for="(opt, i) in voteOptions" :key="i" :label="opt" variant="outline" size="sm" class="w-full justify-center" @click="submitVote(i)" />
            </div>
          </template>
          <template v-else-if="activeVoteId && voted">
            <h3 class="text-base font-semibold">{{ $t('chapter.vote') }}</h3>
            <p class="text-sm text-muted">{{ voteQuestion }}</p>
            <div v-for="(opt, i) in voteOptions" :key="i" class="space-y-1">
              <div class="flex justify-between text-sm">
                <span>{{ opt }}</span>
                <span class="text-muted">{{ voteResults[i] || 0 }}</span>
              </div>
              <div class="h-2 bg-elevated rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full transition-all" :style="{ width: barWidth(i) }" />
              </div>
            </div>
            <p class="text-xs text-muted text-right">{{ $t('chapter.voteTotal', { n: voteTotal }) }}</p>
          </template>
          <template v-else>
            <h3 class="text-base font-semibold">{{ $t('chapter.vote') }}</h3>
            <p class="text-sm text-muted">{{ $t('chapter.voteNoActive') }}</p>
          </template>
        </template>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{ classId: number; canEdit: boolean }>()
const open = defineModel<boolean>('open', { default: false })

const { user } = useAuth()
const { sendVoteStart, onVoteStart, sendVoteSubmit, onVoteUpdate, sendVoteEnd, onVoteEnd } = useWebSocket()

// 教师：创建投票
const question = ref('')
const options = ref(['', ''])
const activeVoteId = ref<string | null>(null)

// 投票状态
const voteQuestion = ref('')
const voteOptions = ref<string[]>([])
const voteResults = ref<number[]>([])
const voteTotal = ref(0)
const voted = ref(false)

const canStartVote = computed(() => question.value.trim() && options.value.every(o => o.trim()))

function startVote() {
  if (!props.classId || !canStartVote.value) return
  const id = `vote-${Date.now()}`
  const opts = options.value.map(o => o.trim())
  sendVoteStart(props.classId, id, question.value.trim(), opts)
  activeVoteId.value = id
  voteQuestion.value = question.value.trim()
  voteOptions.value = opts
  voteResults.value = new Array(opts.length).fill(0)
  voteTotal.value = 0
}

function submitVote(index: number) {
  if (!props.classId || !activeVoteId.value) return
  sendVoteSubmit(props.classId, activeVoteId.value, index, user.value?.name || 'anonymous')
  voted.value = true
}

function endVote() {
  if (!props.classId || !activeVoteId.value) return
  sendVoteEnd(props.classId, activeVoteId.value)
  resetVote()
}

function resetVote() {
  activeVoteId.value = null
  voteQuestion.value = ''
  voteOptions.value = []
  voteResults.value = []
  voteTotal.value = 0
  voted.value = false
  question.value = ''
  options.value = ['', '']
}

function barWidth(i: number) {
  if (!voteTotal.value) return '0%'
  return `${((voteResults.value[i] || 0) / voteTotal.value * 100).toFixed(1)}%`
}

// 监听投票事件
onVoteStart((data) => {
  activeVoteId.value = data.voteId
  voteQuestion.value = data.question
  voteOptions.value = data.options
  voteResults.value = new Array(data.options.length).fill(0)
  voteTotal.value = 0
  voted.value = false
  open.value = true
})

onVoteUpdate((data) => {
  if (data.voteId !== activeVoteId.value) return
  voteResults.value = data.results
  voteTotal.value = data.total
})

onVoteEnd((data) => {
  if (data.voteId !== activeVoteId.value) return
  voteResults.value = data.results
  voteTotal.value = data.total
})

// 弹窗关闭时教师重置
watch(open, (v) => {
  if (!v && props.canEdit && activeVoteId.value) {
    endVote()
  }
})
</script>
