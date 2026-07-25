/**
 * Univer 在线表格：CDN 加载 + 初始化 + 数据读写
 */
export function useUniverSheet(
  headers: () => any[],
  colWidths: () => Record<string, number>,
  rowCount: () => number,
  active: () => boolean,
  showTools: () => boolean,
  showFooter: () => boolean,
  showContextMenu: () => boolean,
  initialData: () => any,
  onChange: () => void,
) {
  const sheetContainer = ref<HTMLElement | null>(null)
  const toast = useToast()

  let univerAPI: any = null
  let univerDispose: any = null

  // ========== CDN 加载 ==========
  function loadCss(url: string): Promise<boolean> {
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

  function loadScript(url: string): Promise<boolean> {
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

    const { createUniver } = (window as any).UniverPresets
    const { LocaleType, mergeLocales } = (window as any).UniverCore
    const { UniverSheetsCorePreset } = (window as any).UniverPresetSheetsCore

    if (!createUniver || !UniverSheetsCorePreset) {
      toast.add({ title: 'Univer not ready', color: 'error' })
      return
    }

    destroyUniver()

    // 构建 cellData：第 0 行始终放表头，第 1 行起放数据
    const cellData: Record<number, any> = {}
    const hdrs = headers()
    if (hdrs.length) {
      const headerRow: Record<number, any> = {}
      hdrs.forEach((text, c) => { headerRow[c] = { v: text } })
      cellData[0] = headerRow
    }
    // 填入初始数据行（有表头时跳过第 0 行，无表头时从第 0 行开始）
    const init = initialData()
    if (init) {
      for (const rowKey in init) {
        const r = Number(rowKey)
        if (r === 0 && hdrs.length) continue
        cellData[r] = init[rowKey]
      }
    }

    // 构建列宽数据
    const columnData: Record<number, any> = {}
    Object.entries(colWidths()).forEach(([k, w]) => {
      columnData[Number(k)] = { w }
    })

    // 合并中文语言包
    const zhCN = (window as any).UniverPresetSheetsCoreZhCN
    const locales = zhCN
      ? { [LocaleType.ZH_CN]: mergeLocales(zhCN) }
      : {}

    const { univerAPI: api, dispose } = createUniver({
      locale: LocaleType.ZH_CN,
      locales,
      presets: [
        UniverSheetsCorePreset({
          container: sheetContainer.value,
          header: showTools(),
          footer: showFooter(),
          contextMenu: showContextMenu(),
        }),
      ],
    })

    univerAPI = api
    univerDispose = dispose

    // 创建工作簿（表头行 + 初始数据）
    univerAPI.createWorkbook({
      id: 'univer-sheet',
      name: 'Sheet',
      sheets: {
        sheet1: {
          id: 'sheet1',
          name: 'Sheet1',
          rowCount: rowCount(),
          columnCount: hdrs.length || 10,
          cellData,
          columnData,
        },
      },
    })

    // 监听单元格数据变化
    // Univer SDK 没有 WorkbookValueChanged 事件，使用 CommandExecuted 替代
    // CommandExecuted 在所有命令执行后触发（包括单元格编辑、格式修改等）
    // 配合外层 500ms 防抖，不会频繁保存
    try {
      const EventEnum = univerAPI.Event
      if (EventEnum?.CommandExecuted) {
        univerAPI.addEvent(EventEnum.CommandExecuted, () => { onChange() })
      }
    } catch (_) { /* noop */ }
  }

  // ========== 读取所有数据行（跳过表头） ==========
  function getRows(): string[][] {
    if (!univerAPI) return []
    const fWorkbook = univerAPI.getActiveWorkbook()
    if (!fWorkbook) return []
    const fWorksheet = fWorkbook.getActiveSheet()
    if (!fWorksheet) return []

    const snapshot = fWorksheet.getSheet().getSnapshot()
    const cellData = snapshot.cellData || {}
    const hdrs = headers()

    const rows: string[][] = []
    const maxRow = Math.max(rowCount(), ...Object.keys(cellData).map(Number))
    for (let r = 1; r <= maxRow; r++) {
      const row = cellData[r]
      if (!row) continue
      const values = hdrs.map((_, c) => {
        const cell = row[c]
        return cell ? String(cell.v ?? '').trim() : ''
      })
      if (values.every(v => !v)) continue
      rows.push(values)
    }
    return rows
  }

  // ========== 导出当前 cellData ==========
  function getCellData(): Record<number, any> | null {
    if (!univerAPI) return null
    const fWorkbook = univerAPI.getActiveWorkbook()
    if (!fWorkbook) return null
    const fWorksheet = fWorkbook.getActiveSheet()
    if (!fWorksheet) return null

    const snapshot = fWorksheet.getSheet().getSnapshot()
    const cellData = snapshot.cellData || {}
    const result: Record<number, any> = {}
    for (const rowKey in cellData) {
      const r = Number(rowKey)
      result[r] = cellData[rowKey]
    }
    return result
  }

  // ========== 重置（重新初始化空表格） ==========
  async function reset() {
    await initSheet()
  }

  // ========== 用排序/筛选后的行数据覆盖 sheet 数据行 ==========
  function setSortedRows(rows: (string | undefined | null)[][]) {
    if (!univerAPI) return
    const fWorkbook = univerAPI.getActiveWorkbook()
    if (!fWorkbook) return
    const fWorksheet = fWorkbook.getActiveSheet()
    if (!fWorksheet) return

    const snapshot = fWorksheet.getSheet().getSnapshot()
    const oldCellData = snapshot.cellData || {}
    const headerRow = oldCellData[0] || {}
    const columnData = snapshot.columnData || {}

    // 构建新的 cellData（保留第 0 行表头 + 排序后的数据行）
    const newCellData: Record<number, any> = { 0: headerRow }
    rows.forEach((row, idx) => {
      const r = idx + 1
      const rowData: Record<number, any> = {}
      row.forEach((val, c) => {
        if (val !== '' && val !== undefined && val !== null) {
          rowData[c] = { v: val }
        }
      })
      if (Object.keys(rowData).length) {
        newCellData[r] = rowData
      }
    })

    const unitId = fWorkbook.getId()
    univerAPI.disposeUnit(unitId)

    univerAPI.createWorkbook({
      id: 'univer-sheet',
      name: 'Sheet',
      sheets: {
        sheet1: {
          id: 'sheet1',
          name: 'Sheet1',
          rowCount: rowCount(),
          columnCount: headers().length,
          cellData: newCellData,
          columnData,
        },
      },
    })
  }

  // ========== 生命周期 ==========
  watch(active, (val) => {
    if (val) {
      nextTick(() => initSheet())
    } else {
      destroyUniver()
    }
  }, { immediate: true })

  // 渲染端：initialData 变化时重新初始化
  watch(initialData, (val, oldVal) => {
    if (val && JSON.stringify(val) !== JSON.stringify(oldVal)) {
      nextTick(() => initSheet())
    }
  })

  onBeforeUnmount(() => {
    destroyUniver()
  })

  return {
    sheetContainer,
    getRows,
    getCellData,
    setSortedRows,
    reset,
  }
}
