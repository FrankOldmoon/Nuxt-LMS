<template>
  <!-- 图片：原生展示 -->
  <img v-if="kind === 'image'" :key="url" :src="url" :alt="name" class="fp-image" />
  <!-- 视频：原生播放器撑满容器 -->
  <video v-else-if="kind === 'video'" :key="url" :src="url" controls preload="metadata" class="fp-video" />
  <!-- PDF：浏览器原生预览 -->
  <iframe v-else-if="kind === 'pdf'" :key="url" :src="url" class="fp-iframe" />
  <!-- ueditor file 扩展渲染器：3d 模型 / office（vue-office）/ zip / 文本代码 -->
  <Model3dRender v-else-if="kind === '3d'" :node="modelNode" />
  <OfficeRender v-else-if="kind === 'office'" :node="officeNode" />
  <ZipPreview v-else-if="kind === 'zip'" :url="url" :name="name" />
  <TextPreview v-else-if="kind === 'text'" :url="url" :name="name" :allow-blob="allowBlob" />
  <!-- 其他类型：无法在线预览，仅提供下载 -->
  <div v-else class="fp-fallback">
    <UIcon name="i-heroicons-paperclip" class="w-10 h-10" />
    <span class="text-sm">{{ name || url }}</span>
    <UButton :to="url" target="_blank" icon="i-heroicons-arrow-down-tray" :label="$t('common.download')" color="primary" size="sm" />
  </div>
</template>

<script setup>
import OfficeRender from '../../extensions/nodes/vue/office/render.vue'
import Model3dRender from '../../extensions/nodes/vue/3d/render.vue'
import ZipPreview from './zip-preview.vue'
import TextPreview from './text-preview.vue'

/**
 * ueditor file 扩展的「预览模式」渲染：按扩展名把文件交给对应预览器，
 * 供作业详情等编辑器之外的场景复用（file.vue 的预览弹层使用同一套渲染器）。
 * props: url（文件地址）、name（原始文件名，用于识别扩展名）。
 */
const props = defineProps({
  url: { type: String, default: '' },
  name: { type: String, default: '' },
  // 允许 blob: URL（本地文件预览，如 /preview 页面）
  allowBlob: { type: Boolean, default: false },
})

// 与 file.vue 一致的类型分类
const MODEL_EXT = ['stl', 'obj', 'glb', 'gltf', 'fbx', '3ds', 'ply', 'dae', 'off', 'step', 'stp', 'iges', 'igs', 'ifc', '3mf', 'amf', 'blend', 'dwg', 'dxf']
const OFFICE_EXT = ['doc', 'docx', 'docm', 'dot', 'rtf', 'wps', 'xls', 'xlsx', 'csv', 'ods', 'ppt', 'pptx', 'dps', 'pot']
const ZIP_EXT = ['zip']
const TEXT_EXT = [
  'txt', 'md', 'markdown', 'log', 'text', 'ini', 'conf', 'properties', 'env',
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'h', 'cpp', 'hpp', 'cs', 'php',
  'json', 'xml', 'yaml', 'yml', 'toml', 'html', 'htm', 'css', 'scss', 'less', 'vue', 'svelte',
  'sh', 'bash', 'zsh', 'bat', 'ps1', 'sql', 'graphql', 'dockerfile',
]
const IMG_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif']
const VIDEO_EXT = ['mp4', 'webm', 'mov']

// 扩展名：优先取原始文件名；缺失时从 url 解析（兼容 /api/files/serve?pathname=x%2Fa.docx）
function extFromUrl(u) {
  try {
    const parsed = new URL(u, 'http://localhost')
    const p = parsed.searchParams.get('pathname') || parsed.pathname
    return decodeURIComponent(p).split('.').pop()?.toLowerCase() || ''
  } catch {
    return ''
  }
}
const ext = computed(() => {
  const fromName = (props.name || '').split('.').pop()?.toLowerCase()
  return fromName || extFromUrl(props.url)
})

const kind = computed(() => {
  const e = ext.value
  if (!e) return 'other'
  if (OFFICE_EXT.includes(e)) return 'office'
  if (ZIP_EXT.includes(e)) return 'zip'
  if (MODEL_EXT.includes(e)) return '3d'
  if (TEXT_EXT.includes(e)) return 'text'
  if (IMG_EXT.includes(e)) return 'image'
  if (VIDEO_EXT.includes(e)) return 'video'
  if (e === 'pdf') return 'pdf'
  return 'other'
})

// office / 3d 预览器以 vue node 为入参，这里构造假节点复用
const officeNode = computed(() => ({
  attrs: {
    content: JSON.stringify({
      url: props.url,
      height: 760,
      name: props.name || '',
    }),
  },
}))
const modelNode = computed(() => ({
  attrs: {
    content: JSON.stringify({
      models: [{ name: props.name || 'model', url: props.url }],
      height: 640,
      bg: '#e0f2fe',
      autoRotate: true,
    }),
  },
}))
</script>

<style scoped>
.fp-image {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  height: auto;
}
.fp-video {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 320px;
  background: #000;
}
.fp-iframe {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 480px;
  border: 0;
  background: #fff;
}
.fp-fallback {
  height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--ui-text-muted, #9ca3af);
}
</style>
