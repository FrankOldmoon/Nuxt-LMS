<template>
    <UModal v-model:open="open" :ui="{ content: 'max-w-5xl' }">
        <template #content>
            <div class="p-4">
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <h3 class="text-base font-semibold">{{ t('classSelector.exportTitle') }}</h3>
                        <p class="text-xs text-muted mt-0.5">{{ t('classSelector.exportHint') }}</p>
                    </div>
                    <div class="flex gap-2">
                        <UButton icon="i-lucide-download" color="primary" size="xs"
                            :loading="exporting"
                            :label="t('classSelector.downloadXlsx')" @click="downloadXlsx" />
                        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm"
                            @click="close" />
                    </div>
                </div>

                <div class="h-[420px] border border-default rounded overflow-hidden">
                    <Sheet v-if="open && initialData" ref="sheetRef" :headers="headers"
                        :initial-data="initialData"
                        :row-count="Math.max(30, students.length + 5)"
                        :show-tools="false" />
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { students, extraColumns, hideNumber } = useClassUsersTableContext()

const open = defineModel<boolean>('open', { default: false })
const sheetRef = ref<any>(null)
const exporting = ref(false)

function close() {
    open.value = false
}

// 尝试获取成绩上下文（用于计算 grade/total 等派生列）
// 非成绩弹窗上下文下注入为 null，grade/total 列将留空
let computeGrade: ((row: any) => { letter: string; finalScore: number }) | null = null
try {
    const gradesCtx = useGradesContext()
    computeGrade = gradesCtx.computeGrade
} catch {
    // 不在成绩弹窗上下文中
}

// 构建导出列：标准列（尊重 hide 标志）+ 额外列
const exportColumns = computed(() => {
    const cols: { key: string, label: string }[] = []
    if (!hideNumber()) {
        cols.push({ key: 'number', label: t('classSelector.colNumber') })
    }
    cols.push(
        { key: 'name', label: t('classSelector.colName') },
        { key: 'preferName', label: t('classSelector.colPreferName') },
        { key: 'rollNumber', label: t('classSelector.colRollNumber') },
    )
    for (const col of (extraColumns() || [])) {
        const label = typeof col.header === 'string' ? col.header : col.id
        cols.push({ key: col.id, label })
    }
    return cols
})

const headers = computed(() => exportColumns.value.map(c => c.label))

// 获取单元格值：grade/total 为计算列，其余直接取字段
function getCellValue(s: any, key: string): any {
    if (key === 'grade' && computeGrade) {
        return computeGrade(s).letter
    }
    if (key === 'total' && computeGrade) {
        return Number(computeGrade(s).finalScore.toFixed(1))
    }
    return s[key]
}

// 构建 initialData：每行一个 { colIdx: { v: value } } 对象，行号从 1 开始（0 是表头）
const initialData = computed(() => {
    const data: Record<number, Record<number, { v: any }>> = {}
    students.value.forEach((s: any, rIdx) => {
        const rowData: Record<number, { v: any }> = {}
        exportColumns.value.forEach((col, cIdx) => {
            const v = getCellValue(s, col.key)
            if (v !== null && v !== undefined && v !== '') {
                rowData[cIdx] = { v: typeof v === 'object' ? JSON.stringify(v) : v }
            }
        })
        if (Object.keys(rowData).length) {
            data[rIdx + 1] = rowData
        }
    })
    return data
})

// ========== SheetJS (xlsx) CDN 加载 ==========
function loadXlsxScript(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        if ((window as any).XLSX) { resolve(true); return }
        if (document.querySelector(`script[src="${url}"]`)) {
            const check = setInterval(() => {
                if ((window as any).XLSX) {
                    clearInterval(check)
                    resolve(true)
                }
            }, 100)
            setTimeout(() => { clearInterval(check); resolve(false) }, 5000)
            return
        }
        const script = document.createElement('script')
        script.src = url
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.head.appendChild(script)
    })
}

async function downloadXlsx() {
    exporting.value = true
    try {
        // 本地资源（public/vendor/xlsx，由 scripts/copy-vendor-assets.mjs 拷贝）。
        // 注意：原先引用的 CDN 地址 xlsx@0.20.3 已 404（SheetJS 后续版本不再发布到 npm/jsdelivr），
        // 这里改用本地 npm 包 xlsx@0.18.5，同时修掉导出 Excel 一直失败的问题。
        const XLSX_URL = '/vendor/xlsx/xlsx.full.min.js'
        const ok = await loadXlsxScript(XLSX_URL)
        const XLSX = (window as any).XLSX
        if (!ok || !XLSX) {
            // 加载失败，回退到 CSV
            downloadCsv()
            return
        }

        // 优先从 Sheet 读取数据（用户可能已编辑），否则用原始 students 数据
        let rowsData: any[][] = []
        if (sheetRef.value) {
            const raw = sheetRef.value.getRows() as any[][]
            rowsData = raw.filter((r) => r && r.some((v) => v !== '' && v != null))
        }
        if (rowsData.length === 0) {
            rowsData = students.value.map((s: any) =>
                exportColumns.value.map(c => {
                    const v = getCellValue(s, c.key)
                    return v ?? ''
                }),
            )
        }

        // 构建 AOA（数组数组）并导出 xlsx
        const aoa = [headers.value, ...rowsData]
        const ws = XLSX.utils.aoa_to_sheet(aoa)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Students')
        XLSX.writeFile(wb, 'students.xlsx')
    } finally {
        exporting.value = false
    }
}

// ========== CSV fallback ==========
function escapeCsv(val: any): string {
    if (val == null) return ''
    const s = typeof val === 'object' ? JSON.stringify(val) : String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
    }
    return s
}

function downloadCsv() {
    let csvRows: string[][] = []
    if (sheetRef.value) {
        const raw = sheetRef.value.getRows() as any[][]
        csvRows = raw.filter((r) => r && r.some((v) => v !== '' && v != null)).map((r) => r.map(String))
    }
    if (csvRows.length === 0) {
        csvRows = students.value.map((s: any) =>
            exportColumns.value.map(c => escapeCsv(getCellValue(s, c.key))),
        )
    }
    const csv = [
        headers.value.map(escapeCsv).join(','),
        ...csvRows.map(r => r.map(escapeCsv).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students.csv`
    a.click()
    URL.revokeObjectURL(url)
}
</script>
