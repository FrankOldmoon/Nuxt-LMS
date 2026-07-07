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
import { calbaseConfigData, calbaseConfigOptions } from '../../../render/cal-service'

const props = defineProps({
  node: { type: Object, required: true },
})

const CDN_URL = 'https://unpkg.com/@umoteam/editor-external@latest'

const shortId = (length = 8) =>
  Math.random().toString(36).substring(2, length + 2)

// ---- CDN 资源加载 ----
const loadScript = (url, id) =>
  new Promise((resolve) => {
    if (document.getElementById(id)) return resolve()
    const script = document.createElement('script')
    script.src = url
    script.id = id
    script.type = 'text/javascript'
    script.onload = resolve
    script.onerror = resolve
    document.head.appendChild(script)
  })

const attrs = computed(() => props.node.attrs || {})

const containerRef = ref(null)
const chartRef = ref(null)
let chart = null
const chartOption = ref(null)

// 生成唯一 id，避免多个图表冲突
const chartId = `chart-${attrs.value.id || shortId(6)}`

const chartHeight = computed(() => Number(attrs.value.height) || 200)

const nodeStyle = computed(() => {
  const { nodeAlign, margin } = attrs.value
  const marginTop =
    margin?.top && margin?.top !== '' ? `${margin.top}px` : undefined
  const marginBottom =
    margin?.bottom && margin?.bottom !== '' ? `${margin.bottom}px` : undefined
  return {
    'justify-content': nodeAlign,
    marginTop,
    marginBottom,
  }
})

const waitForECharts = () => {
  return new Promise((resolve) => {
    if (typeof echarts !== 'undefined') {
      resolve()
      return
    }
    let attempts = 0
    const maxAttempts = 40
    const checkECharts = () => {
      if (typeof echarts !== 'undefined') {
        resolve()
      } else if (attempts < maxAttempts) {
        attempts++
        setTimeout(checkECharts, 50)
      } else {
        resolve()
      }
    }
    checkECharts()
  })
}

const loadData = async () => {
  await nextTick()
  if (!chartRef.value) return

  await loadScript(
    `${CDN_URL}/libs/echarts/echarts.min.js`,
    'echarts-script',
  )
  await waitForECharts()

  if (typeof echarts === 'undefined' || !chartRef.value) return

  const { chartOptions, chartConfig, mode } = attrs.value
  if (chart !== null) {
    chart.dispose()
    chart = null
    chartOption.value = null
  }

  let finalOptions = null

  if (mode === 1) {
    if (chartConfig !== null) {
      const newData = calbaseConfigData(chartConfig.data)
      finalOptions = calbaseConfigOptions(
        newData,
        chartConfig.config,
        { cdnUrl: CDN_URL },
      )
    }
  } else if (chartOptions !== null) {
    finalOptions = chartOptions
  }

  if (finalOptions && Object.keys(finalOptions).length > 0) {
    chart = echarts.init(chartRef.value)
    chart.setOption(finalOptions)
    chartOption.value = finalOptions
  }
}

onMounted(async () => {
  await nextTick()
  await loadData()
})

watch(
  () => attrs.value,
  async (newAttrs, oldAttrs) => {
    if (newAttrs !== undefined && oldAttrs !== undefined && newAttrs !== oldAttrs) {
      let isLoad = false
      for (const attr1 in oldAttrs) {
        if (attr1 === 'height' || attr1 === 'width') continue
        if (oldAttrs[attr1] !== newAttrs[attr1]) {
          isLoad = true
          break
        }
      }
      if (isLoad) {
        await loadData()
      }
    }
  },
  { deep: true, immediate: false },
)

onBeforeUnmount(() => {
  chart?.dispose?.()
})
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
