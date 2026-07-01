<template>
    <client-only>
        <umo-editor v-bind="options" ref="editorRef" @changed="onChanged" @created="onCreated">
            <template #toolbar_insert="props">
                <UeditorInsertMarkdown :editor="editorRef" />
            </template>
        </umo-editor>
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
        return res
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

const saveDocument = () => {
    editorRef.value.saveContent(true)
}

defineExpose({ saveDocument })
</script>