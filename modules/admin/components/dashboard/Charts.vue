<template>
  <div class="grid lg:grid-cols-2 gap-4">
    <!-- User growth (line) -->
    <div class="p-3 rounded-lg border border-default bg-default">
      <ClientOnly>
        <Chart :option="growthOption" :height="320" />
        <template #fallback>
          <USkeleton class="h-80" />
        </template>
      </ClientOnly>
    </div>

    <!-- Role distribution (pie) -->
    <div class="p-3 rounded-lg border border-default bg-default">
      <ClientOnly>
        <Chart :option="roleOption" :height="320" />
        <template #fallback>
          <USkeleton class="h-80" />
        </template>
      </ClientOnly>
    </div>

    <!-- Content distribution (bar) -->
    <div class="p-3 rounded-lg border border-default bg-default lg:col-span-2">
      <ClientOnly>
        <Chart :option="contentOption" :height="320" />
        <template #fallback>
          <USkeleton class="h-80" />
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  stats: {
    counts: Record<string, number>
    userGrowth: { date: string; count: number }[]
    roleDistribution: { name: string; value: number }[]
  } | null
}>()

// User growth (line)
const growthOption = computed(() => ({
  title: { text: t('admin.stats.userGrowth'), left: 'center' },
  tooltip: { trigger: 'axis' },
  grid: { left: '8%', right: '5%', bottom: '10%' },
  xAxis: {
    type: 'category',
    data: props.stats?.userGrowth.map((r) => r.date) ?? [],
    boundaryGap: false,
  },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      type: 'line',
      smooth: true,
      data: props.stats?.userGrowth.map((r) => r.count) ?? [],
      areaStyle: {},
    },
  ],
}))

// Role distribution (pie)
const roleOption = computed(() => ({
  title: { text: t('admin.stats.roleDistribution'), left: 'center' },
  tooltip: { trigger: 'item' },
  series: [
    {
      type: 'pie',
      radius: '55%',
      data: props.stats?.roleDistribution ?? [],
    },
  ],
}))

// Content distribution (bar)
const contentOption = computed(() => {
  const c = props.stats?.counts ?? {}
  const keys = ['courses', 'chapters', 'questions', 'homeworks', 'quizzes', 'races', 'comments']
  return {
    title: { text: t('admin.stats.contentDistribution'), left: 'center' },
    tooltip: { trigger: 'axis' },
    grid: { left: '8%', right: '5%', bottom: '15%' },
    xAxis: { type: 'category', data: keys, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{ type: 'bar', data: keys.map((k) => c[k] ?? 0) }],
  }
})
</script>
