<template>
  <sup :id="`fnref:${refNum}`">
    <a
      class="umo-node-footnote-ref"
      :href="`#fn:${refNum}`"
      :data-ref-num="refNum"
      :data-fn-id="fnId"
    >[{{ refNum }}]</a>
  </sup>
</template>

<script setup>
const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})
const refNum = computed(() => attrs.value.referenceNumber || '')
const fnId = computed(() => attrs.value['data-fn-id'] || '')
</script>
