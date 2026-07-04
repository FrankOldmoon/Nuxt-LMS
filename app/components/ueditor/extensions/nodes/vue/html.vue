<template>
    <!-- 配置面板：HTML 代码编辑 -->
    <div v-if="showConfig" class="vue-node-config">
        <Monaco v-model="html" language="html" />
        <UButton size="xs" color="primary" class="self-end mt-2" @click="showConfig = false">
            {{ t('common.save') }}
        </UButton>
    </div>

    <!-- 预览（始终显示） -->
    <div class="vue-node-body p-2">
        <div v-html="html"></div>
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const showConfig = inject('nodeViewShowConfig')
const meta = inject('nodeViewMeta')

meta.title = 'HTML'
meta.icon = 'i-lucide-code'
meta.hasSettings = true

const html = ref(props.node.attrs.content || '')

watch(html, () => {
    props.updateAttributes({ content: html.value })
})
</script>
