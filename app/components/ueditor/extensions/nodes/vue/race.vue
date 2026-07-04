<template>
    <raceView :node="node" @init="initID" />
</template>

<script setup>
import raceView from '../../../render/nodes/vue/race.vue'
const props = defineProps({
    node: Object,
    updateAttributes: Function,
})

const initID = (id) => {
    props.updateAttributes({ content: id })
}
</script>
