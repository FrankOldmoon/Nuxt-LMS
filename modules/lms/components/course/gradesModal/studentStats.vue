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
  </div>
</template>

<script setup lang="ts">
const { statCards, radarOption } = useGradesContext()
</script>
