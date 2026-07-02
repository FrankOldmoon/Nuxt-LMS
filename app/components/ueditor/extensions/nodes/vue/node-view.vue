<template>
    <node-view-wrapper class="counter-node-wrapper">
        <div class="flex items-center justify-center w-full gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 select-none"
            contenteditable="false">
            <div v-if="loading">加载中...</div>
            <component v-else-if="comp" :is="comp" v-bind="props" style="width:100%"/>
        </div>
    </node-view-wrapper>
</template>

<script setup>
import { ref, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const comp = ref(null)
const loading = ref(false)

watch(
  () => props.node.attrs.type,
  async (type) => {
    comp.value = null
    if (!type) return
    loading.value = true
    try {
      // 优先尝试同目录下 .vue 文件，其次尝试子目录 index.vue
      let mod
      try {
        mod = await import(`./${type}.vue`)
      } catch {
        mod = await import(`./${type}/index.vue`)
      }
      comp.value = mod.default
    } catch (err) {
      console.warn(`组件 ${type} 不存在，加载失败`, err)
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)
</script>