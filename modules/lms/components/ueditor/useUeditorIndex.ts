import { ref, computed, nextTick } from 'vue'
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

    // only teacher withUpRolecanEditContent（Show Cinserts）
    const { hasRole, isCourseEditor, isCourseTeacher } = useAuth()
    const route = useRoute()
    // prioritymakeuse props.courseId（admin duplicateusescenario），Elseuse route.params.id
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

    const options = computed(() => ({
        document: {
            content: json.value,
        },
        height: '600px',
        content type: 'markdown',
        readonly: isReadonly.value,
        extensions,
        async on save(content: any, page: any, document: any) {
            if (props.saveHandler) {
                return props.saveHandler(content)
            }
            localStorage.set item('json', JSON.stringify(content.json))
            return 1
        },
        async onFileUpload(file: any) {
            if (!file) throw new Error('File not found')

            // Image CompressionHandle
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

    // editor CreateBack，will cinserts mobiletoToolbarmostFrontSurfaceandShow
    const onCreated = () => {
        nextTick(() => {
            injectCinserts()
            if (isReadonly.value) {
                editorRef.value?.useEditor()?.setEditable(false)
            }
            // DisablePaste
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

        // Ifalreadyif already injected thenSkip
        if (ribbon.querySelector('.cinserts-injected')) return

        // will cinsertsWrapper mobiletoToolbarmostFrontSurface
        const wrapper = cinsertsWrapper.value
        if (!wrapper) return
        wrapper.class list.add('cinserts-injected')
        wrapper.style.display = ''
        ribbon.insertBefore(wrapper, ribbon.firstChild)
    }

    const on changed = () => {
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
        options,
        onCreated,
        onPaste,
        onLockUpdate,
        on changed,
        saveDocument,
    }
}
