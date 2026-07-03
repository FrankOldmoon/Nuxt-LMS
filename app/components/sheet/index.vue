<template>
    <div ref="sheetContainer" class="w-full h-full overflow-hidden" />
</template>

<script setup>
const props = defineProps({
    headers: { type: Array, default: () => [] },
    colWidths: { type: Object, default: () => ({}) },
    rowCount: { type: Number, default: 30 },
    active: { type: Boolean, default: true },
    showHeader: { type: Boolean, default: true },
    showFooter: { type: Boolean, default: true },
    showContextMenu: { type: Boolean, default: true },
})

const sheetContainer = ref(null)
const toast = useToast()

let univerAPI = null
let univerDispose = null

// ========== CDN 加载 ==========
function loadCss(url) {
    return new Promise((resolve) => {
        if (document.querySelector(`link[href="${url}"]`)) { resolve(true); return }
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = url
        link.onload = () => resolve(true)
        link.onerror = () => resolve(false)
        document.head.appendChild(link)
    })
}

function loadScript(url) {
    return new Promise((resolve) => {
        if (document.querySelector(`script[src="${url}"]`)) { resolve(true); return }
        const script = document.createElement('script')
        script.src = url
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.head.appendChild(script)
    })
}

// Univer CDN 资源
const UNIVER_CDN = {
    css: 'https://unpkg.com/@univerjs/preset-sheets-core/lib/index.css',
    scripts: [
        'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
        'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
        'https://unpkg.com/rxjs/dist/bundles/rxjs.umd.min.js',
        'https://unpkg.com/echarts@5.6.0/dist/echarts.min.js',
        'https://unpkg.com/@univerjs/presets/lib/umd/index.js',
        'https://unpkg.com/@univerjs/preset-sheets-core/lib/umd/index.js',
    ],
    locale: 'https://unpkg.com/@univerjs/preset-sheets-core/lib/umd/locales/zh-CN.js',
}

// ========== 销毁 Univer 实例 ==========
function destroyUniver() {
    if (univerDispose) {
        try { univerDispose() } catch (_) { /* noop */ }
        univerDispose = null
        univerAPI = null
    }
}

// ========== 初始化 Univer ==========
async function initSheet() {
    if (!sheetContainer.value) return

    // 加载 CSS
    await loadCss(UNIVER_CDN.css)

    // 按顺序加载必需脚本（存在依赖关系）
    for (const url of UNIVER_CDN.scripts) {
        const ok = await loadScript(url)
        if (!ok) {
            toast.add({ title: 'Univer load failed', color: 'error' })
            return
        }
    }

    // 尝试加载中文语言包（失败不阻塞初始化）
    await loadScript(UNIVER_CDN.locale)

    const { createUniver } = window.UniverPresets
    const { LocaleType, mergeLocales } = window.UniverCore
    const { UniverSheetsCorePreset } = window.UniverPresetSheetsCore

    if (!createUniver || !UniverSheetsCorePreset) {
        toast.add({ title: 'Univer not ready', color: 'error' })
        return
    }

    // 销毁已有实例
    destroyUniver()

    // 构建表头行 cellData
    const headerRow = {}
    props.headers.forEach((h, c) => {
        headerRow[c] = { v: h, s: { bl: 1, cl: { rgb: '#2563EB' } } }
    })

    // 构建列宽数据
    const columnData = {}
    Object.entries(props.colWidths).forEach(([k, w]) => {
        columnData[Number(k)] = { w }
    })

    // 合并中文语言包
    const zhCN = window.UniverPresetSheetsCoreZhCN
    const locales = zhCN
        ? { [LocaleType.ZH_CN]: mergeLocales(zhCN) }
        : {}

    // 初始化 Univer
    const { univerAPI: api, dispose } = createUniver({
        locale: LocaleType.ZH_CN,
        locales,
        presets: [
            UniverSheetsCorePreset({
                container: sheetContainer.value,
                header: props.showHeader,
                footer: props.showFooter,
                contextMenu: props.showContextMenu,
            }),
        ],
    })

    univerAPI = api
    univerDispose = dispose

    // 创建工作簿（表头行 + 预留空行）
    univerAPI.createWorkbook({
        id: 'univer-sheet',
        name: 'Sheet',
        sheets: {
            sheet1: {
                id: 'sheet1',
                name: 'Sheet1',
                rowCount: props.rowCount,
                columnCount: props.headers.length,
                cellData: { 0: headerRow },
                columnData,
            },
        },
    })
}

// ========== 读取所有数据行（跳过表头） ==========
function getRows() {
    if (!univerAPI) return []

    const fWorkbook = univerAPI.getActiveWorkbook()
    if (!fWorkbook) return []

    const fWorksheet = fWorkbook.getActiveSheet()
    if (!fWorksheet) return []

    const snapshot = fWorksheet.getSheet().getSnapshot()
    const cellData = snapshot.cellData || {}

    const rows = []
    const maxRow = Math.max(props.rowCount, ...Object.keys(cellData).map(Number))
    for (let r = 1; r <= maxRow; r++) {
        const row = cellData[r]
        if (!row) continue
        const values = props.headers.map((_, c) => {
            const cell = row[c]
            return cell ? String(cell.v ?? '').trim() : ''
        })
        if (values.every(v => !v)) continue
        rows.push(values)
    }
    return rows
}

// ========== 重置（重新初始化空表格） ==========
async function reset() {
    await initSheet()
}

// 暴露方法给父组件
defineExpose({ getRows, reset })

// ========== 生命周期 ==========
watch(() => props.active, (val) => {
    if (val) {
        nextTick(() => initSheet())
    } else {
        destroyUniver()
    }
}, { immediate: true })

onBeforeUnmount(() => {
    destroyUniver()
})
</script>
