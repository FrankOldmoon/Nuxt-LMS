<template>
    <client-only>
        <umo-editor v-bind="options" ref="editorRef" @changed="onChanged" @created="onCreated" @paste="onPaste">
        </umo-editor>
        <div ref="cinsertsWrapper" v-show="false">
            <Cinserts v-if="canEdit" :editor="editorRef" />
        </div>

        <UeditorWs v-if="lockId" :lock-id="lockId" @update:readonly="onLockUpdate" />

        <!-- teacher 可见的 AI 生成悬浮按钮（右下角） -->
        <AiFloat :editor="editorRef" :readonly="isReadonly" />
    </client-only>
</template>

<script setup>
import { UmoEditor } from '@umoteam/editor'
import extensions from './extensions'
import Cinserts from './cinserts.vue'
import UeditorWs from './ws.vue'
import AiFloat from './ai-float.vue'


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
    showInsert: {
        type: Boolean,
        default: false,
    },
    pasteable: {
        type: Boolean,
        default: true,
    },
    // 课程 ID：admin 后台复用时传入，覆盖 route.params.id
    courseId: {
        type: [Number, String],
        default: undefined,
    },
})

const isReadonly = ref(false)

// 仅 teacher 以上角色可编辑内容（显示 Cinserts）
const { hasRole, isCourseEditor, isCourseTeacher } = useAuth()
const route = useRoute()
// 优先使用 props.courseId（admin 复用场景），否则用 route.params.id
const effectiveCourseId = computed(() => {
    if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
        return Number(props.courseId) || 0
    }
    return Number(route.params.id) || 0
})
const canEdit = computed(() => {
    if (!props.showInsert) return false
    if (hasRole('admin') || hasRole('teacher')) return true
    return effectiveCourseId.value ? isCourseEditor(effectiveCourseId.value) || isCourseTeacher(effectiveCourseId.value) : false
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
        const processedFile = file.type.startsWith('image/')
            ? await compressImage(file)
            : file

        const formData = new FormData()
        formData.append('files', processedFile)
        const res = await $fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
        })
        return { url: res.data.url, id: res.data.id }
    },
    onFileDelete(id, url) {
        //console.log({ id, url })
        $fetch('/api/files/delete', {
            method: 'POST',
            body: { id },
        })
    },
}))

// editor 创建后，将 cinserts 移动到工具栏最前面并显示
const onCreated = () => {
    nextTick(() => {
        injectCinserts()
        if (isReadonly.value) {
            editorRef.value?.useEditor()?.setEditable(false)
        }
        // 禁用粘贴
        if (!props.pasteable) {
            editorRef.value?.useEditor()?.on('paste', ({ event }) => {
                event.preventDefault()
            })
        }
    })
}

const traverse = (node, cb = null) => {
    if (cb) {
        cb(node);
    }
    if (node && node.content && Array.isArray(node.content)) {
        node.content.forEach((n, index) => traverse(node.content[index], cb));
    }
};

const uploadImages = async () => {
    traverse(editorRef.value.getJSON(), async (node) => {
        console.log({ node })
        if (node && node.type === "image") {
            if (node.attrs.src.startsWith("http") || node.attrs.src.startsWith("data:")) {
                const res = await $fetch('/api/files/upload', {
                    method: 'POST',
                    body: { url: node.attrs.src },
                })
                node.attrs.src = res.data.url;
                node.attrs.id = res.data.id;
            }
        }
    });
}

const onPaste = async (content) => {
    await waitForSeconds(1)
    await uploadImages()
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
