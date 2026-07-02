<template>
  <div class="umo-editor-render umo-page-content render" style="width:100%;">
    <!-- <div class="umo-page-node-content" style="width:100%; height:100%; min-height:100%"> -->
    <div v-if="renderContent" class="umo-editor-content is-readonly" :style="{ lineHeight: defaultLineHeight }"
      :spellcheck="false">
      <div class="umo-editor" contenteditable="false" style="padding: 0px; min-height: 100%;">
        <RenderNode :node="renderContent" />
      </div>
    </div>
    <!-- </div> -->
  </div>
</template>

<script setup>

import RenderNode from './node.vue'

const props = defineProps({
  json: {
    type: Object,
    default: () => ({}),
  },
  // CDN 地址（用于文件图标、echarts、KaTeX 等资源加载）
  cdnUrl: {
    type: String,
    default: 'https://unpkg.com/@umoteam/editor-external@latest',
  },
  // 默认行高
  lineHeight: {
    type: [Number, String],
    default: 1.75,
  },
  // 页面背景色
  background: {
    type: String,
    default: '#fff',
  },
})

const defaultLineHeight = computed(() => props.lineHeight)

function convertBracket(str) {
  const result = [];
  let lastIndex = 0;
  const regex = /\{\{(.*?)\}\}/g;
  let match;

  while ((match = regex.exec(str)) !== null) {
    // 处理匹配前的普通文本
    const before = str.slice(lastIndex, match.index);
    if (before) {
      result.push({ type: 'text', text: before });
    }

    // 处理匹配到的占位符
    const content = match[1].trim();
    result.push({
      type: 'inputs',
      attrs: { content: '' },
    });

    // 更新位置
    lastIndex = match.index + match[0].length;
  }

  // 处理最后的普通文本
  const remaining = str.slice(lastIndex);
  if (remaining) {
    result.push({ type: 'text', text: remaining });
  }

  return result;
}

const renderContent = computed(() => {
  if (!props.json || !Object.keys(props.json).length) {
    return null
  } else if (typeof props.json == 'string') {
    if (props.json.match(/\{\{(.*?)\}\}/g)) {
      const result = convertBracket(props.json)
      return { type: 'doc', content: result }
    }
    return { type: 'doc', content: [{ type: 'text', text: props.json }] }
  }
  return props.json
})
</script>

<style lang="less">
@import "../../../../node_modules/@umoteam/editor/dist/umo-editor.css";

.umo-page-content .render {
  min-height: 100% !important
}

.umo-editor-render-container {
  //width: 100%;

  // 重置段落和列表的默认 margin/padding（与编辑器容器保持一致）
  p,
  ul,
  ol {
    margin: 0;
    padding: 0;
  }
}

.umo-editor-render {
  transform-origin: 0 0;
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: var(--umo-page-background);
  min-height: 100px;
  overflow: visible !important;
  color: var(--umo-text-color);

  .umo-page-node-content {
    position: relative;
    box-sizing: border-box;
    min-height: 100px;
    //width: 100%;
  }

  // 渲染模式下允许 iframe 内容可交互（滚动/点击）
  .umo-node-iframe iframe {
    pointer-events: auto !important;
  }
}
</style>
