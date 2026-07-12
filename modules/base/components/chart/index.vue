<template>
  <div ref="chartRef" :style="containerStyle" class="chart-container" />
</template>

<script setup>
const props = defineProps({
  option: { type: Object, default: () => ({}) },
  theme: { type: [String, Object], default: '' },
  renderer: { type: String, default: 'canvas' },
  width: { type: [String, Number], default: '100%' },
  height: { type: [String, Number], default: 300 },
  autoResize: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
  loadingOption: { type: Object, default: null },
  group: { type: String, default: '' },
  initOptions: { type: Object, default: () => ({}) },
  notMerge: { type: Boolean, default: false },
  lazyUpdate: { type: Boolean, default: false },
  cdnUrl: { type: String, default: 'https://unpkg.com/@umoteam/editor-external@latest/libs/echarts/echarts.min.js' },
})

const emit = defineEmits(['ready', 'click', 'rendered'])

const {
  chartRef,
  containerStyle,
  resize,
  getInstance,
  setOption,
  dispatchAction,
} = useECharts(
  () => props.option,
  () => props.theme,
  () => props.renderer,
  () => props.width,
  () => props.height,
  () => props.autoResize,
  () => props.loading,
  () => props.loadingOption,
  () => props.group,
  () => props.initOptions,
  () => props.notMerge,
  () => props.lazyUpdate,
  () => props.cdnUrl,
  (chart) => emit('ready', chart),
  (params) => emit('click', params),
  () => emit('rendered'),
)

defineExpose({ resize, getInstance, setOption, dispatchAction })
</script>

<style scoped>
.chart-container {
  min-height: 500px;
}
</style>
