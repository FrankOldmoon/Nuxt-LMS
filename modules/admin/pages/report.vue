<template>
  <div class="space-y-6">
    <!-- 标题栏 -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-xl font-semibold">{{ t('admin.report.title') }}</h2>
        <p class="text-xs text-muted mt-1">
          {{ t('admin.report.subtitle') }}
          <ClientOnly v-if="report?.generatedAt">
            <span> · {{ t('admin.report.generatedAt') }} {{ generatedAtText }}</span>
          </ClientOnly>
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        variant="soft"
        size="sm"
        :loading="pending"
        :label="t('admin.report.refresh')"
        @click="refresh()"
      />
    </div>

    <!-- 骨架 -->
    <div v-if="!report" class="space-y-6">
      <USkeleton class="h-24" />
      <USkeleton class="h-80" />
      <USkeleton class="h-80" />
    </div>

    <template v-else>
      <!-- ⓪ 关键洞察（分析结论，而非原始数据） -->
      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-muted">{{ t('admin.report.section.insights') }}</h3>
        <div class="grid lg:grid-cols-3 gap-4">
          <!-- 平台健康度 -->
          <div class="p-4 rounded-lg border border-default bg-default">
            <div class="text-xs font-medium text-muted">{{ t('admin.report.insights.health') }}</div>
            <div class="flex items-end gap-2 mt-2">
              <div class="text-4xl font-semibold tabular-nums leading-none" :class="levelText(insights.level)">
                {{ insights.score }}
              </div>
              <span
                class="text-xs px-2 py-0.5 rounded-full mb-0.5"
                :class="levelBadge(insights.level)"
              >
                {{ t(`admin.report.insights.level.${insights.level}`) }}
              </span>
            </div>
            <div class="mt-4 space-y-2.5">
              <div v-for="m in insights.metrics" :key="m.key">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-muted">{{ t(`admin.report.insights.metric.${m.key}`) }}</span>
                  <span class="tabular-nums">{{ m.value }}%</span>
                </div>
                <div class="h-1.5 rounded-full bg-elevated overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="levelBar(m.level)"
                    :style="{ width: `${Math.min(100, m.score)}%` }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 风险提示 -->
          <div class="lg:col-span-2 p-4 rounded-lg border border-default bg-default">
            <div class="text-xs font-medium text-muted">{{ t('admin.report.insights.alertTitle') }}</div>
            <div v-if="alerts.length" class="mt-3 grid sm:grid-cols-2 gap-2">
              <div v-for="a in alerts" :key="a.key" class="flex items-center gap-2 text-sm">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="levelBar(a.level)" />
                <span>{{ t(`admin.report.insights.alert.${a.key}`, a.params || {}) }}</span>
              </div>
            </div>
            <p v-else class="mt-3 text-sm text-muted">{{ t('admin.report.insights.noAlert') }}</p>
          </div>
        </div>
      </section>

      <!-- ① 规模概览 -->
      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-muted">{{ t('admin.report.section.scale') }}</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <div
            v-for="card in scaleCards"
            :key="card.key"
            class="p-4 rounded-lg border border-default bg-default"
          >
            <div class="text-2xl font-semibold tabular-nums">{{ fmt(card.value) }}</div>
            <div class="text-xs text-muted mt-1">{{ card.label }}</div>
          </div>
        </div>
      </section>

      <!-- ② 趋势 -->
      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-muted">{{ t('admin.report.section.trend') }}</h3>
        <div class="grid lg:grid-cols-2 gap-4">
          <div class="p-3 rounded-lg border border-default bg-default">
            <div class="text-xs font-medium text-muted mb-1">{{ t('admin.report.chart.userGrowth') }}</div>
            <ClientOnly>
              <LazyChart :option="userGrowthOption" :height="300" />
              <template #fallback><USkeleton class="h-72" /></template>
            </ClientOnly>
          </div>
          <div class="p-3 rounded-lg border border-default bg-default">
            <div class="text-xs font-medium text-muted mb-1">{{ t('admin.report.chart.learningTrend') }}</div>
            <ClientOnly>
              <LazyChart :option="learningTrendOption" :height="300" />
              <template #fallback><USkeleton class="h-72" /></template>
            </ClientOnly>
          </div>
        </div>
      </section>

      <!-- ③ 增长与结构分析 -->
      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-muted">{{ t('admin.report.section.growth') }}</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div v-for="card in growthCards" :key="card.key" class="p-4 rounded-lg border border-default bg-default">
            <div class="text-2xl font-semibold tabular-nums">{{ card.value }}</div>
            <div class="text-xs text-muted mt-1">{{ card.label }}</div>
            <div v-if="card.rate !== null" class="flex items-center gap-1 text-xs mt-1" :class="trendClass(card.rate)">
              <UIcon :name="trendIcon(card.rate)" class="w-3 h-3" />
              <span class="tabular-nums">{{ card.rate > 0 ? '+' : '' }}{{ card.rate }}%</span>
            </div>
            <div v-else-if="card.hint" class="text-xs text-muted mt-1 tabular-nums">{{ card.hint }}</div>
          </div>
        </div>

        <!-- 成绩结构（优秀 / 良好 / 及格 / 不及格） -->
        <div class="p-4 rounded-lg border border-default bg-default">
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs font-medium text-muted">{{ t('admin.report.growth.scoreStructure') }}</div>
            <div class="text-xs text-muted tabular-nums">{{ t('admin.report.growth.totalRecords') }} {{ fmt(scoreStruct.total) }}</div>
          </div>
          <div class="flex h-3 rounded-full overflow-hidden bg-elevated">
            <div
              v-for="seg in scoreSegments"
              :key="seg.key"
              class="h-full"
              :class="seg.cls"
              :style="{ width: `${seg.pct}%` }"
              :title="`${t(`admin.report.growth.${seg.key}`)} ${seg.pct}%`"
            />
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div v-for="seg in scoreSegments" :key="seg.key" class="text-sm">
              <div class="flex items-center gap-1.5 text-xs text-muted">
                <span class="w-2 h-2 rounded-full" :class="seg.cls" />
                {{ t(`admin.report.growth.${seg.key}`) }}
              </div>
              <div class="mt-1 tabular-nums">
                <span class="font-semibold">{{ seg.rate }}%</span>
                <span class="text-muted text-xs ml-1">{{ fmt(seg.count) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ④ 分布 -->
      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-muted">{{ t('admin.report.section.distribution') }}</h3>
        <div class="grid lg:grid-cols-3 gap-4">
          <div class="p-3 rounded-lg border border-default bg-default">
            <div class="text-xs font-medium text-muted mb-1">{{ t('admin.report.chart.roleDistribution') }}</div>
            <ClientOnly>
              <LazyChart :option="roleOption" :height="300" />
              <template #fallback><USkeleton class="h-72" /></template>
            </ClientOnly>
          </div>
          <div class="p-3 rounded-lg border border-default bg-default">
            <div class="text-xs font-medium text-muted mb-1">{{ t('admin.report.chart.scoreDistribution') }}</div>
            <ClientOnly>
              <LazyChart :option="scoreOption" :height="300" />
              <template #fallback><USkeleton class="h-72" /></template>
            </ClientOnly>
          </div>
          <div class="p-3 rounded-lg border border-default bg-default">
            <div class="text-xs font-medium text-muted mb-1">{{ t('admin.report.chart.progressDistribution') }}</div>
            <ClientOnly>
              <LazyChart :option="progressOption" :height="300" />
              <template #fallback><USkeleton class="h-72" /></template>
            </ClientOnly>
          </div>
        </div>
      </section>

      <!-- ④ 能力雷达 + 内容分布 -->
      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-muted">{{ t('admin.report.section.ability') }}</h3>
        <div class="grid lg:grid-cols-2 gap-4">
          <div class="p-3 rounded-lg border border-default bg-default">
            <div class="text-xs font-medium text-muted mb-1">{{ t('admin.report.chart.abilityRadar') }}</div>
            <ClientOnly>
              <LazyChart :option="abilityOption" :height="320" />
              <template #fallback><USkeleton class="h-80" /></template>
            </ClientOnly>
          </div>
          <div class="p-3 rounded-lg border border-default bg-default">
            <div class="text-xs font-medium text-muted mb-1">{{ t('admin.report.chart.contentDistribution') }}</div>
            <ClientOnly>
              <LazyChart :option="contentOption" :height="320" />
              <template #fallback><USkeleton class="h-80" /></template>
            </ClientOnly>
          </div>
        </div>
      </section>

      <!-- ⑤ 排行 -->
      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-muted">{{ t('admin.report.section.ranking') }}</h3>
        <div class="grid lg:grid-cols-2 gap-4">
          <!-- 课程排行 -->
          <div class="rounded-lg border border-default bg-default overflow-hidden">
            <div class="px-3 py-2 border-b border-default text-xs font-medium text-muted">
              {{ t('admin.report.table.courseRanking') }}
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-xs text-muted">
                  <tr class="border-b border-default">
                    <th class="text-left px-3 py-2 font-medium">{{ t('admin.report.table.course') }}</th>
                    <th class="text-right px-3 py-2 font-medium">{{ t('admin.report.table.students') }}</th>
                    <th class="text-right px-3 py-2 font-medium">{{ t('admin.report.table.avgScore') }}</th>
                    <th class="text-right px-3 py-2 font-medium">{{ t('admin.report.table.avgProgress') }}</th>
                    <th class="text-right px-3 py-2 font-medium">{{ t('admin.report.table.avgExp') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in report.courseRanking" :key="c.courseId" class="border-b border-default last:border-0">
                    <td class="px-3 py-2 truncate max-w-48">{{ c.name }}</td>
                    <td class="px-3 py-2 text-right tabular-nums">{{ fmt(c.students) }}</td>
                    <td class="px-3 py-2 text-right tabular-nums">{{ c.avgScore }}</td>
                    <td class="px-3 py-2 text-right tabular-nums">{{ c.avgProgress }}%</td>
                    <td class="px-3 py-2 text-right tabular-nums">{{ fmt(c.avgExp) }}</td>
                  </tr>
                  <tr v-if="!report.courseRanking.length">
                    <td colspan="5" class="px-3 py-6 text-center text-muted text-xs">{{ t('admin.report.empty') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 学生排行 -->
          <div class="rounded-lg border border-default bg-default overflow-hidden">
            <div class="px-3 py-2 border-b border-default text-xs font-medium text-muted">
              {{ t('admin.report.table.topStudents') }}
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-xs text-muted">
                  <tr class="border-b border-default">
                    <th class="text-left px-3 py-2 font-medium w-12">{{ t('admin.report.table.rank') }}</th>
                    <th class="text-left px-3 py-2 font-medium">{{ t('admin.report.table.name') }}</th>
                    <th class="text-left px-3 py-2 font-medium">{{ t('admin.report.table.className') }}</th>
                    <th class="text-right px-3 py-2 font-medium">{{ t('admin.report.table.score') }}</th>
                    <th class="text-right px-3 py-2 font-medium">{{ t('admin.report.table.exp') }}</th>
                    <th class="text-right px-3 py-2 font-medium">{{ t('admin.report.table.coin') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in report.topStudents" :key="s.userId" class="border-b border-default last:border-0">
                    <td class="px-3 py-2 tabular-nums">
                      <UBadge :color="s.rank <= 3 ? 'warning' : 'neutral'" variant="subtle" size="sm">{{ s.rank }}</UBadge>
                    </td>
                    <td class="px-3 py-2 truncate max-w-40">{{ s.name }}</td>
                    <td class="px-3 py-2 truncate max-w-32 text-muted">{{ s.className }}</td>
                    <td class="px-3 py-2 text-right tabular-nums">{{ s.score }}</td>
                    <td class="px-3 py-2 text-right tabular-nums">{{ fmt(s.exp) }}</td>
                    <td class="px-3 py-2 text-right tabular-nums">{{ fmt(s.coin) }}</td>
                  </tr>
                  <tr v-if="!report.topStudents.length">
                    <td colspan="6" class="px-3 py-6 text-center text-muted text-xs">{{ t('admin.report.empty') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- ⑥ 内容质量 -->
      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-muted">{{ t('admin.report.section.quality') }}</h3>

        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div v-for="card in qualityCards" :key="card.key" class="p-4 rounded-lg border border-default bg-default">
            <div class="text-2xl font-semibold tabular-nums">{{ card.value }}</div>
            <div class="text-xs text-muted mt-1">{{ card.label }}</div>
          </div>
        </div>

        <div class="grid lg:grid-cols-2 gap-4">
          <div class="rounded-lg border border-default bg-default overflow-hidden">
            <div class="px-3 py-2 border-b border-default text-xs font-medium text-muted">
              {{ t('admin.report.quality.hardest') }}
            </div>
            <QuestionTable :rows="report.contentQuality.hardest" />
          </div>
          <div class="rounded-lg border border-default bg-default overflow-hidden">
            <div class="px-3 py-2 border-b border-default text-xs font-medium text-muted">
              {{ t('admin.report.quality.easiest') }}
            </div>
            <QuestionTable :rows="report.contentQuality.easiest" />
          </div>
        </div>
      </section>

      <!-- ⑦ 互动与游戏化 -->
      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-muted">{{ t('admin.report.section.interaction') }}</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <div v-for="card in interactionCards" :key="card.key" class="p-4 rounded-lg border border-default bg-default">
            <div class="text-2xl font-semibold tabular-nums">{{ fmt(card.value) }}</div>
            <div class="text-xs text-muted mt-1">{{ card.label }}</div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import QuestionTable from '../components/report/questionTable.vue'

definePageMeta({ layout: 'admin' })

const { t } = useI18n()

const { data: report, pending, refresh } = cRequest.use<any>('/api/admin/report', {
  default: () => null,
})

const fmt = (n: number | null | undefined) => Number(n ?? 0).toLocaleString()

const generatedAtText = computed(() => {
  const iso = report.value?.generatedAt
  if (!iso) return ''
  return String(iso).replace('T', ' ').slice(0, 16)
})

// ── KPI 卡片 ──
type Card = { key: string; value: number; label: string }

const scaleCards = computed<Card[]>(() => {
  const k = report.value?.kpi
  if (!k) return []
  return [
    { key: 'users', value: k.users.total, label: t('admin.report.kpi.users') },
    { key: 'students', value: k.users.students, label: t('admin.report.kpi.students') },
    { key: 'teachers', value: k.users.teachers, label: t('admin.report.kpi.teachers') },
    { key: 'classes', value: k.classes, label: t('admin.report.kpi.classes') },
    { key: 'courses', value: k.courses.total, label: t('admin.report.kpi.courses') },
    { key: 'chapters', value: k.contents.chapters, label: t('admin.report.kpi.chapters') },
    { key: 'categories', value: k.contents.categories, label: t('admin.report.kpi.categories') },
    { key: 'questions', value: k.contents.questions, label: t('admin.report.kpi.questions') },
    { key: 'homeworks', value: k.contents.homeworks, label: t('admin.report.kpi.homeworks') },
    { key: 'quizzes', value: k.contents.quizzes, label: t('admin.report.kpi.quizzes') },
    { key: 'races', value: k.contents.races, label: t('admin.report.kpi.races') },
    { key: 'comments', value: k.contents.comments, label: t('admin.report.kpi.comments') },
    { key: 'showcases', value: k.interaction.showcases, label: t('admin.report.kpi.showcases') },
    { key: 'peerReviews', value: k.contents.peerReviews, label: t('admin.report.kpi.peerReviews') },
    { key: 'announcements', value: k.contents.announcements, label: t('admin.report.kpi.announcements') },
    { key: 'enrollments', value: k.gamification.enrollments, label: t('admin.report.kpi.enrollments') },
    { key: 'newUsers7d', value: k.users.new7d, label: t('admin.report.kpi.newUsers7d') },
    { key: 'activeUsers30d', value: k.users.active30d, label: t('admin.report.kpi.activeUsers30d') },
  ]
})

const qualityCards = computed<Card[]>(() => {
  const q = report.value?.contentQuality
  if (!q) return []
  return [
    { key: 'unanswered', value: q.unansweredQuestions, label: t('admin.report.quality.unanswered') },
    { key: 'quizAvg', value: q.quiz.avgScore, label: t('admin.report.quality.quizAvg') },
    { key: 'quizStudents', value: q.quiz.students, label: t('admin.report.quality.quizStudents') },
    { key: 'quizSubmissions', value: q.quiz.submissions, label: t('admin.report.quality.quizSubmissions') },
    { key: 'hwAvg', value: q.homework.avgScore, label: t('admin.report.quality.hwAvg') },
    { key: 'hwSubmissions', value: q.homework.submissions, label: t('admin.report.quality.hwSubmissions') },
    { key: 'hwExcellent', value: q.homework.excellent, label: t('admin.report.quality.hwExcellent') },
    { key: 'pendingComments', value: q.comments.pending, label: t('admin.report.quality.pendingComments') },
    { key: 'commentReplies', value: q.comments.replies, label: t('admin.report.quality.commentReplies') },
    { key: 'commentLikes', value: q.comments.likes, label: t('admin.report.quality.commentLikes') },
  ]
})

const interactionCards = computed<Card[]>(() => {
  const k = report.value?.kpi
  if (!k) return []
  return [
    { key: 'exp', value: k.gamification.exp, label: t('admin.report.kpi.exp') },
    { key: 'coin', value: k.gamification.coin, label: t('admin.report.kpi.coin') },
    { key: 'medalsAwarded', value: k.gamification.medalsAwarded, label: t('admin.report.kpi.medalsAwarded') },
    { key: 'medals', value: k.gamification.medals, label: t('admin.report.kpi.medals') },
    { key: 'goods', value: k.gamification.goods, label: t('admin.report.kpi.goods') },
    { key: 'showcasesApproved', value: k.interaction.showcasesApproved, label: t('admin.report.kpi.showcasesApproved') },
    { key: 'showcasesPending', value: k.interaction.showcasesPending, label: t('admin.report.kpi.showcasesPending') },
    { key: 'showcaseLikes', value: k.interaction.showcaseLikes, label: t('admin.report.kpi.showcaseLikes') },
    { key: 'commentLikes', value: k.interaction.commentLikes, label: t('admin.report.kpi.commentLikes') },
    { key: 'commentReplies', value: k.interaction.commentReplies, label: t('admin.report.kpi.commentReplies') },
    { key: 'published', value: k.courses.published, label: t('admin.report.kpi.coursesPublished') },
    { key: 'active7d', value: k.users.active7d, label: t('admin.report.kpi.activeUsers7d') },
  ]
})

// ── 图表 ──
const AXIS_LABEL = { fontSize: 10 }

const userGrowthOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: report.value?.userGrowth?.map((r: any) => r.date) ?? [],
    axisLabel: AXIS_LABEL,
  },
  yAxis: { type: 'value', minInterval: 1 },
  series: [{
    type: 'line',
    smooth: true,
    areaStyle: {},
    name: t('admin.report.series.total'),
    data: report.value?.userGrowth?.map((r: any) => r.count) ?? [],
  }],
}))

const learningTrendOption = computed(() => {
  const rows: any[] = report.value?.learningTrend ?? []
  const mk = (key: string, label: string) => ({
    type: 'bar',
    stack: 'total',
    name: label,
    data: rows.map((r) => r[key] ?? 0),
  })
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 10 } },
    grid: { left: 8, right: 12, top: 32, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: rows.map((r) => r.date.slice(5)), axisLabel: AXIS_LABEL },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      mk('question', t('admin.report.series.question')),
      mk('homework', t('admin.report.series.homework')),
      mk('quiz', t('admin.report.series.quiz')),
    ],
  }
})

const roleOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, textStyle: { fontSize: 10 } },
  series: [{
    type: 'pie',
    radius: ['40%', '65%'],
    center: ['50%', '45%'],
    label: { fontSize: 10 },
    data: report.value?.roleDistribution ?? [],
  }],
}))

