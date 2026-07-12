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

    return {
        chapterBtnsConfig, chapterPageCfg, playFullscreen, togglePlay,
        exportingPpt, handleExportPpt, isLoggedIn, chapterTask,
        totalHeadings, allDone, doneHeadings, progressPercent,
        tocLinks, flatHeadings, currentHeadingIndex, goToHeading,
        canEditContent, editModalOpen, chapterContent, handleSave,
        lockId, ueditorRef, saving, handleSaveClick, chapterId,
    }
}
