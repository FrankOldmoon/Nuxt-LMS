<template>
    <div class="office-render">
        <!-- 纯浏览器端渲染（vue-office）：docx / xlsx·xls·csv / pptx -->
        <ClientOnly>
            <div v-if="loading" class="office-state">{{ t('ueditor.officeLoading') }}</div>
            <div v-else-if="error" class="office-state office-error">{{ error }}</div>
            <component
                :is="viewer"
                v-else-if="viewer && buffer"
                :src="buffer"
            />
        </ClientOnly>

        <!-- 不支持 vue-office 的旧格式（doc/ppt/rtf 等）：回退 MS 在线嵌入 -->
        <div v-if="embedUrl" class="office-render-preview" :style="{ height: `${config.height || 600}px` }">
            <iframe :src="embedUrl" class="office-iframe" frameborder="0" allowfullscreen />
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    node: Object,
})
const { t } = useI18n()

const parseConfig = () => {
    try {
        const raw = props.node?.attrs?.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
}
const config = computed(parseConfig)

// vue-office 支持的文件类型
const OFFICE_VIEWER_MAP = {
    docx: { pkg: 'docx', export: 'VueOfficeDocx' },
    xlsx: { pkg: 'excel', export: 'VueOfficeExcel' },
    xls: { pkg: 'excel', export: 'VueOfficeExcel' },
    csv: { pkg: 'excel', export: 'VueOfficeExcel' },
    pptx: { pkg: 'pptx', export: 'VueOfficePptx' },
}
// 可用 MS 在线嵌入兜底的旧 office 格式
const MS_EMBED_EXT = ['doc', 'dot', 'rtf', 'wps', 'ppt', 'dps', 'pot']

const fileName = computed(() => {
    const n = config.value.name
    if (n) return n
    const url = config.value.url || ''
    const seg = url.split(/[?#]/, 1)[0]
    return seg.split('/').pop() || url
})
const ext = computed(() => (fileName.value.split('.').pop() || '').toLowerCase())

const viewer = shallowRef(null)
const buffer = ref(null)
const loading = ref(false)
const error = ref('')

// 是否可走 vue-office
const vueOfficeKey = computed(() => OFFICE_VIEWER_MAP[ext.value] || null)

// 按类型动态加载对应 vue-office 组件（客户端执行，静态路径便于打包）
async function loadViewer(pkg) {
    const pick = (m, key) => m[key] || (m.default && m.default[key]) || m.default || m
    if (pkg === 'docx') return pick(await import('@vue-office/docx'), 'VueOfficeDocx')
    if (pkg === 'excel') return pick(await import('@vue-office/excel'), 'VueOfficeExcel')
    return pick(await import('@vue-office/pptx'), 'VueOfficePptx')
}

async function load() {
    const url = config.value.url
    viewer.value = null
    buffer.value = null
    error.value = ''
    if (!url) return

    const key = vueOfficeKey.value
    if (!key) {
        // blob: 是浏览器本地临时地址，MS 在线预览服务无法访问，直接提示不支持
        if (/^blob:/i.test(url)) error.value = t('ueditor.officeLocalUnsupported')
        return // 交给 MS 嵌入分支（或什么都不做）
    }

    loading.value = true
    try {
        const resp = await fetch(url)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const ab = await resp.arrayBuffer()
        buffer.value = ab
        viewer.value = await loadViewer(key.pkg)
    } catch (e) {
        error.value = `${t('ueditor.officeFailToLoad')}: ${e?.message || String(e)}`
        buffer.value = null
    } finally {
        loading.value = false
    }
}

const embedUrl = computed(() => {
    // 仅当 vue-office 不支持、但属于旧 office 格式时使用 MS 在线嵌入
    if (vueOfficeKey.value || !config.value.url) return ''
    // 本地 blob 文件无法被 MS 在线预览服务访问
    if (/^blob:/i.test(config.value.url)) return ''
    if (MS_EMBED_EXT.includes(ext.value)) {
        const url = config.value.url
        return `https://view.officeapps.live.com/embed/?url=${encodeURIComponent(encodeURI(url))}`
    }
    return ''
})

onMounted(load)
watch(parseConfig, () => { load() }, { deep: true })
</script>

<style scoped>
.office-render {
    margin: 12px 0;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    min-height: 200px;
}
.office-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: #9ca3af;
    font-size: 14px;
}
.office-error {
    color: #ef4444;
}
.office-render-preview {
    width: 100%;
}
.office-iframe {
    width: 100%;
    height: 100%;
    border: none;
    min-height: 400px;
}
</style>