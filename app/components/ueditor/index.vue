<template>
    <client-only>
        <umo-editor v-bind="options" ref="editorRef" @changed="onChanged" @created="onCreated">
        </umo-editor>

        <!-- Cinserts 组件，初始隐藏，editor 创建后移动到工具栏（仅 teacher 以上角色可见） -->
        <div ref="cinsertsWrapper" v-show="false">
            <Cinserts v-if="canEdit" :editor="editorRef" />
        </div>
    </client-only>
</template>

<script setup>
import { UmoEditor } from '@umoteam/editor'
import extensions from './extensions'
import Cinserts from './cinserts.vue'

const json = defineModel()
const props = defineProps({
    saveHandler: {
        type: Function,
        default: null,
    },
})

// 仅 teacher 以上角色可编辑内容（显示 Cinserts）
const { hasRole, isCourseEditor, isCourseTeacher } = useAuth()
const route = useRoute()
const courseId = computed(() => Number(route.params.id) || 0)
const canEdit = computed(() => {
    if (hasRole('admin') || hasRole('teacher')) return true
    return courseId.value ? isCourseEditor(courseId.value) || isCourseTeacher(courseId.value) : false
})

const editorRef = ref(null)
const tiptapEditor = ref(null)
const cinsertsWrapper = ref(null)

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
        return { url: res.data.url, id: res.data.url }
    },
    onFileDelete(id, url) {
        console.error('The file has been deleted. Please configure the onFileDelete to completely delete the file from the server.')
    },
}))

// editor 创建后，将 cinserts 移动到工具栏最前面并显示
const onCreated = () => {
    nextTick(() => {
        injectCinserts()
    })
}

function injectCinserts() {
    const ribbon = document.querySelector('.umo-ribbon-container')
    if (!ribbon) {
        setTimeout(injectCinserts, 200)
        return
    }

    // 如果已经注入过则跳过
    if (ribbon.querySelector('.cinserts-injected')) return

    // 将 cinsertsWrapper 移动到工具栏最前面
    const wrapper = cinsertsWrapper.value
    if (!wrapper) return
    wrapper.classList.add('cinserts-injected')
    wrapper.style.display = ''
    ribbon.insertBefore(wrapper, ribbon.firstChild)
}

const onChanged = () => {
    const markdown = editorRef.value.useEditor().getMarkdown()
    json.value = editorRef.value.getJSON()
    tiptapEditor.value = editorRef.value.useEditor()
}

const saveDocument = async () => {
    return editorRef.value.saveContent(true)
}

defineExpose({ saveDocument })
</script>
