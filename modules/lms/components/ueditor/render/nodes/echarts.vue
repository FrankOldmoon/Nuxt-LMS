<template>
  <div
    ref="containerRef"
    class="umo-node-view"
    :style="nodeStyle"
  >
    <div
      class="umo-node-container umo-node-echarts umo-select-outline"
      :data-options="chartOption ? JSON.stringify(chartOption) : null"
    >
      <div
        ref="chartRef"
        class="umo-node-echarts-body"
        :style="{ width: '100%', height: `${chartHeight}px` }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { useEcharts } from './useEcharts'

const props = defineProps({
  node: { type: Object, required: true },
})

const {
  containerRef,
  chartRef,
  chartOption,
  chartHeight,
  nodeStyle,
} = useEcharts(props)
</script>

<style lang="less">
.umo-node-view {
  display: flex;
  position: relative;
  max-height: 100%;
  scroll-margin-top: 20px;
  scroll-margin-bottom: 20px;

  .umo-node-echarts {
    max-width: 100%;
    width: 100%;
    position: relative;

    .umo-node-echarts-body {
      display: block;
      min-height: 200px;
      width: 100%;
      background-color: #fff;
      outline: solid 1px var(--umo-content-node-border);
    }
  }
}
</style>
