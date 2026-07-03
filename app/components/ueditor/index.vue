<template>
    <client-only>
        <umo-editor v-bind="options" ref="editorRef" @changed="onChanged" @created="onCreated">
            <template #toolbar_insert="props">
                <UeditorInsertMarkdown :editor="editorRef" />
                <UDropdownMenu :items="insertItems">
                    12<UButton icon="i-lucide-plus" size="sm" variant="ghost" />
                </UDropdownMenu>
            </template>
        </umo-editor>

        <!-- 内容选择器 -->
        <UeditorContentPicker v-model="pickerOpen" :type="pickerType"
            @confirm="onPickerConfirm" />
    </client-only>
</template>

<script setup>
import { UmoEditor } from '@umoteam/editor'
import extensions from './extensions'
const json = defineModel()
const props = defineProps({
    saveHandler: {
        type: Function,
        default: null,
    },
})
const editorRef = ref(null)
const tiptapEditor = ref(null)

const { t } = useI18n()

// 插入下拉菜单
const insertItems = computed(() => [
    { label: t('courseData.questionLabel'), icon: 'i-lucide-circle-help', onSelect: () => openPicker('questions') },
    { label: t('homework.label'), icon: 'i-lucide-book-open', onSelect: () => openPicker('homeworks') },
    { label: t('comment.label'), icon: 'i-lucide-message-circle', onSelect: () => openPicker('comments') },
])

// 选择器
const pickerOpen = ref(false)
const pickerType = ref('questions')

function openPicker(type) {
    pickerType.value = type
    pickerOpen.value = true
}

// 监听输入规则触发的选择器事件（::questions / ::homeworks / ::comments）
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
    const editor = editorRef.value?.useEditor()
    if (!editor || !cids.length) return
    const singular = pickerType.value.replace(/s$/, '')
    const nodes = cids.map(cid => ({
        type: 'vue',
        attrs: { content: String(cid), type: singular },
    }))
    editor.chain().focus().insertContent(nodes).run()
}

const options = computed(() => ({
    document: {
        content: json.value,
    },
    height: '600px',
    contentType: 'markdown',
    extensions,
    async onSave(content, page, document) {
        if (props.saveHandler) {
            return props.saveHandler(content)
        }
        localStorage.setItem('json', JSON.stringify(content.json))
        return 1
    },
    async onFileUpload(file) {
        if (!file) throw new Error('File not found')
        const formData = new FormData()
        formData.append('files', file)
        const res = await $fetch('/api/upload', {
            method: 'POST',
            body: formData,
        })
        return {url: res.data.url, id: res.data.url}
    },
    onFileDelete(id, url) {
        console.error('The file has been deleted. Please configure the onFileDelete to completely delete the file from the server.')
    },
}))

const onCreated = () => {
    //const content = JSON.parse(localStorage.getItem('json') || '{}')
    //console.log('json', content)
    //editorRef.value.setContent(content)
}

const onChanged = () => {
    const markdown = editorRef.value.useEditor().getMarkdown()
    //console.log(markdown)
    console.log(editorRef.value.getJSON())
    json.value = editorRef.value.getJSON()
    tiptapEditor.value = editorRef.value.useEditor()

}

const saveDocument = async () => {
    return editorRef.value.saveContent(true)
}

defineExpose({ saveDocument })
</script>
