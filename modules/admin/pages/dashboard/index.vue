<template>
  <div class="space-y-4">
    <DashboardStatCards :stats="stats" />
    <LazyDashboardCharts :stats="stats" />
  </div>
</template>

<script setup lang="ts">
// SSR 友好拉取仪表盘统计；非 admin 时接口拒绝，data 保持 null
const { data: stats } = cRequest.use<any>(
  () => '/api/admin/stats',
  { default: () => null },
)
</script>
