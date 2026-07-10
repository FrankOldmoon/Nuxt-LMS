<template>
  <div>
    <h2 class="text-lg font-medium mb-3 capitalize">{{ table }}</h2>
    <TableManager :table-name="table" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const table = computed(() => String(route.params.table))
</script>
