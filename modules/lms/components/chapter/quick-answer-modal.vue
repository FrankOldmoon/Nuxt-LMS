<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-4 space-y-4">
        <!-- 教师：发起/管理抢答 -->
        <template v-if="canEdit">
          <template v-if="!qaActive">
            <h3 class="text-base font-semibold">{{ $t('chapter.quickAnswer') }}</h3>
            <UInput v-model="qaQuestion" :placeholder="$t('chapter.quickAnswerPlaceholder')" />
            <UButton :label="$t('chapter.quickAnswerStart')" color="primary" size="sm" class="w-full" @click="startQA" />
          </template>
          <template v-else>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold">{{ $t('chapter.quickAnswer') }}</h3>
              <UButton :label="$t('chapter.quickAnswerEnd')" color="error" size="xs" variant="soft" @click="endQA" />
            </div>
            <p v-if="qaQuestion" class="text-sm text-muted">{{ qaQuestion }}</p>
            <div v-if="qaWinner" class="text-center py-4">
              <p class="text-lg font-bold text-success">{{ qaWinner }}</p>
              <p class="text-sm text-muted mt-1">{{ $t('chapter.quickAnswerWinner') }}</p>
            </div>
            <div v-else class="text-center py-4">
              <p class="text-muted">{{ $t('chapter.quickAnswerWaiting') }}</p>
            </div>
          </template>
        </template>

        <!-- 学生：抢答 -->
        <template v-else>
          <template v-if="qaActive && !qaWinner">
            <h3 class="text-base font-semibold">{{ $t('chapter.quickAnswer') }}</h3>
            <p v-if="qaQuestion" class="text-sm text-muted">{{ qaQuestion }}</p>
            <UButton :label="$t('chapter.quickAnswerSubmit')" color="primary" size="lg" class="w-full" @click="submitQA" />
          </template>
          <template v-else-if="qaActive && qaWinner">
            <h3 class="text-base font-semibold">{{ $t('chapter.quickAnswer') }}</h3>
            <div class="text-center py-4">
              <p class="text-lg font-bold" :class="qaWinner === userName ? 'text-success' : 'text-muted'">
                {{ qaWinner }}
              </p>
              <p class="text-sm text-muted mt-1">
                {{ qaWinner === userName ? $t('chapter.quickAnswerYouWin') : $t('chapter.quickAnswerWinner') }}
              </p>
            </div>
          </template>
          <template v-else>
            <h3 class="text-base font-semibold">{{ $t('chapter.quickAnswer') }}</h3>
            <p class="text-sm text-muted">{{ $t('chapter.quickAnswerNoActive') }}</p>
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
const { sendQuickAnswerStart, onQuickAnswerStart, sendQuickAnswerSubmit, onQuickAnswerResult, sendQuickAnswerEnd, onQuickAnswerEnd } = useWebSocket()

const userName = computed(() => user.value?.name || 'anonymous')
const qaQuestion = ref('')
const qaActive = ref(false)
const qaWinner = ref<string | null>(null)

function startQA() {
  if (!props.classId) return
  sendQuickAnswerStart(props.classId, qaQuestion.value.trim())
  qaActive.value = true
}

function submitQA() {
  if (!props.classId || !qaActive.value) return
  sendQuickAnswerSubmit(props.classId, userName.value)
}

function endQA() {
  if (!props.classId) return
  sendQuickAnswerEnd(props.classId)
  resetQA()
}

function resetQA() {
  qaActive.value = false
  qaWinner.value = null
  qaQuestion.value = ''
}

onQuickAnswerStart((data) => {
  qaActive.value = true
  qaQuestion.value = data.question
  qaWinner.value = null
  open.value = true
})

onQuickAnswerResult((data) => {
  qaWinner.value = data.winner
})

onQuickAnswerEnd(() => {
  resetQA()
})

watch(open, (v) => {
  if (!v && props.canEdit && qaActive.value) {
    endQA()
  }
})
</script>
