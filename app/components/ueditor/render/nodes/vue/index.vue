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
  return compMap[type]
})
</script>