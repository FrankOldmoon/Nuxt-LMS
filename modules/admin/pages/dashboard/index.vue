<template>
  <div class="space-y-4">
    <DashboardStatCards :stats="stats" />
    <DashboardCharts :stats="stats" />
  </div>
</template>

<script setup lang="ts">
// SSR-friendly dashboard stats fetch; API rejects for non-admin, data stays null
const { data: stats } = cRequest.use<any>(
  () => '/api/admin/stats',
  { default: () => null },
)
</script>
