<template>
  <!-- 右下角 Dify 悬浮聊天机器人（登录后全站显示），脚本在 isLoggedIn 变为 true 时注入 -->
</template>

<script setup lang="ts">
import { watch, onMounted, onBeforeUnmount } from 'vue'

const { user, isLoggedIn, refreshUser } = useAuth()

// Dify Web 嵌入配置（与 Dify 后台「嵌入网站」提供的代码一致）
const DIFY_CONFIG = {
  token: 'REDACTED',
  baseUrl: 'http://10.28.1.153',
  // 页面加载完成后动态注入脚本时必须开启，否则脚本会等待已触发过的 body.onload 而永不创建气泡
  dynamicScript: true,
  inputs: {},
  systemVariables: {
    // 登录后由当前用户填充，便于 Dify 区分会话
    user_id: '',
  },
  userVariables: {},
}

// 嵌入脚本的 DOM id（同时用于防重复注入）
const SCRIPT_ID = 'dify-chatbot-script'

// Dify 会按 user_id 把「最近一次会话 id」存到浏览器 localStorage（key: conversationIdInfo），
// 下次打开会自动续上该会话的历史。这里给 user_id 加一个「每次页面加载唯一」的后缀，
// 让 Dify 每次进入/刷新都查不到旧会话，从而始终是全新对话（代价：Dify 后台会把同一学生
// 视为多个 user，会话列表与统计会分散）。
const SESSION_SUFFIX = Math.random().toString(36).slice(2, 10)

function buildUserId() {
  const id = user.value?.id
  return id ? `${id}_${SESSION_SUFFIX}` : ''
}

function loadDify() {
  if (typeof window === 'undefined') return
  // 同一页面重复挂载/重复进入时不重复注入
  if (document.getElementById(SCRIPT_ID)) return
  DIFY_CONFIG.systemVariables.user_id = buildUserId()
  ;(window as any).difyChatbotConfig = DIFY_CONFIG
  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.src = `${DIFY_CONFIG.baseUrl}/embed.min.js`
  script.defer = true
  document.head.appendChild(script)
}

function unloadDify() {
  if (typeof window === 'undefined') return
  // 移除注入的脚本与 Dify 渲染的气泡 DOM，避免登出后残留
  document.getElementById(SCRIPT_ID)?.remove()
  document.getElementById('dify-chatbot-bubble-button')?.remove()
  document.getElementById('dify-chatbot-bubble-window')?.remove()
  delete (window as any).difyChatbotConfig
}

// 登录后注入 Dify 聊天，登出时清理
watch(isLoggedIn, (val) => {
  if (val) loadDify()
  else unloadDify()
}, { immediate: true })

// useAuth 各实例数据相互独立：登录/登出由 useAuth 广播 auth:changed，
// 这里刷新本实例的 auth 数据后再决定注入/清理（无需整页刷新）
let authTimer: ReturnType<typeof setTimeout> | null = null
async function onAuthChanged() {
  if (authTimer) clearTimeout(authTimer)
  authTimer = setTimeout(async () => {
    await refreshUser()
    if (isLoggedIn.value) loadDify()
    else unloadDify()
  }, 100)
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:changed', onAuthChanged)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('auth:changed', onAuthChanged)
  }
  unloadDify()
})
</script>

<style>
/* Dify embed 的窗口默认 position: absolute 且无 scroll 监听，长页面滚动时
   窗口会停在文档顶部而不跟随视口。这里强制钉到视口右下角（fixed）。 */
#dify-chatbot-bubble-button {
  position: fixed !important;
  bottom: calc(1rem + 50px) !important;
  right: 1rem !important;
  top: auto !important;
  left: auto !important;
  background-color: #1C64F2 !important;
}
#dify-chatbot-bubble-window {
  position: fixed !important;
  bottom: calc(1rem + 106px) !important;
  right: 1rem !important;
  top: auto !important;
  left: auto !important;
  width: 24rem !important;
  height: 40rem !important;
}
</style>
