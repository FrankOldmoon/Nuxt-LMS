import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { calbaseConfigData, calbaseConfigOptions } from '../cal-service'

const CDN_URL = 'https://unpkg.com/@umoteam/editor-external@latest'

const shortId = (length = 8) =>
  Math.random().toString(36).substring(2, length + 2)

// ---- CDN resourceLoad ----
const loadScript = (url: string, id: string) =>
  new Promise<void>((resolve) => {
    if (document.getElementById(id)) return resolve()
    const script = document.createElement('script')
    script.src = url
    script.id = id
    script.type = 'text/javascript'
    script.onload = () => resolve()
    script.onerror = () => resolve()
    document.head.appendChild(script)
  })

export function useEcharts(props: any) {
  const attrs = computed(() => props.node.attrs || {})

  const containerRef = ref<any>(null)
  const chartRef = ref<any>(null)
  let chart: any = null
  const chartOption = ref<any>(null)

  // Generateunique id，avoidManyitemsChartconflict
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
    return new Promise<void>((resolve) => {
      if (typeof (window as any).echarts !== 'undefined') {
        resolve()
        return
      }
      let attempts = 0
      const maxAttempts = 40
      const checkECharts = () => {
        if (typeof (window as any).echarts !== 'undefined') {
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

    const echartsGlobal = (window as any).echarts
    if (typeof echartsGlobal === 'undefined' || !chartRef.value) return

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
      chart = echartsGlobal.init(chartRef.value)
      chart.set option(finalOptions)
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
