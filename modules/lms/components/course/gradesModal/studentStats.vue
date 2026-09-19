<template>
  <div class="mt-6 space-y-4">
    <h4 class="text-sm font-semibold text-muted">{{ $t('coursePanel.learningStats') }}</h4>
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div v-for="s in statCards" :key="s.label"
        class="border border-default rounded-lg p-3 text-center">
        <div class="text-2xl font-bold text-primary">{{ s.value }}</div>
        <div class="text-xs text-muted mt-1">{{ s.label }}</div>
      </div>
    </div>

    <h4 class="text-sm font-semibold text-muted pt-2">{{ $t('coursePanel.ability') }}</h4>
    <ClientOnly>
      <Chart :option="radarOption" height="320" />
    </ClientOnly>

    <!-- 知识能力画像：按题目/阅读/作业/评论/练习等内容标签聚合的掌握度 -->
    <div class="flex items-center justify-between pt-2">
      <h4 class="text-sm font-semibold text-muted">{{ $t('coursePanel.knowledgeProfile') }}</h4>
      <span v-if="kpHasProfile" class="text-xs text-muted">
        {{ $t('coursePanel.kpOverall') }}
        <span class="font-semibold text-primary">{{ kpOverall }}%</span>
      </span>
    </div>
    <ClientOnly>
      <div v-if="!kpHasProfile" class="text-xs text-muted py-6 text-center border border-dashed border-default rounded-lg">
        {{ $t('coursePanel.kpEmpty') }}
      </div>
      <div v-else class="space-y-4">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <div class="text-xs text-muted mb-1">{{ $t('coursePanel.kpOverview') }}</div>
            <Chart :option="kpRadarOption" height="300" />
          </div>
          <div>
            <div class="text-xs text-muted mb-1">{{ $t('coursePanel.kpTags') }}</div>
            <Chart v-if="hasBarChart" :option="kpBarOption" :height="kpBarHeight" />
            <div v-else class="text-xs text-muted py-6 text-center">{{ $t('coursePanel.kpNoTags') }}</div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <div v-if="kpStrengths.length" class="flex items-center gap-1.5 flex-wrap">
            <span class="text-muted">{{ $t('coursePanel.kpStrengths') }}</span>
            <UBadge v-for="tag in kpStrengths" :key="tag" :label="tag" color="success" variant="subtle" size="sm" />
          </div>
          <div v-if="kpWeaknesses.length" class="flex items-center gap-1.5 flex-wrap">
            <span class="text-muted">{{ $t('coursePanel.kpWeaknesses') }}</span>
            <UBadge v-for="tag in kpWeaknesses" :key="tag" :label="tag" color="warning" variant="subtle" size="sm" />
          </div>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const ctx = useGradesContext()
const { statCards, radarOption } = ctx
// 知识能力画像字段：老上下文（如单测桩）可能未提供，做兜底避免渲染报错
const kpHasProfile = ctx.kpHasProfile ?? ref(false)
const kpOverall = ctx.kpOverall ?? ref(0)
const kpRadarOption = ctx.kpRadarOption ?? ref({})
const kpBarOption = ctx.kpBarOption ?? ref({})
const kpBarHeight = ctx.kpBarHeight ?? ref(240)
const kpStrengths = ctx.kpStrengths ?? ref<string[]>([])
const kpWeaknesses = ctx.kpWeaknesses ?? ref<string[]>([])
const hasBarChart = computed(() => Object.keys(kpBarOption.value || {}).length > 0)
</script>
