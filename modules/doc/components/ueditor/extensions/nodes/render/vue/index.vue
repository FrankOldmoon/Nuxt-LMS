<template>
    <component v-if="comp" :is="comp" :node="node" />
</template>

<script setup>
// 预加载当前目录下所有 .vue 组件（eager: true 代表编译期预加载，等同于手动 import）
const compModules = import.meta.glob('./*.vue', { eager: true })

// 自动生成「组件名 → 组件实例」的映射
const compMap = Object.fromEntries(
  Object.entries(compModules).map(([filePath, module]) => {
    // 提取文件名（去掉路径和 .vue 后缀）作为组件标识
    const compName = filePath.replace('./', '').replace('.vue', '')
    return [compName, module.default]
  })
)

const props = defineProps({
  node: Object,
})

const comp = computed(() => {
  const type = props.node?.attrs?.type
  // 使用同目录的渲染组件（question / homework / comment / quiz / race / chatroom 等）
  // race / chatroom 的渲染包装已迁回本目录，统一由 glob 加载
  if (type && compMap[type]) return compMap[type]
  return null
})
</script>