<template>
  <div
    ref="chartRef"
    :style="containerStyle"
    class="chart-container"
  />
</template>

<script setup>
const props = defineProps({
  // ECharts 配置项（核心）
  option: { type: Object, default: () => ({}) },
  // 主题：字符串名称或主题对象
  theme: { type: [String, Object], default: '' },
  // 渲染模式
  renderer: { type: String, default: 'canvas' }, // 'canvas' | 'svg'
  // 尺寸
  width: { type: [String, Number], default: '100%' },
  height: { type: [String, Number], default: 300 },
  // 自适应父容器（width/height 设为 100% 时生效）
  autoResize: { type: Boolean, default: true },
  // 是否显示加载动画
  loading: { type: Boolean, default: false },
  loadingOption: { type: Object, default: null },
  // 分组（用于联动）
  group: { type: String, default: '' },
  // 初始化附加选项（如 devicePixelRatio, locale 等）
  initOptions: { type: Object, default: () => ({}) },
  // 是否在 option 变化时合并（false 则 notMerge）
  notMerge: { type: Boolean, default: false },
  // 是否懒更新
  lazyUpdate: { type: Boolean, default: false },
  // CDN 地址（可覆盖）
  cdnUrl: { type: String, default: 'https://unpkg.com/@umoteam/editor-external@latest/libs/echarts/echarts.min.js' },
})

const emit = defineEmits(['ready', 'click', 'rendered'])

const chartRef = ref(null)
let chart = null
let resizeObserver = null

const CDN_SCRIPT_ID = 'chart-echarts-script'

// ========== 尺寸处理 ==========
function normalizeSize(val) {
  if (val == null || val === '') return undefined
  if (typeof val === 'number') return `${val}px`
  return String(val)
}

const containerStyle = computed(() => ({
  width: normalizeSize(props.width),
  height: normalizeSize(props.height),
}))

// ========== CDN 加载 ==========
function loadScript(url, id) {
  return new Promise((resolve) => {
    if (window.echarts || document.getElementById(id)) {
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

function waitForECharts() {
  return new Promise((resolve) => {
    if (typeof window.echarts !== 'undefined') {
      resolve(true)
      return
    }
    let attempts = 0
    const maxAttempts = 40
    const check = () => {
      if (typeof window.echarts !== 'undefined') {
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

// ========== 初始化 ==========
async function initChart() {
  await nextTick()
  if (!chartRef.value) return

  const ok = await loadScript(props.cdnUrl, CDN_SCRIPT_ID)
  if (!ok) {
    console.error('[Chart] ECharts CDN 加载失败')
    return
  }
  await waitForECharts()

  if (typeof window.echarts === 'undefined' || !chartRef.value) return

  // 销毁旧实例
  disposeChart()

  const initOpts = {
    renderer: props.renderer,
    ...props.initOptions,
  }

  chart = props.theme
    ? window.echarts.init(chartRef.value, props.theme, initOpts)
    : window.echarts.init(chartRef.value, null, initOpts)

  if (props.group) chart.group = props.group

  // 事件绑定
  chart.on('click', (params) => emit('click', params))
  chart.on('rendered', () => emit('rendered'))

  // 设置数据
  applyOption()
  applyLoading()

  // 自适应监听
  if (props.autoResize) setupResizeObserver()

  emit('ready', chart)
}

function applyOption() {
  if (!chart) return
  if (props.option && Object.keys(props.option).length > 0) {
    chart.setOption(props.option, props.notMerge, props.lazyUpdate)
  }
}

function applyLoading() {
  if (!chart) return
  if (props.loading) {
    chart.showLoading('default', props.loadingOption || {
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
  if (typeof ResizeObserver === 'undefined') return
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

function setOption(option, notMerge, lazyUpdate) {
  chart?.setOption(option, notMerge ?? props.notMerge, lazyUpdate ?? props.lazyUpdate)
}

function dispatchAction(payload) {
  chart?.dispatchAction(payload)
}

defineExpose({ resize, getInstance, setOption, dispatchAction })

// ========== 侦听器 ==========
watch(() => props.option, () => {
  applyOption()
}, { deep: true })

watch(() => props.loading, () => {
  applyLoading()
})

watch(() => props.group, (val) => {
  if (chart && val) chart.group = val
})

watch(() => props.theme, () => {
  initChart()
})

watch(() => props.renderer, () => {
  initChart()
})

watch(() => [props.width, props.height], () => {
  nextTick(() => chart?.resize())
})

// ========== 生命周期 ==========
onMounted(() => {
  initChart()
})

onBeforeUnmount(() => {
  disposeChart()
})
</script>

<style scoped>
.chart-container {
  min-height: 0;
}
</style>
