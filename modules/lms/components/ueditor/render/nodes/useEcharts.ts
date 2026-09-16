import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { calbaseConfigData, calbaseConfigOptions } from '../cal-service'
import { getECharts } from '../../../../../base/utils/getECharts'

const shortId = (length = 8) =>
  Math.random().toString(36).substring(2, length + 2)

export function useEcharts(props: any) {
  const attrs = computed(() => props.node.attrs || {})

  const containerRef = ref<any>(null)
  const chartRef = ref<any>(null)
  let chart: any = null
  const chartOption = ref<any>(null)

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

  const loadData = async () => {
    await nextTick()
    if (!chartRef.value) return

    const echarts = await getECharts()
    if (!echarts || !chartRef.value) return

    const { chartOptions, chartConfig, mode } = attrs.value
    if (chart !== null) {
      chart.dispose()
      chart = null
      chartOption.value = null
    }

    let finalOptions: any = null

    if (mode === 1) {
      if (chartConfig !== null) {
        const newData = calbaseConfigData(chartConfig.data)
        finalOptions = calbaseConfigOptions(newData, chartConfig.config, {})
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
    async (newAttrs: any, oldAttrs: any) => {
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

  return {
    containerRef,
    chartRef,
    chartOption,
    chartId,
    chartHeight,
    nodeStyle,
  }
}
