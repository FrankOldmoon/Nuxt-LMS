import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import extensions from './extensions'

/**
 * 删除 tiptap doc 中空白 heading（无内容或仅含空白文本）。
 * heading 内含非 text 节点（图片/公式等）时不算空白，保留。
 * 就地修改并返回该节点。
 */
export function removeEmptyHeadings(node: any): any {
    if (!node || typeof node !== 'object') return node
    if (Array.isArray(node.content)) {
        node.content = node.content
            .filter((c: any) => {
                if (c?.type !== 'heading') return true
                const content = c.content
                if (!Array.isArray(content) || content.length === 0) return false
                return !content.every((t: any) => t?.type === 'text' && !String(t.text ?? '').trim())
            })
            .map(removeEmptyHeadings)
    }
    return node
}

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

    // 未配置 PeerTube 时的普通视频上传：走原文件上传接口
    async function ordinaryVideoUpload(file: any) {
        const formData = new FormData()
        formData.append('files', file)
        const res = await $fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
        })
        return { url: res.data.url, id: res.data.id }
    }

    // 上传视频到 PeerTube，成功返回 embed URL；未配置或上传失败返回 null
    async function uploadVideoToPeerTube(file: any): Promise<string | null> {
        try {
            const formData = new FormData()
            formData.append('files', file)
            const res = await $fetch<{ data: any }>('/api/peertube/upload', {
                method: 'POST',
                body: formData,
            })
            const d = res?.data
            if (d?.embedUrl) return d.embedUrl
            // 未配置 PeerTube（enabled:false）或其它失败 → 让调用方回退普通上传
            return null
        } catch {
            return null
        }
    }

    const options = computed(() => ({
        document: {
            content: json.value,
        },
        // 编辑器按需从 editor-external 加载 katex / echarts / mermaid / plyr 等外部资源
        // （属重量级依赖，总量约 6MB+）。默认指向公网 CDN；内网部署时用
        // NUXT_PUBLIC_NPM_ASSETS_BASE 指向本地镜像即可脱网。
        cdnUrl: `${npmAssetsBase()}/@umoteam/editor-external@latest`,
        contentType: 'markdown',
        readonly: isReadonly.value,
        extensions,
        async onSave(content: any, page: any, document: any) {
            // 保存前删除空白 heading，避免文档中残留无内容的空标题
            removeEmptyHeadings(content?.json)
            if (props.saveHandler) {
                return props.saveHandler(content)
            }
            localStorage.setItem('json', JSON.stringify(content.json))
            return 1
        },
        async onFileUpload(file: any) {
            if (!file) throw new Error('File not found')

            // 视频：仅教师/管理员可上传；优先上传 PeerTube 得到 embed URL
            if (String(file.type || '').startsWith('video/')) {
                if (!(hasRole('admin') || hasRole('teacher'))) {
                    throw new Error('仅教师和管理员可上传视频')
                }
                // 将编辑器里刚创建的待上传 video 节点原位替换为 iframe 节点（embed 是网页地址，
                // 原生 <video> 无法播放，iframe 节点在编辑时才能正常显示）
                // 未配置 PeerTube（服务端返回 enabled:false / 上传失败）时回退为普通视频上传
                const embedUrl = await uploadVideoToPeerTube(file)
                if (embedUrl) {
                    // 让 UmoEditor 先完成它自己的上传收尾（把 video 节点的 src 设为 embedUrl），
                    // 收尾完成后再用一个 macrotask 把该 video 节点原位替换为 iframe 节点。
                    // 注意：返回的 id 必须是"非空"，否则 UmoEditor 把 video 节点写成 id:null
                    // 会破坏文档结构，之后遍历文档会报 "Cannot read properties of undefined (reading 'nodeSize')"。
                    const placeholderId = `pt-${Math.random().toString(36).slice(2, 10)}`
                    setTimeout(() => {
                        try {
                            const editor = editorRef.value?.useEditor?.()
                            if (!editor) return
                            let target: { pos: number; nodeSize: number } | null = null
                            editor.state.doc.descendants((node: any, pos: number) => {
                                if (!target && node.type.name === 'video' && node.attrs?.src === embedUrl) {
                                    target = { pos, nodeSize: node.nodeSize }
                                }
                            })
                            if (target) {
                                const iframeNode = editor.schema.nodes.iframe?.create({ src: embedUrl, height: 400 })
                                if (iframeNode) {
                                    editor.view.dispatch(editor.state.tr.replaceWith(target.pos, target.pos + target.nodeSize, iframeNode))
                                }
                            }
                        } catch (e) {
                            console.warn('[ueditor] video->iframe replace skipped:', e)
                        }
                    }, 0)
                    return { url: embedUrl, id: placeholderId }
                }
                return ordinaryVideoUpload(file)
            }

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

    const uploadImages = async () => {
        const editor = editorRef.value?.useEditor?.()
        if (!editor) return

        // 收集需要上传的远程/内联图片（pos + src）
        const targets: { pos: number; src: string }[] = []
        editor.state.doc.descendants((node: any, pos: number) => {
            if (node.type.name === 'image') {
                const src = node.attrs?.src
                if (typeof src === 'string' && (src.startsWith('http') || src.startsWith('data:'))) {
                    targets.push({ pos, src })
                }
            }
            return true
        })
        if (!targets.length) return

        // 并发上传（按 src 去重），单张失败不阻塞其他
        const srcToResult = new Map<string, { url: string; id: any }>()
        await Promise.all(Array.from(new Set(targets.map(t => t.src))).map(async (src) => {
            try {
                const res = await $fetch<{ data: { url: string; id: any } }>('/api/files/upload', {
                    method: 'POST',
                    body: { url: src },
                })
                if (res?.data?.url) srcToResult.set(src, { url: res.data.url, id: res.data.id })
            } catch { /* noop */ }
        }))
        if (!srcToResult.size) return

        // 用 transaction 真正更新编辑器中的 image 节点
        // （直接改 getJSON() 副本不会反映到视图，会导致 img 仍加载远程 URL 触发 CORS）
        const tr = editor.state.tr
        let updated = 0
        editor.state.doc.descendants((node: any, pos: number) => {
            if (node.type.name === 'image') {
                const mapped = srcToResult.get(node.attrs?.src)
                if (mapped) {
                    tr.setNodeMarkup(pos, undefined, { src: mapped.url, id: mapped.id })
                    updated++
                }
            }
            return true
        })
        if (updated > 0) editor.view.dispatch(tr)
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
        // v-model 同步时同步清理空白 heading，保证外部直接保存（如 handleSaveClick）拿到的 json 也干净
        json.value = removeEmptyHeadings(editorRef.value.getJSON())
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
