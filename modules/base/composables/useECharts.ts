/**
 * ECharts 封装：本地 npm 加载 + 初始化 + 自适应 + 暴露方法
 */
import { getECharts } from '../utils/getECharts'

export function useECharts(
  option: () => any,
  theme: () => string | object,
  renderer: () => string,
  width: () => string | number,
  height: () => string | number,
  autoResize: () => boolean,
  loading: () => boolean,
  loadingOption: () => any,
  group: () => string,
  initOptions: () => any,
  notMerge: () => boolean,
  lazyUpdate: () => boolean,
  onReady: (chart: any) => void,
  onClick: (params: any) => void,
  onRendered: () => void,
) {
  const chartRef = ref<HTMLElement | null>(null)
  let chart: any = null
  let resizeObserver: ResizeObserver | null = null

  // ========== 尺寸处理 ==========
  function normalizeSize(val: string | number | null | undefined): string | undefined {
    if (val == null || val === '') return undefined
    if (typeof val === 'number') return `${val}px`
    return String(val)
  }

  const containerStyle = computed(() => ({
    width: normalizeSize(width()),
    height: normalizeSize(height()),
  }))

  // ========== 初始化 ==========
  async function initChart() {
    await nextTick()
    if (!chartRef.value) return

    const echarts = await getECharts()
    if (!echarts || !chartRef.value) return

    disposeChart()

    const initOpts = {
      renderer: renderer(),
      ...initOptions(),
    }

    const t = theme()
    chart = t
      ? echarts.init(chartRef.value, t, initOpts)
      : echarts.init(chartRef.value, null, initOpts)

    if (group()) chart.group = group()

    // 事件绑定
    chart.on('click', (params: any) => onClick(params))
    chart.on('rendered', () => onRendered())

    applyOption()
    applyLoading()

    if (autoResize()) setupResizeObserver()

    onReady(chart)
  }

  function applyOption() {
    if (!chart) return
    const opt = option()
    if (opt && Object.keys(opt).length > 0) {
      chart.setOption(opt, notMerge(), lazyUpdate())
    }
  }

  function applyLoading() {
    if (!chart) return
    if (loading()) {
      chart.showLoading('default', loadingOption() || {
        text: 'loading',
        color: '#2563eb',
        textColor: '#6b7280',
        maskColor: 'rgba(255, 255, 255, 0.8)',
        zlevel: 0,
      })
    } else {
      chart.hideLoading()
    }
  }

  // ========== 自适应 ==========
  function setupResizeObserver() {
    if (typeof ResizeObserver === 'undefined' || !chartRef.value) return
    resizeObserver = new ResizeObserver(() => {
      chart?.resize()
    })
    resizeObserver.observe(chartRef.value)
  }

  // ========== 销毁 ==========
  function disposeChart() {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    if (chart) {
      chart.dispose()
      chart = null
    }
  }

  // ========== 暴露方法 ==========
  function resize() {
    chart?.resize()
  }

  function getInstance() {
    return chart
  }

  function setOption(opt: any, nm?: boolean, lu?: boolean) {
    chart?.setOption(opt, nm ?? notMerge(), lu ?? lazyUpdate())
  }

  function dispatchAction(payload: any) {
    chart?.dispatchAction(payload)
  }

  // ========== 侦听器 ==========
  watch(option, () => {
    applyOption()
  }, { deep: true })

  watch(loading, () => {
    applyLoading()
  })

  watch(group, (val) => {
    if (chart && val) chart.group = val
  })

  watch(theme, () => {
    initChart()
  })

  watch(renderer, () => {
    initChart()
  })

  watch([width, height], () => {
    nextTick(() => chart?.resize())
  })

  // ========== 生命周期 ==========
  onMounted(() => {
    initChart()
  })

  onBeforeUnmount(() => {
    disposeChart()
  })

  return {
    chartRef,
    containerStyle,
    resize,
    getInstance,
    setOption,
    dispatchAction,
  }
}
