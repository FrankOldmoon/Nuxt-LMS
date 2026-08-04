import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import extensions from './extensions'

export interface UeditorIndexProps {
    saveHandler: {
        type: Function,
        default: null
    },
    lockId: {
        type: [String, Number],
        default: null
    },
    showInsert: {
        type: Boolean,
        default: false
    },
    pasteable: {
        type: Boolean,
        default: true
    },
    courseId: {
        type: [Number, String],
        default: undefined
    }
}

export function useUeditorIndex(props: any, json: any) {
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
    const canInsert = computed(() => {
        if (!props.showInsert) return false
        if (hasRole('admin') || hasRole('teacher')) return true
        return effectiveCourseId.value ? isCourseEditor(effectiveCourseId.value) || isCourseTeacher(effectiveCourseId.value) : false
    })

    const editorRef = ref<any>(null)
    const tiptapEditor = ref<any>(null)
    const cinsertsWrapper = ref<any>(null)
    // 控制 cinsert 是否显示（避免 v-show 在重渲染时把 wrapper 重新隐藏）
    const cinsertsShown = ref(false)

    // 监听工具栏刷新：umo-editor 每次更新都会重建 .umo-ribbon-container
    // （元素会被整体替换而非仅子节点变化），故监听稳定的 body，
    // 每次变化后重新查询 ribbon 并重新注入，避免 cinsert 消失
    let ribbonObserver: MutationObserver | null = null
    function setupRibbonObserver() {
        const ribbon = document.querySelector('.umo-ribbon-container')
        if (!ribbon) {
            setTimeout(setupRibbonObserver, 200)
            return
        }
        if (ribbonObserver) return
        ribbonObserver = new MutationObserver(() => {
            injectCinserts()
        })
        ribbonObserver.observe(document.body, { childList: true, subtree: true })
    }

    onBeforeUnmount(() => {
        ribbonObserver?.disconnect()
        ribbonObserver = null
    })

    const options = computed(() => ({
        document: {
            content: json.value,
        },
        height: '600px',
        contentType: 'markdown',
        readonly: isReadonly.value,
        extensions,
        async onSave(content: any, page: any, document: any) {
            if (props.saveHandler) {
                return props.saveHandler(content)
            }
            localStorage.setItem('json', JSON.stringify(content.json))
            return 1
        },
        async onFileUpload(file: any) {
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
        onFileDelete(id: any, url: any) {
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
            setTimeout(() => {
                injectCinserts()
                setupRibbonObserver()
            }, 1000);
            if (isReadonly.value) {
                editorRef.value?.useEditor()?.setEditable(false)
            }
            // 禁用粘贴
            if (!props.pasteable) {
                editorRef.value?.useEditor()?.on('paste', ({ event }: any) => {
                    event.preventDefault()
                })
            }
        })
    }

    const traverse = (node: any, cb: any = null) => {
        if (cb) {
            cb(node);
        }
        if (node && node.content && Array.isArray(node.content)) {
            node.content.forEach((n: any, index: number) => traverse(node.content[index], cb));
        }
    };

    const uploadImages = async () => {
        traverse(editorRef.value.getJSON(), async (node: any) => {
            //console.log({ node })
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

    const onPaste = async (content: any) => {
        await waitForSeconds(1)
        await uploadImages()
    }

    function onLockUpdate(readonly: boolean) {
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

        const wrapper = cinsertsWrapper.value
        if (!wrapper) return

        // 每次重新确保显示并置于工具栏最前面，防止 ribbon 重建后 cinsert 消失
        wrapper.style.display = ''
        cinsertsShown.value = true
        if (!ribbon.contains(wrapper)) {
            ribbon.insertBefore(wrapper, ribbon.firstChild)
        }
    }

    const onChanged = () => {
        const markdown = editorRef.value.useEditor().getMarkdown()
        json.value = editorRef.value.getJSON()
        //console.log({ markdown, json: json.value })
        tiptapEditor.value = editorRef.value.useEditor()
    }

    const saveDocument = async () => {
        return editorRef.value.saveContent(true)
    }

    return {
        isReadonly,
        effectiveCourseId,
        canInsert,
        editorRef,
        tiptapEditor,
        cinsertsWrapper,
        cinsertsShown,
        options,
        onCreated,
        onPaste,
        onLockUpdate,
        onChanged,
        saveDocument,
    }
}
