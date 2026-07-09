<template>
    <client-only>
        <umo-editor v-bind="options" ref="editorRef" @changed="onChanged" @created="onCreated" @paste="onPaste">
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
                console.log("uploadImages", node);
            }
        }
    });
}

const onPaste = async (content) => {
    console.log("onPaste", content)
    await waitForSeconds(1)
    console.log(editorRef.value.getJSON())
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
