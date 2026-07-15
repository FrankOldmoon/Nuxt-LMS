<template>
    <UModal title="Modal with title" v-model:open="open"  fullscreen scrollable>
        
        <template #body>
            <div class="flex flex-col gap-4 p-4">
                <h3 class="text-lg font-semibold">{{ $t('ueditor.markdown.title') }}</h3>
                <monaco v-model="inputText" :placeholder="$t('ueditor.markdown.placeholder')"/>
                <div class="flex justify-end gap-2">
                    <UButton type="primary" @click="insertContent">{{ $t('ueditor.markdown.insert') }}</UButton>
                    <!-- Close Buttoncanoption，Nuxt UI  Modal DefaultcanPassClick mask layeror ESC Close -->
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

    // ClearInput，Modal willOperationBackAutoClose（IfClickInsertButtonwillTrigger close）
    // ifneed to forceClose，canPass ref Call Modal InstanceMethod，butusuallyClickOperationBack Modal willClose
    inputText.value = ''
}
</script>