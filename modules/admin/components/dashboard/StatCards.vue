<template>
  <!-- 骨架（stats 未就绪） -->
  <div v-if="!stats" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
    <USkeleton v-for="n in 8" :key="n" class="h-20" />
  </div>

  <!-- 统计卡片 -->
  <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
    <div
      v-for="card in cards"
      :key="card.key"
      class="p-4 rounded-lg border border-default bg-default"
    >
      <div class="text-2xl font-semibold">{{ card.value }}</div>
      <div class="text-xs text-muted mt-1">{{ t(card.label) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  stats: {
    counts: Record<string, number>
    newUsers7d: number
    newUsers30d: number
  } | null
}>()

const cards = computed(() => {
  const s = props.stats
  if (!s) return []
  const c = s.counts || {}
  return [
    { key: 'users', value: c.users ?? 0, label: 'admin.stats.totalUsers' },
    { key: 'courses', value: c.courses ?? 0, label: 'admin.stats.totalCourses' },
    { key: 'chapters', value: c.chapters ?? 0, label: 'admin.stats.totalChapters' },
    { key: 'questions', value: c.questions ?? 0, label: 'admin.stats.totalQuestions' },
    { key: 'homeworks', value: c.homeworks ?? 0, label: 'admin.stats.totalHomeworks' },
    { key: 'quizzes', value: c.quizzes ?? 0, label: 'admin.stats.totalQuizzes' },
    { key: 'races', value: c.races ?? 0, label: 'admin.stats.totalRaces' },
    { key: 'comments', value: c.comments ?? 0, label: 'admin.stats.totalComments' },
    { key: 'newUsers7d', value: s.newUsers7d ?? 0, label: 'admin.stats.newUsers7d' },
    { key: 'newUsers30d', value: s.newUsers30d ?? 0, label: 'admin.stats.newUsers30d' },
  ]
})
</script>