const bandCounts = (rows: any[] | undefined, bands: string[]) => {
  const map = new Map<string, number>((rows ?? []).map((r: any) => [String(r.band), Number(r.count) || 0]))
  return bands.map((b) => map.get(b) ?? 0)
}
const SCORE_BANDS = ['0-59', '60-69', '70-79', '80-89', '90-100']
const PROGRESS_BANDS = ['0%', '1-39%', '40-69%', '70-89%', '90-100%']

const scoreOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
  xAxis: { type: 'category', data: SCORE_BANDS, axisLabel: AXIS_LABEL },
  yAxis: { type: 'value', minInterval: 1 },
  series: [{
    type: 'bar',
    barMaxWidth: 40,
    data: bandCounts(report.value?.scoreDistribution, SCORE_BANDS),
  }],
}))

const progressOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
  xAxis: { type: 'category', data: PROGRESS_BANDS, axisLabel: AXIS_LABEL },
  yAxis: { type: 'value', minInterval: 1 },
  series: [{
    type: 'bar',
    barMaxWidth: 40,
    data: bandCounts(report.value?.progressDistribution, PROGRESS_BANDS),
  }],
}))

const abilityOption = computed(() => {
  const dims: any[] = report.value?.abilityRadar ?? []
  const max = Math.max(...dims.map((d) => Number(d.value) || 0), 10)
  const maxVal = Math.ceil((max * 1.2) / 10) * 10
  return {
    tooltip: {},
    radar: {
      radius: '62%',
      splitNumber: 4,
      indicator: dims.map((d) => ({ name: t(`admin.report.ability.${d.key}`), max: maxVal })),
      axisName: { fontSize: 10 },
    },
    series: [{
      type: 'radar',
      data: [{
        value: dims.map((d) => Number(d.value) || 0),
        name: t('admin.report.chart.abilityRadar'),
        areaStyle: { opacity: 0.2 },
        lineStyle: { width: 2 },
      }],
    }],
  }
})

const contentOption = computed(() => {
  const rows: any[] = report.value?.contentDistribution ?? []
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: rows.map((r) => t(`admin.report.kpi.${r.key}`)),
      axisLabel: { ...AXIS_LABEL, rotate: 30 },
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{ type: 'bar', barMaxWidth: 40, data: rows.map((r) => r.value) }],
  }
})
</script>
