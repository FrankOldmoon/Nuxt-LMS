<template>
    <div>
        <Monaco v-model="html"/>
        <div v-html="html"></div>
    </div>
</template>

<script setup>
const props = defineProps({
    node: Object,
    updateAttributes: Function,
})
const html = ref(props.node.attrs.content)

watch(html,()=>{
    props.updateAttributes({ content: html.value })
})
</script>