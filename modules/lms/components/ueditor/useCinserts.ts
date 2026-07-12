import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

export interface CinsertsProps {
    editor: { type: Object, default: null }
}

export function useCinserts(props: any, emit: any) {
    const { t } = useI18n()
    // race / chatroom 依赖班级概念，已迁移至 lms 模块；仅 lms 启用时显示对应插入项
    const { moduleLms } = useRuntimeConfig().public

    const markdownOpen = ref(false)
    const htmlOpen = ref(false)
    const pickerOpen = ref(false)
    const pickerType = ref('questions')

    // 下拉菜单：Markdown | HTML | 快速插入空白 | 选择现有
    const allItems = computed(() => {
        const base = [
            { label: t('ueditor.markdown.title'), icon: 'i-mdi:language-markdown', onSelect: () => { markdownOpen.value = true } },
            { label: t('ueditor.html.title'), icon: 'i-mdi:language-html5', onSelect: () => { htmlOpen.value = true } },
            { type: 'separator' },
            // 每种类型两个按钮：+ 直接插入空白 | 类型图标 选择已有
            { label: t('courseData.questionLabel'), icon: 'i-lucide-plus', onSelect: () => insertVueNode('question') },
            { label: t('courseData.search') + ' ' + t('courseData.questionLabel'), icon: 'i-lucide-circle-help', onSelect: () => openPicker('questions') },
            { label: t('homework.label'), icon: 'i-lucide-plus', onSelect: () => insertVueNode('homework') },
            { label: t('courseData.search') + ' ' + t('homework.label'), icon: 'i-lucide-book-open', onSelect: () => openPicker('homeworks') },
            { label: t('comment.label'), icon: 'i-lucide-plus', onSelect: () => insertVueNode('comment') },
            { label: t('courseData.search') + ' ' + t('comment.label'), icon: 'i-lucide-message-circle', onSelect: () => openPicker('comments') },
            { label: t('quiz.label'), icon: 'i-lucide-plus', onSelect: () => insertVueNode('quiz') },
            { label: t('courseData.search') + ' ' + t('quiz.label'), icon: 'i-lucide-clipboard-list', onSelect: () => openPicker('quizzes') },
        ]
        if (moduleLms) {
            base.push(
                { label: t('race.label'), icon: 'i-lucide-plus', onSelect: () => insertVueNode('race') },
                { label: t('courseData.search') + ' ' + t('race.label'), icon: 'i-lucide-zap', onSelect: () => openPicker('races') },
            )
        }
        base.push({ type: 'separator' })
        base.push(
            { label: t('ueditor.insertInput'), icon: 'i-lucide-text-cursor-input', onSelect: () => insertQuestionNode('inputs') },
            { label: t('ueditor.insertSelect'), icon: 'i-lucide-chevron-down-square', onSelect: () => insertQuestionNode('select') },
            { label: t('HTML'), icon: 'i-mdi:language-html5', onSelect: () => insertTypedSheet('html') },
            { label: t('ueditor.insertPdf'), icon: 'i-lucide-file-text', onSelect: () => insertTypedSheet('pdf') },
            { label: t('ueditor.insertOffice'), icon: 'i-lucide-file-spreadsheet', onSelect: () => insertTypedSheet('office') },
            { label: t('ueditor.insertMindmap'), icon: 'i-lucide-network', onSelect: () => insertVueNode('mindmap') },
            { label: t('ueditor.insertAichat'), icon: 'i-lucide-bot', onSelect: () => insertAichat() },
            { label: t('ueditor.insertAigenerator'), icon: 'i-lucide-sparkles', onSelect: () => insertAigenerator() },
            { label: t('ueditor.insertCondition'), icon: 'i-lucide-shield-check', onSelect: () => insertTypedSheet('condition') },
            { label: t('ueditor.insertTabs'), icon: 'i-lucide-panel-top', onSelect: () => insertTabs() },
            { label: t('ueditor.insertVfiles'), icon: 'i-lucide-folder-tree', onSelect: () => insertVfiles() },
        )
        if (moduleLms) {
            base.push({ label: t('ueditor.insertChatroom'), icon: 'i-lucide-message-square-text', onSelect: () => insertChatroom() })
        }
        base.push(
            { label: t('ueditor.insertTimer'), icon: 'i-lucide-timer', onSelect: () => insertTimer() },
        )
        return base
    })

    function openPicker(type: string) {
        pickerType.value = type
        pickerOpen.value = true
    }

    function quickInsert(type: string) {
        pickerType.value = type
        onPickerConfirm([0])
    }

    // 插入自定义节点（inputs / select 等）
    function insertQuestionNode(type: string) {
        const editor = props.editor?.useEditor()
        if (!editor) return
        editor.chain().focus().insertContent({
            type: type,
            attrs: { content: '' },
        }).run()
    }

    // 插入通用 vue 节点
    function insertVueNode(type: string) {
        const editor = props.editor?.useEditor()
        if (!editor) return
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: '', type },
        }).run()
    }

    // 插入 sheet 节点（带默认配置）
    function insertSheet() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const defaultConfig = JSON.stringify({
            height: 300,
        })
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: defaultConfig, type: 'sheet' },
        }).run()
    }

    // 插入带空配置的 vue 节点（pdf 等）
    function insertTypedSheet(type: string) {
        const editor = props.editor?.useEditor()
        if (!editor) return
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: "", type },
        }).run()
    }

    // 插入 aichat 节点（带默认配置）
    function insertAichat() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const defaultConfig = JSON.stringify({
            mode: 'api',
            title: '',
            preset: '',
            opening: '',
            apiKey: '',
            apiUrl: '',
            model: 'glm-4.5-air',
            thinking: false,
        })
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: defaultConfig, type: 'aichat' },
        }).run()
    }

    // 插入 aigenerator 节点（AI 无限出题，带默认配置）
    function insertAigenerator() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const defaultConfig = JSON.stringify({
            title: '',
            questionType: 'single',
            referenceText: '',
            point: 1,
            model: 'glm-4.5-air',
            thinking: false,
        })
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: defaultConfig, type: 'aigenerator' },
        }).run()
    }

    // 插入 tabs 节点（带默认配置）
    function insertTabs() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const defaultConfig = JSON.stringify({
            tabs: [
                { label: 'Tab 1', content: '' },
                { label: 'Tab 2', content: '' },
            ],
        })
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: defaultConfig, type: 'tabs' },
        }).run()
    }

    // 插入 vfiles 虚拟文件夹节点（带默认配置）
    function insertVfiles() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const defaultConfig = JSON.stringify({
            items: [
                { id: 'f1', label: 'Folder 1', type: 'folder', children: [
                    { id: 'file1', label: 'file1.md', type: 'file', content: '' },
                ]},
            ],
        })
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: defaultConfig, type: 'vfiles' },
        }).run()
    }

    // 插入班级聊天室节点（纯前端 ws，无 cid）
    function insertChatroom() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: '', type: 'chatroom' },
        }).run()
    }

    // 插入计时器节点
    function insertTimer() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const defaultConfig = JSON.stringify({ minutes: 1, seconds: 0 })
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: defaultConfig, type: 'timer' },
        }).run()
    }

    // 监听输入规则触发的选择器事件
    function onPickerEvent(e: any) {
        openPicker(e.detail.type)
    }

    onMounted(() => {
        window.addEventListener('ueditor-open-picker', onPickerEvent)
    })

    onBeforeUnmount(() => {
        window.removeEventListener('ueditor-open-picker', onPickerEvent)
    })

    // 确认后逐个插入独立节点
    function onPickerConfirm(cids: any[]) {
        const editor = props.editor?.useEditor()
        if (!editor || !cids.length) return
        const singular = pickerType.value.replace(/s$/, '')
        const nodes = cids.map(cid => ({
            type: 'vue',
            attrs: { content: String(cid), type: singular },
        }))
        editor.chain().focus().insertContent(nodes).run()
    }

    return {
        markdownOpen,
        htmlOpen,
        pickerOpen,
        pickerType,
        allItems,
        onPickerConfirm,
    }
}
