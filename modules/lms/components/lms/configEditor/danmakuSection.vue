<template>
  <!-- 提交后弹幕广播配置（控制 question/homework/quiz/comment 提交后是否向班级房间广播 danmaku） -->
  <div class="space-y-2">
    <div>
      <p class="text-sm font-medium">{{ $t('lmsConfig.danmaku') }}</p>
      <p class="text-[10px] text-muted">{{ $t('lmsConfig.danmakuHint') }}</p>
    </div>
    <div class="space-y-2">
      <div v-for="f in fields" :key="f.key" class="flex items-center justify-between">
        <div>
          <span class="text-xs">{{ $t(f.label) }}</span>
          <p class="text-[10px] text-muted">{{ $t(f.hint) }}</p>
        </div>
        <USwitch v-model="config.danmaku[f.key]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { config } = useConfigEditorContext()

const fields = [
  { key: 'enableDanmaku', label: 'lmsConfig.enableDanmaku', hint: 'lmsConfig.enableDanmakuHint' },
  { key: 'studentCanSend', label: 'lmsConfig.studentCanSend', hint: 'lmsConfig.studentCanSendHint' },
  { key: 'enableOnQuestion', label: 'lmsConfig.enableOnQuestion', hint: 'lmsConfig.enableOnQuestionHint' },
  { key: 'enableOnHomework', label: 'lmsConfig.enableOnHomework', hint: 'lmsConfig.enableOnHomeworkHint' },
  { key: 'enableOnQuiz', label: 'lmsConfig.enableOnQuiz', hint: 'lmsConfig.enableOnQuizHint' },
  { key: 'enableOnComment', label: 'lmsConfig.enableOnComment', hint: 'lmsConfig.enableOnCommentHint' },
  { key: 'questionOnlyOnCorrect', label: 'lmsConfig.questionOnlyOnCorrect', hint: 'lmsConfig.questionOnlyOnCorrectHint' },
  { key: 'onlyOnReward', label: 'lmsConfig.onlyOnReward', hint: 'lmsConfig.onlyOnRewardHint' },
]
</script>
