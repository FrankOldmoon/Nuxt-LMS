<template>
    <div class="cinserts-trigger">
        <UDropdownMenu :items="allItems" :content="{ align: 'start' }">
            <button class="cinserts-btn">
                <UIcon name="i-lucide-plus" class="cinserts-icon" />
                <span class="cinserts-text">{{ $t('courseData.insert') }}</span>
            </button>
        </UDropdownMenu>
    </div>

    <!-- Markdown 弹窗 -->
    <UeditorInsertMarkdown :editor="editor" v-model="markdownOpen" />

    <!-- 内容选择器 -->
    <UeditorContentPicker v-model="pickerOpen" :type="pickerType" @confirm="onPickerConfirm" />
</template>

<style scoped>
.cinserts-trigger {
    display: flex;
    align-items: center;
    padding: 0 4px;
    height: 100%;
}
.cinserts-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: none;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    color: inherit;
    transition: background 0.15s;
}
.cinserts-btn:hover {
    background: rgba(0, 0, 0, 0.06);
}
.dark .cinserts-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}
.cinserts-icon {
    font-size: 16px;
}
.cinserts-text {
    white-space: nowrap;
}
</style>

<script setup>
const props = defineProps({
    editor: { type: Object, default: null },
})

const { t } = useI18n()

const markdownOpen = ref(false)
const pickerOpen = ref(false)
const pickerType = ref('questions')

// 下拉菜单：Markdown | 快速插入空白 | 选择现有
const allItems = computed(() => [
    { label: t('ueditor.markdown.title'), icon: 'i-mdi:language-markdown', onSelect: () => { markdownOpen.value = true } },
    { type: 'separator' },
    { label: t('courseData.questionLabel'), icon: 'i-lucide-circle-help', onSelect: () => quickInsert('questions') },
    { label: t('homework.label'), icon: 'i-lucide-book-open', onSelect: () => quickInsert('homeworks') },
    { label: t('comment.label'), icon: 'i-lucide-message-circle', onSelect: () => quickInsert('comments') },
    { type: 'separator' },
    { label: t('ueditor.insertInput'), icon: 'i-lucide-text-cursor-input', onSelect: () => insertVueNode('inputs') },
    { label: t('ueditor.insertSelect'), icon: 'i-lucide-chevron-down-square', onSelect: () => insertVueNode('select') },
    { type: 'separator' },
    { label: `${t('common.search')} ${t('courseData.questionLabel')}`, icon: 'i-lucide-circle-help', onSelect: () => openPicker('questions') },
    { label: `${t('common.search')} ${t('homework.label')}`, icon: 'i-lucide-book-open', onSelect: () => openPicker('homeworks') },
    { label: `${t('common.search')} ${t('comment.label')}`, icon: 'i-lucide-message-circle', onSelect: () => openPicker('comments') },
])

function openPicker(type) {
    pickerType.value = type
    pickerOpen.value = true
}

function quickInsert(type) {
    pickerType.value = type
    onPickerConfirm([0])
}

// 插入通用 vue 节点（inputs / select 等）
function insertVueNode(type) {
    const editor = props.editor?.useEditor()
    if (!editor) return
    editor.chain().focus().insertContent({
        type: type,
        attrs: { content: ''},
    }).run()
}

// 监听输入规则触发的选择器事件
function onPickerEvent(e) {
    openPicker(e.detail.type)
}

onMounted(() => {
    window.addEventListener('ueditor-open-picker', onPickerEvent)
})

onBeforeUnmount(() => {
    window.removeEventListener('ueditor-open-picker', onPickerEvent)
})

// 确认后逐个插入独立节点
function onPickerConfirm(cids) {
    const editor = props.editor?.useEditor()
    if (!editor || !cids.length) return
    const singular = pickerType.value.replace(/s$/, '')
    const nodes = cids.map(cid => ({
        type: 'vue',
        attrs: { content: String(cid), type: singular },
    }))
    editor.chain().focus().insertContent(nodes).run()
}
</script>
