<template>
  <span class="umo-node-option-box" data-node-view-wrapper="">
    <span :class="containerClass">
      <span v-for="(box, i) in items" :key="box.key || i" class="option-item">
        <input
          v-if="isRadio"
          type="radio"
          :checked="box.checked"
          disabled
        />
        <input
          v-else
          type="checkbox"
          :checked="box.checked"
          disabled
        />
        <span>{{ box.label || '' }}</span>
      </span>
    </span>
  </span>
</template>

<script setup>
const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})

const isRadio = computed(() => attrs.value.target === 'radio')
const items = computed(() => attrs.value.items || [])
const containerClass = computed(() =>
  isRadio.value ? 'umo-option-box-radio-container' : 'umo-option-box-checkbox-container',
)
</script>
