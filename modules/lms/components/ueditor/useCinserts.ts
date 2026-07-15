import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

export interface CinsertsProps {
    editor: { type: Object, default: null }
}

export function useCinserts(props: any, emit: any) {
    const { t } = useI18n()
    // race / chatroom dependencyClassconcept，alreadymigrateto lms Module；only lms EnablewhenShowRightshouldInsertitems
    const { moduleLms } = useRuntimeConfig().public

    const markdownOpen = ref(false)
    const htmlOpen = ref(false)
    const pickerOpen = ref(false)
    const pickerType = ref('questions')

    // DownpullMenu：Markdown | HTML | FastspeedInsertEmptyWhite | SelectcurrentHas
    const allItems = computed(() => {
        const base = [
            { label: t('ueditor.markdown.title'), icon: 'i-mdi:language-markdown', on select: () => { markdownOpen.value = true } },
            { label: t('ueditor.html.title'), icon: 'i-mdi:language-html5', on select: () => { htmlOpen.value = true } },
            { type: 'separator' },
            // eachTypetwoitemsButton：+ directlyInsertEmptyWhite | TypeIcon SelectalreadyHas
            { label: t('courseData.questionLabel'), icon: 'i-lucide-plus', on select: () => insertVueNode('question') },
            { label: t('courseData.search') + ' ' + t('courseData.questionLabel'), icon: 'i-lucide-circle-help', on select: () => openPicker('questions') },
            { label: t('homework.label'), icon: 'i-lucide-plus', on select: () => insertVueNode('homework') },
            { label: t('courseData.search') + ' ' + t('homework.label'), icon: 'i-lucide-book-open', on select: () => openPicker('homeworks') },
            { label: t('comment.label'), icon: 'i-lucide-plus', on select: () => insertVueNode('comment') },
            { label: t('courseData.search') + ' ' + t('comment.label'), icon: 'i-lucide-message-circle', on select: () => openPicker('comments') },
            { label: t('quiz.label'), icon: 'i-lucide-plus', on select: () => insertVueNode('quiz') },
            { label: t('courseData.search') + ' ' + t('quiz.label'), icon: 'i-lucide-clipboard-list', on select: () => openPicker('quizzes') },
        ]
        if (moduleLms) {
            base.push(
                { label: t('race.label'), icon: 'i-lucide-plus', on select: () => insertVueNode('race') },
                { label: t('courseData.search') + ' ' + t('race.label'), icon: 'i-lucide-zap', on select: () => openPicker('races') },
            )
        }
        base.push({ type: 'separator' })
        base.push(
            { label: t('ueditor.insertInput'), icon: 'i-lucide-text-cursor-input', on select: () => insertQuestion Node('inputs') },
            { label: t('ueditor.insertSelect'), icon: 'i-lucide-chevron-down-square', on select: () => insertQuestion Node('select') },
            { label: t('HTML'), icon: 'i-mdi:language-html5', on select: () => insertTypedSheet('html') },
            { label: t('ueditor.insertPdf'), icon: 'i-lucide-file-text', on select: () => insertTypedSheet('pdf') },
            { label: t('ueditor.insertOffice'), icon: 'i-lucide-file-spreadsheet', on select: () => insertTypedSheet('office') },
            { label: t('ueditor.insertMindmap'), icon: 'i-lucide-network', on select: () => insertVueNode('mindmap') },
            { label: t('ueditor.insertAichat'), icon: 'i-lucide-bot', on select: () => insertAichat() },
            { label: t('ueditor.insertAigenerator'), icon: 'i-lucide-sparkles', on select: () => insertAigenerator() },
            { label: t('ueditor.insertCondition'), icon: 'i-lucide-shield-check', on select: () => insertTypedSheet('condition') },
            { label: t('ueditor.insertTabs'), icon: 'i-lucide-panel-top', on select: () => insertTabs() },
            { label: t('ueditor.insertStepper'), icon: 'i-lucide-list', on select: () => insertStepper() },
            { label: t('ueditor.insertVfiles'), icon: 'i-lucide-folder-tree', on select: () => insertVfiles() },
        )
        if (moduleLms) {
            base.push({ label: t('ueditor.insertChatroom'), icon: 'i-lucide-message-square-text', on select: () => insertChatroom() })
        }
        base.push(
            { label: t('ueditor.insertTimer'), icon: 'i-lucide-timer', on select: () => insertTimer() },
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

    // Insertcustom nodePoint（inputs / select etc.）
    function insertQuestionNode(type: string) {
        const editor = props.editor?.useEditor()
        if (!editor) return
        editor.chain().focus().insertContent({
            type: type,
            attrs: { content: '' },
        }).run()
    }

    // Insertcommonuse vue nodePoint
    function insertVueNode(type: string) {
        const editor = props.editor?.useEditor()
        if (!editor) return
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: '', type },
        }).run()
    }

    // Insert sheet nodePoint（withDefaultConfiguration）
    function insertSheet() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const default config = JSON.stringify({
            height: 300,
        })
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: default config, type: 'sheet' },
        }).run()
    }

    // InsertwithEmptyConfiguration vue nodePoint（pdf etc.）
    function insertTypedSheet(type: string) {
        const editor = props.editor?.useEditor()
        if (!editor) return
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: "", type },
        }).run()
    }

    // Insert aichat nodePoint（withDefaultConfiguration）
    function insertAichat() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const default config = JSON.stringify({
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
            attrs: { content: default config, type: 'aichat' },
        }).run()
    }

    // Insert aigenerator nodePoint（AI Nonelimit questions，withDefaultConfiguration）
    function insertAigenerator() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const default config = JSON.stringify({
            title: '',
            questionType: 'single',
            referenceText: '',
            point: 1,
            model: 'glm-4.5-air',
            thinking: false,
        })
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: default config, type: 'aigenerator' },
        }).run()
    }

    // Insert tabs nodePoint（withDefaultConfiguration）
    function insertTabs() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const default config = JSON.stringify({
            tabs: [
                { label: 'Tab 1', content: '' },
                { label: 'Tab 2', content: '' },
            ],
        })
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: default config, type: 'tabs' },
        }).run()
    }

    // Insertstep nodePoint（withDefaultConfiguration）
    function insertStepper() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const default config = JSON.stringify({
            orientation: 'horizontal',
            steps: [
                { title: '', description: '' },
                { title: '', description: '' },
            ],
        })
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: default config, type: 'stepper' },
        }).run()
    }

    // Insert vfiles virtualFilesectionPoint（withDefaultConfiguration）
    function insertVfiles() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const default config = JSON.stringify({
            items: [
                { id: 'f1', label: 'Folder 1', type: 'folder', children: [
                    { id: 'file1', label: 'file1.md', type: 'file', content: '' },
                ]},
            ],
        })
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: default config, type: 'vfiles' },
        }).run()
    }

    // InsertClassChatroomnodePoint（pureFrontserver ws，None cid）
    function insertChatroom() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: '', type: 'chatroom' },
        }).run()
    }

    // InsertTimernodePoint
    function insertTimer() {
        const editor = props.editor?.useEditor()
        if (!editor) return
        const default config = JSON.stringify({ minutes: 1, seconds: 0 })
        editor.chain().focus().insertContent({
            type: 'vue',
            attrs: { content: default config, type: 'timer' },
        }).run()
    }

    // listenInputruleTriggerSelecteditorEvent
    function onPickerEvent(e: any) {
        openPicker(e.detail.type)
    }

    onMounted(() => {
        window.addEventListener('ueditor-open-picker', onPickerEvent)
    })

    onBeforeUnmount(() => {
        window.removeEventListener('ueditor-open-picker', onPickerEvent)
    })

    // ConfirmBackone by oneitemsInsertindependent nodePoint
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
