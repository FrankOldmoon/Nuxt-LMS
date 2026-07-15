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

// tryGetScoreUpDowntext（useincalculate grade/total etc.derivecolumns）
// nonScoreModalUpDowntextDowninject null，grade/total columnswillkeepEmpty
let computeGrade: ((row: any) => { letter: string; finalScore: number }) | null = null
try {
    const gradesCtx = useGradesContext()
    computeGrade = gradesCtx.computeGrade
} catch {
    // noScoreModalUpDowntextMiddle
}

// BuildExportcolumns：standardcolumns（respectHeavy hide flag）+ extraOutsidecolumns
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

// GetcellValue：grade/total calculatecolumns，itsrest directly takeField
function getCellValue(s: any, key: string): any {
    if (key === 'grade' && computeGrade) {
        return computeGrade(s).letter
    }
    if (key === 'total' && computeGrade) {
        return Number(computeGrade(s).finalScore.toFixed(1))
    }
    return s[key]
}

// Build initialData：eachlinesoneitems { colIdx: { v: value } } Object，Line Numberfrom 1 Start（0 YesTable Header）
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

// ========== SheetJS (xlsx) CDN Load ==========
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
        const XLSX_CDN = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
        const ok = await loadXlsxScript(XLSX_CDN)
        const XLSX = (window as any).XLSX
        if (!ok || !XLSX) {
            // CDN Failed to load，fallbackto CSV
            downloadCsv()
            return
        }

        // priorityfrom Sheet ReadData（UsercancanalreadyEdit），ElseuseoriginalStart students Data
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

        // Build AOA（ArrayArray）andExport xlsx
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
