/**
 * ECharts wrapper: CDN loading + initialization + auto-resize + exposed methods
 */
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
  cdnUrl: () => string,
  onReady: (chart: any) => void,
  onClick: (params: any) => void,
  onRendered: () => void,
) {
  const chartRef = ref<HTMLElement | null>(null)
  let chart: any = null
  let resizeObserver: ResizeObserver | null = null

  const CDN_SCRIPT_ID = 'chart-echarts-script'

  // ========== Size handling ==========
  function normalizeSize(val: string | number | null | undefined): string | undefined {
    if (val == null || val === '') return undefined
    if (typeof val === 'number') return `${val}px`
    return String(val)
  }

  const containerStyle = computed(() => ({
    width: normalizeSize(width()),
    height: normalizeSize(height()),
  }))

  // ========== CDN loading ==========
  function loadScript(url: string, id: string): Promise<boolean> {
    return new Promise((resolve) => {
      if ((window as any).echarts || document.getElementById(id)) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.src = url
      script.id = id
      script.type = 'text/javascript'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.head.appendChild(script)
    })
  }

  function waitForECharts(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof (window as any).echarts !== 'undefined') {
        resolve(true)
        return
      }
      let attempts = 0
      const maxAttempts = 40
      const check = () => {
        if (typeof (window as any).echarts !== 'undefined') {
          resolve(true)
        } else if (attempts < maxAttempts) {
          attempts++
          setTimeout(check, 50)
        } else {
          resolve(false)
        }
      }
      check()
    })
  }

  // ========== Initialization ==========
  async function initChart() {
    await nextTick()
    if (!chartRef.value) return

    const ok = await loadScript(cdnUrl(), CDN_SCRIPT_ID)
    if (!ok) {
      console.error('[Chart] ECharts CDN load failed')
      return
    }
    await waitForECharts()

    if (typeof (window as any).echarts === 'undefined' || !chartRef.value) return

    disposeChart()

    const initOpts = {
      renderer: renderer(),
      ...initOptions(),
    }

    const t = theme()
    chart = t
      ? (window as any).echarts.init(chartRef.value, t, initOpts)
      : (window as any).echarts.init(chartRef.value, null, initOpts)

    if (group()) chart.group = group()

    // Event binding
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

  // ========== Auto-resize ==========
  function setupResizeObserver() {
    if (typeof ResizeObserver === 'undefined' || !chartRef.value) return
    resizeObserver = new ResizeObserver(() => {
      chart?.resize()
    })
    resizeObserver.observe(chartRef.value)
  }

  // ========== Dispose ==========
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

  // ========== Exposed methods ==========
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

  // ========== Watchers ==========
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

  // ========== Lifecycle ==========
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
