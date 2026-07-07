<template>
    <client-only>
        <umo-editor v-bind="options" ref="editorRef" @changed="onChanged" @created="onCreated">
        </umo-editor>

        <!-- Cinserts 组件，初始隐藏，editor 创建后移动到工具栏（仅 teacher 以上角色可见） -->
        <div ref="cinsertsWrapper" v-show="false">
            <Cinserts v-if="canEdit" :editor="editorRef" />
        </div>

        <UeditorWs v-if="lockId" :lock-id="lockId" @update:readonly="onLockUpdate" />
    </client-only>
</template>

<script setup>
import { UmoEditor } from '@umoteam/editor'
import extensions from './extensions'
import Cinserts from './cinserts.vue'
import UeditorWs from './ws.vue'
import imageCompression from 'browser-image-compression'

const json = defineModel()
const props = defineProps({
    saveHandler: {
        type: Function,
        default: null,
    },
    lockId: {
        type: [String, Number],
        default: null,
    },
})

const isReadonly = ref(false)

/**
 * 图片压缩函数（使用 browser-image-compression 库）
 * @param file - 原始图片文件
 * @returns 压缩后的 File 对象
 */
async function compressImage(file) {
    const options = {
        maxSizeMB: 1,              // 最大 1MB
        maxWidthOrHeight: 1920,    // 最大宽高 1920px
        useWebWorker: true,        // 使用 Web Worker 提升性能
        fileType: 'image/webp',    // 输出 WebP 格式
        initialQuality: 0.8,      // 初始质量 80%
    }

    try {
        const compressedFile = await imageCompression(file, options)
        // 如果压缩后变大，返回原文件
        if (compressedFile.size >= file.size) {
            return file
        }
        // 重命名文件扩展名
        const webpName = file.name.replace(/\.(png|jpg|jpeg|gif|bmp|webp)$/i, '.webp')
        return new File([compressedFile], webpName, { type: 'image/webp' })
    } catch (error) {
        console.warn('图片压缩失败，使用原文件:', error)
        return file
    }
}

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
    readonly: isReadonly.value,
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

        // 图片压缩处理
        let processedFile = file
        if (file.type.startsWith('image/')) {
            processedFile = await compressImage(file, {
                maxWidth: 1920,
                maxHeight: 1920,
                quality: 0.8,
            })
        }

        const formData = new FormData()
        formData.append('files', processedFile)
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
        if (isReadonly.value) {
            editorRef.value?.useEditor()?.setEditable(false)
        }
    })
}

function onLockUpdate(readonly) {
    isReadonly.value = readonly
    const editor = editorRef.value?.useEditor()
    if (editor) {
        editor.setEditable(!readonly)
    }
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
