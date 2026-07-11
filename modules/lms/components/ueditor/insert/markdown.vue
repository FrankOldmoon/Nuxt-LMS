<template>
    <UModal title="Modal with title" v-model:open="open"  fullscreen scrollable>
        
        <template #body>
            <div class="flex flex-col gap-4 p-4">
                <h3 class="text-lg font-semibold">{{ $t('ueditor.markdown.title') }}</h3>
                <monaco v-model="inputText" :placeholder="$t('ueditor.markdown.placeholder')"/>
                <div class="flex justify-end gap-2">
                    <UButton type="primary" @click="insertContent">{{ $t('ueditor.markdown.insert') }}</UButton>
                    <!-- 关闭按钮可选，Nuxt UI 的 Modal 默认可通过点击遮罩层或 ESC 关闭 -->
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
    editor: {
        type: Object,
        default: () => { },
    },
})

const open = defineModel({default: false})

const inputText = ref('')

const insertContent = () => {
    if (!inputText.value.trim()) return

    const json = props.editor.useEditor().markdown.parse(inputText.value)
    console.log({ json })
    props.editor.insertContent(json)

    // 清空输入，Modal 会在操作后自动关闭（如果点击了插入按钮会触发 close）
    // 若需要强制关闭，可通过 ref 调用 Modal 实例的方法，但通常点击操作后 Modal 会关闭
    inputText.value = ''
}
</script>