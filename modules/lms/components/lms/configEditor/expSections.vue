<template>
  <!-- 经验值配置区域（题目/作业/评论/章节/竞赛/测验/通用） -->
  <div v-for="section in sections" :key="section.configKey" class="space-y-2">
    <p class="text-sm font-medium">{{ $t(section.title) }}</p>
    <div class="grid grid-cols-2 gap-2">
      <UFormField v-for="f in section.fields" :key="f.key" :label="$t(f.label)" size="xs">
        <UInput v-model.number="config[section.configKey][f.key]" type="number" :step="f.step" size="xs" class="w-full" />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
const { config } = useConfigEditorContext()

const sections = [
  {
    title: 'lmsConfig.question',
    configKey: 'question',
    fields: [
      { key: 'submitExp', label: 'lmsConfig.submitExp' },
      { key: 'correctBonusExp', label: 'lmsConfig.correctBonusExp' },
      { key: 'firstCorrectBonusExp', label: 'lmsConfig.firstCorrectBonusExp' },
      { key: 'maxSubmitCount', label: 'lmsConfig.maxSubmitCount' },
    ],
  },
  {
    title: 'lmsConfig.homework',
    configKey: 'homework',
    fields: [
      { key: 'submitExp', label: 'lmsConfig.submitExp' },
      { key: 'resubmitExp', label: 'lmsConfig.resubmitExp' },
      { key: 'latePenalty', label: 'lmsConfig.latePenalty', step: '0.1' },
    ],
  },
  {
    title: 'lmsConfig.comment',
    configKey: 'comment',
    fields: [
      { key: 'publishExp', label: 'lmsConfig.publishExp' },
      { key: 'replyExp', label: 'lmsConfig.replyExp' },
      { key: 'likeReceivedExp', label: 'lmsConfig.likeReceivedExp' },
      { key: 'maxDailyExp', label: 'lmsConfig.maxDailyExp' },
    ],
  },
  {
    title: 'lmsConfig.chapter',
    configKey: 'chapter',
    fields: [
      { key: 'headingExp', label: 'lmsConfig.headingExp' },
      { key: 'headingCoin', label: 'lmsConfig.headingCoin' },
      { key: 'headingScore', label: 'lmsConfig.headingScore' },
    ],
  },
  {
    title: 'lmsConfig.race',
    configKey: 'race',
    fields: [
      { key: 'participateExp', label: 'lmsConfig.participateExp' },
      { key: 'rank1Exp', label: 'lmsConfig.rank1Exp' },
      { key: 'rank2Exp', label: 'lmsConfig.rank2Exp' },
      { key: 'rank3Exp', label: 'lmsConfig.rank3Exp' },
    ],
  },
  {
    title: 'lmsConfig.quiz',
    configKey: 'quiz',
    fields: [
      { key: 'submitExp', label: 'lmsConfig.submitExp' },
      { key: 'passScore', label: 'lmsConfig.passScore' },
      { key: 'passBonusExp', label: 'lmsConfig.passBonusExp' },
    ],
  },
  {
    title: 'lmsConfig.general',
    configKey: 'general',
    fields: [
      { key: 'dailyExpCap', label: 'lmsConfig.dailyExpCap' },
      { key: 'levelStep', label: 'lmsConfig.levelStep' },
    ],
  },
]
</script>
