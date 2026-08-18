import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'

export function useToc() {
    const { hasRole, user } = useAuth()
    const { isCourseEditor } = useAuthLms()
    const toast = useToast()
    const { t } = useI18n()
    const ueditorRef = ref()
    const editModalOpen = ref(false)
    const saving = ref(false)
    const exportingPpt = ref(false)
    const exportingPdf = ref(false)

    const { tocLinks, chapterContent, notifyContentSaved, chapterBtnsConfig } = useLayoutState()
    const { chapterId, courseId } = useLmsContext()
    const { playFullscreen, togglePlay } = useChapterBtns()

    // lms 公开配置：chapterPage.enableFullscreen 控制播放按钮显隐
    const { chapterPage: chapterPageCfg } = useLmsPublicConfig()

    const lockId = computed(() => chapterId.value ? `chapters_${chapterId.value}` : undefined)

    // ── 登录状态 ──
    const isLoggedIn = computed(() => !!user.value)

    // ── lms 章节学习进度（仅在 mode=lms 时使用） ──
    // setup 阶段调用 useChapterTask()：inject 在 setup 中生效，
    // 移动端 slideover 中的 TOC 不在 provide 子树内，回退到 sharedChapterTaskCtx
    const chapterTask = useChapterTask()

    const totalHeadings = computed(() => chapterTask?.taskMap.value.headings?.length ?? 0)
    const doneHeadings = computed(() => {
        if (!chapterTask) return 0
        return chapterTask.taskMap.value.headings.filter((h: any) => chapterTask.taskStatus.value[h.id]).length
    })
    const progressPercent = computed(() => {
        if (totalHeadings.value === 0) return 0
        return Math.round((doneHeadings.value / totalHeadings.value) * 100)
    })
    const allDone = computed(() => totalHeadings.value > 0 && doneHeadings.value === totalHeadings.value)

    // ── 全屏播放模式：标题导航 ──
    const flatHeadings = computed(() => {
        const result: { id: string; text: string }[] = []
        function walk(links: any[]) {
            for (const link of links) {
                result.push({ id: link.id, text: link.text })
                if (link.children) walk(link.children)
            }
        }
        walk(tocLinks.value)
        return result
    })

    const currentHeadingIndex = ref(0)
    let navObserver: IntersectionObserver | null = null

    function setupNavObserver() {
        navObserver?.disconnect()
        navObserver = null
        if (!playFullscreen.value || !flatHeadings.value.length) return

        navObserver = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
                if (visible.length) {
                    const id = visible[0]?.target?.id
                    const idx = flatHeadings.value.findIndex((h) => h.id === id)
                    if (idx >= 0) currentHeadingIndex.value = idx
                }
            },
            { rootMargin: '-80px 0px -70% 0px', threshold: [0, 1] },
        )

        nextTick(() => {
            flatHeadings.value.forEach(({ id }) => {
                const el = document.getElementById(id)
                if (el) navObserver?.observe(el)
            })
        })
    }

    function goToHeading(direction: number) {
        const next = currentHeadingIndex.value + direction
        if (next < 0 || next >= flatHeadings.value.length) return
        const heading = flatHeadings.value[next]
        if (!heading) return
        const el = document.getElementById(heading.id)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            currentHeadingIndex.value = next
        }
    }

    // 全屏播放：键盘左右方向键 = 上下导航按钮（← 上一个标题 / → 下一个标题）
    function onPlayKeydown(e: KeyboardEvent) {
        if (!playFullscreen.value) return
        // 在输入框/文本域/可编辑区域内不拦截方向键，避免影响表单编辑
        const target = e.target as HTMLElement | null
        if (target) {
            const tag = target.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault()
            goToHeading(-1)
        } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            goToHeading(1)
        }
    }

    watch([playFullscreen, tocLinks], () => {
        if (playFullscreen.value) {
            nextTick(() => setupNavObserver())
        } else {
            navObserver?.disconnect()
            navObserver = null
        }
    })

    // 进入/退出全屏播放时挂载/卸载键盘监听
    watch(playFullscreen, (v) => {
        if (!import.meta.client) return
        if (v) window.addEventListener('keydown', onPlayKeydown)
        else window.removeEventListener('keydown', onPlayKeydown)
    })

    onBeforeUnmount(() => {
        navObserver?.disconnect()
        if (import.meta.client) window.removeEventListener('keydown', onPlayKeydown)
    })

    // ── 内容编辑权限 ──
    const canEditContent = computed(() => {
        if (hasRole('admin')) return true
        return isCourseEditor(courseId.value)
    })

    async function handleSave(content: Record<string, any>) {
        const json = content?.json ?? content
        await cRequest(`/api/chapters/update`, {
            method: 'POST',
            body: { id: chapterId.value, content: json },
        })
        return 1
    }

    async function handleSaveClick() {
        saving.value = true
        try {
            await handleSave(chapterContent.value)

            toast.add({ title: t('layout.saveSuccess'), color: 'success' })
            editModalOpen.value = false

            await nextTick()
            notifyContentSaved()
        } catch (e: any) {
            toast.add({ title: e.message || t('layout.saveFailed'), color: 'error' })
        } finally {
            saving.value = false
        }
    }

    // ── PPT 导出 ──
    async function handleExportPpt() {
        if (!chapterContent.value) return
        exportingPpt.value = true
        try {
            const title = tocLinks.value[0]?.text || 'Chapter'
            const { exportChapterToPpt } = await import('../../../utils/exportPpt')
            await exportChapterToPpt(chapterContent.value, title, courseId.value)
            toast.add({ title: t('chapter.exportPptSuccess'), color: 'success' })
        } catch (e: any) {
            toast.add({ title: e.message || t('chapter.exportPptFailed'), color: 'error' })
        } finally {
            exportingPpt.value = false
        }
    }

    // ── PDF 导出（浏览器打印 → 横屏 A4 PDF）──
    // 不使用 html2pdf.js（其 html2canvas 在某些文本/伪元素上抛 "Invalid code point NaN"）
    // 改为克隆章节内容到隐藏 iframe，复制样式表，canvas 转 img 保留 ECharts，调用浏览器打印
    async function handleExportPdf() {
        const source = document.querySelector('.umo-editor-render.render') as HTMLElement | null
        if (!source) {
            toast.add({ title: t('chapter.exportPdfFailed'), color: 'error' })
            return
        }
        exportingPdf.value = true
        try {
            const title = tocLinks.value[0]?.text || 'Chapter'
            const safeName = title.replace(/[\\/:*?"<>|]/g, '_')

            // cloneNode 不复制 canvas 位图：将原 canvas 转为 img 写入克隆节点，保留 ECharts 等图表
            const clone = source.cloneNode(true) as HTMLElement
            const origCanvases = Array.from(source.querySelectorAll('canvas'))
            const cloneCanvases = Array.from(clone.querySelectorAll('canvas'))
            origCanvases.forEach((c, i) => {
                const cc = cloneCanvases[i]
                if (!cc) return
                try {
                    const img = document.createElement('img')
                    img.src = c.toDataURL('image/png')
                    img.style.maxWidth = '100%'
                    img.style.height = 'auto'
                    if (c.offsetWidth) img.style.width = c.offsetWidth + 'px'
                    cc.replaceWith(img)
                } catch {
                    // canvas 被跨域图片污染（tainted）：跳过该图表
                }
            })

            // 复制当前文档所有样式表，确保打印内容样式与页面一致
            const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                .map((n) => n.outerHTML).join('\n')

            const iframe = document.createElement('iframe')
            iframe.style.cssText = 'position:fixed;left:-99999px;top:0;width:0;height:0;border:0;'

            const cleanup = () => {
                try { document.body.removeChild(iframe) } catch { /* noop */ }
            }

            iframe.onload = () => {
                const w = iframe.contentWindow
                if (!w) { cleanup(); exportingPdf.value = false; return }
                const idoc = w.document
                idoc.open()
                idoc.write(
                    `<!DOCTYPE html><html><head><meta charset="utf-8">`
                    // <base> 让克隆内容中的相对/根相对图片 URL（如 /uploads/...）按当前页面解析
                    + `<base href="${window.location.href}">`
                    + `<title>${safeName}</title>${styles}\n`
                    + '<style>'
                    + '@page { size: A4 landscape; margin: 1cm; }'
                    + 'html, body { margin: 0; padding: 0; background: #fff; }'
                    + '.umo-editor-render { width: 100% !important; min-height: auto !important; }'
                    + '</style>'
                    + `</head><body>${clone.outerHTML}</body></html>`,
                )
                idoc.close()

                // 打印对话框关闭后清理 iframe + 复位 loading
                const finish = () => {
                    exportingPdf.value = false
                    cleanup()
                }
                w.addEventListener('afterprint', finish, { once: true })

                w.focus()
                // 等图片/字体加载完再触发打印
                setTimeout(() => {
                    try {
                        w.print()
                        toast.add({ title: t('chapter.exportPdfSuccess'), color: 'success' })
                    } catch (e: any) {
                        toast.add({ title: e?.message || t('chapter.exportPdfFailed'), color: 'error' })
                        finish()
                    }
                    // 兜底：部分浏览器 afterprint 不触发，1 分钟后复位 loading 并清理 iframe
                    setTimeout(() => { exportingPdf.value = false; cleanup() }, 60000)
                }, 600)
            }

            // 先绑定 onload 再插入 DOM，避免 about:blank load 事件竞态
            document.body.appendChild(iframe)
        } catch (e: any) {
            toast.add({ title: e.message || t('chapter.exportPdfFailed'), color: 'error' })
            exportingPdf.value = false
        }
    }

    // ── JSON 导出（章节内容 JSON 文件）──
    const exportingJson = ref(false)
    async function handleExportJson() {
        if (!chapterContent.value) return
        exportingJson.value = true
        try {
            const title = tocLinks.value[0]?.text || 'Chapter'
            const safeName = title.replace(/[\\/:*?"<>|]/g, '_')
            // chapterContent 可能是 { json, html } 结构，也可能是纯 JSON
            const json = (chapterContent.value as any)?.json ?? chapterContent.value
            const text = JSON.stringify(json, null, 2)
            const blob = new Blob([text], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${safeName}.json`
            a.click()
            URL.revokeObjectURL(url)
            toast.add({ title: t('chapter.exportJsonSuccess'), color: 'success' })
        } catch (e: any) {
            toast.add({ title: e?.message || t('chapter.exportJsonFailed'), color: 'error' })
        } finally {
            exportingJson.value = false
        }
    }

    // 聚合 loading + 下拉菜单项
    const downloading = computed(() => exportingPpt.value || exportingPdf.value || exportingJson.value)

    const downloadItems = computed(() => [
        [
            { label: t('chapter.exportPpt'), icon: 'i-lucide-presentation', onSelect: handleExportPpt },
            { label: t('chapter.exportPdf'), icon: 'i-lucide-file-text', onSelect: handleExportPdf },
            { label: t('chapter.exportJson'), icon: 'i-lucide-braces', onSelect: handleExportJson },
        ],
    ])

    return {
        chapterBtnsConfig, chapterPageCfg, playFullscreen, togglePlay,
        exportingPpt, handleExportPpt, isLoggedIn, chapterTask,
        totalHeadings, allDone, doneHeadings, progressPercent,
        tocLinks, flatHeadings, currentHeadingIndex, goToHeading,
        canEditContent, editModalOpen, chapterContent, handleSave,
        lockId, ueditorRef, saving, handleSaveClick, chapterId,
        exportingPdf, handleExportPdf, exportingJson, handleExportJson,
        downloading, downloadItems,
    }
}
