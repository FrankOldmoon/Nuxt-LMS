<template>
  <div ref="sheetContainer" class="w-full h-full overflow-hidden" />
</template>

<script setup>
const props = defineProps({
  headers: { type: Array, default: () => [] },
  colWidths: { type: Object, default: () => ({}) },
  rowCount: { type: Number, default: 30 },
  active: { type: Boolean, default: true },
  showTools: { type: Boolean, default: true },
  showFooter: { type: Boolean, default: true },
  showContextMenu: { type: Boolean, default: true },
  initialData: { type: Object, default: null },
})

const emit = defineEmits(['change'])

const {
  sheetContainer,
  getRows,
  getCellData,
  setSortedRows,
  reset,
} = useUniverSheet(
  () => props.headers,
  () => props.colWidths,
  () => props.rowCount,
  () => props.active,
  () => props.showTools,
  () => props.showFooter,
  () => props.showContextMenu,
  () => props.initialData,
  () => emit('change'),
)

defineExpose({ getRows, getCellData, setSortedRows, reset })
</script>
