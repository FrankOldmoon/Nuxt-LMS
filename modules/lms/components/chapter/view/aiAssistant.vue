<template>
  <!-- 右下角 Dify 悬浮聊天机器人（替换原 AI 章节助教 + VRM 数字人），脚本在 onMounted/aiEnabled 时注入 -->
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'

const { aiEnabled } = useChapterViewContext()

// Dify Web 嵌入配置（与 Dify 后台「嵌入网站」提供的代码一致）
const DIFY_CONFIG = {
  token: 'REDACTED',
  baseUrl: 'http://10.28.1.153',
  inputs: {},
  systemVariables: {},
  userVariables: {},
}

// 嵌入脚本的 DOM id（同时用于防重复注入）
const SCRIPT_ID = 'dify-chatbot-script'

function loadDify() {
  if (typeof window === 'undefined') return
  // 同一页面重复进入章节时不重复注入
  if (document.getElementById(SCRIPT_ID)) return
  ;(window as any).difyChatbotConfig = DIFY_CONFIG
  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.src = `${DIFY_CONFIG.baseUrl}/embed.min.js`
  script.defer = true
  document.head.appendChild(script)
}

function unloadDify() {
  if (typeof window === 'undefined') return
  // 移除注入的脚本与 Dify 渲染的气泡 DOM，避免离开章节页后残留
  document.getElementById(SCRIPT_ID)?.remove()
  document.getElementById('dify-chatbot-bubble-button')?.remove()
  document.getElementById('dify-chatbot-bubble-window')?.remove()
  delete (window as any).difyChatbotConfig
}

// 跟随课程 AI 开关：开启时注入 Dify 聊天，关闭时清理
watch(aiEnabled, (val) => {
  if (val) loadDify()
  else unloadDify()
}, { immediate: true })

onBeforeUnmount(unloadDify)
</script>

<style>
#dify-chatbot-bubble-button {
  background-color: #1C64F2 !important;
}
#dify-chatbot-bubble-window {
  width: 24rem !important;
  height: 40rem !important;
}
</style>
