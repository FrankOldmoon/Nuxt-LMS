<template>
    <client-only>
        <umo-editor v-bind="options" />
    </client-only>
    <!-- <div ref="editorRef" id="element" class="border border-gray-300 p-4"></div> -->
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Editor } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { UmoEditor } from '@umoteam/editor'
// 1. 使用ref获取DOM，替代直接querySelector
const editorRef = ref(null)
let editor = null
let provider = null
const ydoc = new Y.Doc()
const options = ref({

})

// 挂载后再初始化编辑器
onMounted(() => {
    //if (!editorRef.value) return

    // 初始化协同服务
    provider = new HocuspocusProvider({
        url: "ws://127.0.0.1:1234",
        name: "example-document",
        document: ydoc,
    })

    options.value = {
        extensions: [
            // StarterKit.configure({
            //     undoRedo: false, // 协同模式关闭原生撤销
            // }),
            Collaboration.configure({
                document: ydoc,
            }),
            CollaborationCaret.configure({
                provider,
                user: { name: Math.random().toString(36).substring(2), color: "#ffcc00" },
            }),
        ]
    }

    // 创建编辑器
    // editor = new Editor({
    //     element: editorRef.value, // 正确绑定DOM
    //     extensions: [
    //         StarterKit.configure({
    //             undoRedo: false, // 协同模式关闭原生撤销
    //         }),
    //         Collaboration.configure({
    //             document: ydoc,
    //         }),
    //         CollaborationCaret.configure({
    //             provider,
    //             user: { name: Math.random().toString(36).substring(2), color: "#ffcc00" },
    //         }),
    //     ],
    // })
})

// 组件销毁销毁实例，防止内存泄漏
onUnmounted(() => {
    editor?.destroy()
    provider?.destroy()
})
</script>