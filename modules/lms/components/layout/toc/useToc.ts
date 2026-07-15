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

    // lms PublicConfiguration：chapterPage.enableFullscreen controlPlayButtonvisibility
    const { chapterPage: chapterPageCfg } = useLmsPublicConfig()

    const lockId = computed(() => chapterId.value ? `chapters_${chapterId.value}` : undefined)

    // ── LoginStatus ──
    const isLoggedIn = computed(() => !!user.value)

    // ── lms ChapterLearning Progress（only mode=lms whenmakeuse） ──
    // setup stageCall useChapterTask()：inject  setup MiddleEffective，
    // mobile slideover Middle TOC no provide child treeInside，fallbackto sharedChapterTaskCtx
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

    // ── Fullscreen playbackmode：TitleNavigation ──
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

    // Fullscreen playback：KeykeyboardLeftRightsidetoKey = UpDownNavigationButton（← UponeitemsTitle / → DownoneitemsTitle）
    function onPlayKeydown(e: KeyboardEvent) {
        if (!playFullscreen.value) return
        // Input Box/Text Area/canEditareaInsidenoInterceptsidetoKey，avoidShadowaffectFormEdit
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

    // enter/Exit FullscreenPlaywhenMount/UnmountKeykeyboard listener
    watch(playFullscreen, (v) => {
        if (!import.meta.client) return
        if (v) window.addEventListener('keydown', onPlayKeydown)
        else window.removeEventListener('keydown', onPlayKeydown)
    })

    onBeforeUnmount(() => {
        navObserver?.disconnect()
        if (import.meta.client) window.removeEventListener('keydown', onPlayKeydown)
    })

    // ── ContentEditPermissions ──
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
            await handle save(chapterContent.value)

            toast.add({ title: t('layout.save success'), color: 'success' })
            editModalOpen.value = false

            await nextTick()
            notifyContentSaved()
        } catch (e: any) {
            toast.add({ title: e.message || t('layout.saveFailed'), color: 'error' })
        } finally {
            saving.value = false
        }
    }

    // ── PPT Export ──
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

    // ── PDF Export（browserPrint → landscape A4 PDF）──
    // nomakeuse html2pdf.js（its html2canvas someText/pseudo-elementUpthrow "Invalid code point NaN"）
    // clone insteadChapter ContenttoHide iframe，CopyStyletable，canvas convert img preserve ECharts，CallbrowserPrint
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

            // cloneNode noCopy canvas bitmap：willoriginal canvas convert img Writeclone nodePoint，preserve ECharts etc.Chart
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
                    // canvas cross-originImagetainted（tainted）：SkiptheChart
                }
            })

            // CopyCurrentDocumentAllStyletable，ensurePrintContentStyleandPageconsistent
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
                    // <base> letcloneContentMiddlerelativeRight/root relativeRightImage URL（if /uploads/...）by current PageSurfaceAnalysis
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

                // PrintRightdialogCloseBackClean iframe + reset loading
                const finish = () => {
                    exportingPdf.value = false
                    cleanup()
                }
                w.addEventListener('afterprint', finish, { once: true })

                w.focus()
                // etc.Image/FontLoadcompletethenTriggerPrint
                setTimeout(() => {
                    try {
                        w.print()
                        toast.add({ title: t('chapter.exportPdfSuccess'), color: 'success' })
                    } catch (e: any) {
                        toast.add({ title: e?.message || t('chapter.exportPdfFailed'), color: 'error' })
                        finish()
                    }
                    // fallbackBottom：Partialbrowser afterprint noTrigger，1 minBackreset loading andClean iframe
                    setTimeout(() => { exportingPdf.value = false; cleanup() }, 60000)
                }, 600)
            }

            // bind first on load thenInsert DOM，avoid about:blank load Eventrace condition
            document.body.appendChild(iframe)
        } catch (e: any) {
            toast.add({ title: e.message || t('chapter.exportPdfFailed'), color: 'error' })
            exportingPdf.value = false
        }
    }

    // aggregate loading + DownpullMenuitems
    const downloading = computed(() => exportingPpt.value || exportingPdf.value)

    const downloadItems = computed(() => [
        [
            { label: t('chapter.exportPpt'), icon: 'i-lucide-presentation', on select: handleExportPpt },
            { label: t('chapter.exportPdf'), icon: 'i-lucide-file-text', on select: handleExportPdf },
        ],
    ])

    return {
        chapterBtnsConfig, chapterPageCfg, playFullscreen, togglePlay,
        exportingPpt, handleExportPpt, isLoggedIn, chapterTask,
        totalHeadings, allDone, doneHeadings, progressPercent,
        tocLinks, flatHeadings, currentHeadingIndex, goToHeading,
        canEditContent, editModalOpen, chapterContent, handleSave,
        lockId, ueditorRef, saving, handle saveClick, chapterId,
        exportingPdf, handleExportPdf, downloading, downloadItems,
    }
}
