<template>
  <div class="umo-node-view" :style="nodeStyle" data-node-view-wrapper="">
    <div
      class="umo-node-container hover-shadow umo-select-outline umo-node-file umo-node-file--wide"
    >
      <div class="umo-file-icon">
        <img v-if="!iconFailed" :src="iconUrl" class="icon-file" @error="iconFailed = true" />
        <UIcon v-else :name="iconFallback" class="icon-fallback" />
      </div>
      <div class="umo-file-info">
        <div class="umo-file-name" :title="attrs.name || ''">
          {{ attrs.name || $t('ueditor.file.unknown') }}
        </div>
        <div class="umo-file-meta">{{ sizeText }}</div>
      </div>
      <div class="umo-file-action">
        <!-- Office 官方在线预览：仅公网真实域名时显示（MS 服务器需能访问该文件 URL） -->
        <UTooltip v-if="isOffice && showOfficeOfficial" :text="$t('ueditor.file.officeOfficial')">
          <UButton
            icon="i-lucide-external-link"
            variant="ghost"
            color="neutral"
            size="2xs"
            :href="officeEmbedUrl"
            target="_blank"
            rel="noopener"
            :aria-label="$t('ueditor.file.officeOfficial')"
          />
        </UTooltip>
        <!-- HTML 运行：全屏独立 iframe 运行该 HTML 代码 -->
        <UTooltip v-if="isHtmlRun" :text="$t('ueditor.file.run')">
          <UButton
            icon="i-lucide-play"
            variant="ghost"
            color="neutral"
            size="2xs"
            :aria-label="$t('ueditor.file.run')"
            @click="openRun"
          />
        </UTooltip>
        <!-- 本地预览 -->
        <UTooltip v-if="attrs.url" :text="$t('ueditor.file.preview')">
          <UButton
            icon="i-lucide-eye"
            variant="ghost"
            color="neutral"
            size="2xs"
            :aria-label="$t('ueditor.file.preview')"
            @click="openPreview"
          />
        </UTooltip>
        <!-- 下载 -->
        <UTooltip v-if="attrs.url" :text="$t('ueditor.file.download')">
          <UButton
            icon="i-lucide-download"
            variant="ghost"
            color="neutral"
            size="2xs"
            :href="attrs.url"
            :download="attrs.name"
            target="_blank"
            rel="noopener"
            :aria-label="$t('ueditor.file.download')"
          />
        </UTooltip>
      </div>
    </div>

    <!-- 预览弹层：显式 teleport 到 body（避免 UModal 在此渲染树中内联残留 DOM） -->
    <Teleport to="body">
      <div
        v-if="previewOpen"
        class="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-3 sm:p-5"
        @click.self="previewOpen = false"
      >
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full h-[88vh] flex flex-col overflow-hidden"
          :style="is3d ? 'max-width: 56rem' : ''">
          <div class="flex items-center justify-between px-4 py-2.5 border-b shrink-0">
            <span class="text-sm font-medium truncate pr-3">{{ attrs.name }}</span>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="previewOpen = false" />
          </div>
          <div class="flex-1 min-h-0 overflow-auto p-2">
            <Model3dRender v-if="previewKind === '3d'" :node="modelNode" />
            <OfficeRender v-else-if="previewKind === 'office'" :node="officeNode" />
            <ZipPreview v-else-if="previewKind === 'zip'" :url="attrs.url" :name="attrs.name" />
            <TextPreview v-else-if="previewKind === 'text'" :url="attrs.url" :name="attrs.name" />
            <div v-else class="py-10 text-center text-sm text-gray-400">{{ $t('common.loading') }}</div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- HTML 运行层：全屏独立 iframe 运行该 HTML -->
    <Teleport to="body">
      <div
        v-if="runOpen"
        class="fixed inset-0 z-[110] bg-white flex flex-col"
      >
        <div class="flex items-center justify-between px-4 py-2 bg-white text-gray-800 border-b border-gray-200 shrink-0">
          <span class="text-sm font-medium truncate pr-3">{{ attrs.name }}</span>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="runOpen = false" />
        </div>
        <iframe
          v-if="runHtml"
          :srcdoc="runHtml"
          class="flex-1 w-full min-h-0 border-0 bg-white"
          allowfullscreen
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-pointer-lock"
        ></iframe>
        <div v-else class="flex-1 flex items-center justify-center text-sm text-gray-400 bg-white">
          {{ runLoading ? $t('common.loading') : $t('ueditor.file.runFailed') }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import prettyBytes from 'pretty-bytes'
import OfficeRender from '../../extensions/nodes/vue/office/render.vue'
import Model3dRender from '../../extensions/nodes/vue/3d/render.vue'
import ZipPreview from './zip-preview.vue'
import TextPreview from './text-preview.vue'

import { computeAtomNodeStyle } from '../helpers'

// 文件类型图标改用本地 /vendor（由 scripts/copy-vendor-assets.mjs 从 @umoteam/editor-external 拷贝 icons/file）
const CDN_URL = '/vendor/editor-external'

const { t } = useI18n()
const toast = useToast()

const fileTypes = {
  ai: ['ai', 'eps'],
  app: ['app'],
  axure: ['rp'],
  book: ['mobi', 'oeb', 'lit', 'xeb', 'ebx', 'rb', 'pdb', 'epub', 'azw3', 'hlp', 'chm', 'wdl', 'ceb', 'abm', 'pdg', 'caj'],
  css: ['css', 'less', 'sass'],
  dmg: ['dmg'],
  excel: ['csv', 'fods', 'ods', 'ots', 'xls', 'xlsm', 'xlsx', 'xlt', 'xltm', 'xltx', 'et', 'ett'],
  exe: ['exe'],
  html: ['htm', 'html', 'mht'],
  img: ['png', 'bmp', 'jpg', 'jpeg', 'gif', 'webp', 'tga', 'exif', 'fpx', 'svg', 'hdri', 'raw', 'ico', 'jfif', 'dib', 'pbm', 'pgm', 'ppm', 'rgb'],
  java: ['jar', 'java'],
  js: ['js', 'jsx', 'ts', 'tsx'],
  json: ['json'],
  keynote: ['key'],
  md: ['md', 'markdown'],
  music: ['au', 'aif', 'aiff', 'aifc', 'rmi', 'mp3', 'mid', 'cda', 'wav', 'wma', 'ra', 'ram', 'snd', 'mida', 'ogg', 'ape', 'flac', 'aac'],
  numbers: ['numbers'],
  pages: ['pages'],
  pdf: ['pdf'],
  ppt: ['dps', 'dpt', 'pot', 'potm', 'potx', 'pps', 'ppsm', 'ppsx', 'ppt', 'pptm', 'pptx'],
  psd: ['psd'],
  rar: ['rar', '7z', 'gz', 'tar', 'zip'],
  sketch: ['sketch'],
  txt: ['txt', 'log'],
  video: ['wmv', 'rmvb', 'mpeg4', 'mp4', 'avi', 'rm', 'flv', 'mkv', 'mov', '3gp', 'f4v', 'asf', 'mts', 'vob'],
  visio: ['vsd', 'vsdx'],
  word: ['doc', 'docm', 'docx', 'dot', 'dotm', 'dotx', 'rtf', 'wps', 'wpt'],
  xd: ['xd'],
}

const getFileIcon = (filename) => {
  let iconName = 'common'
  const extname = filename?.split('.').pop()?.toLowerCase()
  if (extname) {
    // 压缩/归档：CDN 有按扩展名命名的图标（zip.svg/rar.svg 等），直接用扩展名
    if (['zip', 'rar', '7z', 'gz', 'tar', 'bz2', 'xz', 'tgz'].includes(extname)) {
      return extname
    }
    for (const type of Object.keys(fileTypes)) {
      if (fileTypes[type].includes(extname)) {
        iconName = type
      }
    }
  }
  return iconName
}

const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})

const nodeStyle = computed(() => computeAtomNodeStyle(attrs.value))

const iconUrl = computed(
  () => `${CDN_URL}/icons/file/${getFileIcon(attrs.value.name)}.svg`,
)

// CDN 图标加载失败时兜底：用 lucide 图标（个别类型 CDN 可能缺图/返回 404）
const iconFailed = ref(false)
const iconFallback = computed(() => {
  const e = ext.value
  if (IMG_EXT.includes(e)) return 'i-lucide-image'
  if (TEXT_EXT.includes(e)) return 'i-lucide-file-text'
  if (ARCHIVE_EXT.includes(e)) return 'i-lucide-file-archive'
  if (OFFICE_EXT.includes(e)) return 'i-lucide-file-spreadsheet'
  if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(e)) return 'i-lucide-video'
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(e)) return 'i-lucide-music'
  if (e === 'pdf') return 'i-lucide-file-text'
  return 'i-lucide-file'
})

const sizeText = computed(() =>
  attrs.value.size ? prettyBytes(attrs.value.size) : t('ueditor.file.unknownSize'),
)

// Office 类型：是否显示「跳转 MS 官方预览」按钮
const isOffice = computed(() => OFFICE_EXT.includes(ext.value) && !/^blob:/i.test(attrs.value.url || ''))

// 仅当服务器是公网真实域名（非 IP / 本地开发）才显示 office 官方预览：
// MS 的在线预览服务需要能访问该文件 URL，局域网/本地地址无法被其回访。
const showOfficeOfficial = computed(() => {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname || ''
  if (!host || host === 'localhost' || host.endsWith('.localhost')) return false
  // IPv6
  if (host.includes(':')) return false
  // IPv4：纯数字点分，或属于私有/保留网段
  if (/^\d+(\.\d+){3}$/.test(host)) {
    const seg = host.split('.').map(Number)
    const [a, b] = seg
    if (a === 127 || a === 0) return false
    if (a === 10) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a >= 224) return false
  }
  return true
})

const officeEmbedUrl = computed(() => {
  if (!isOffice.value) return ''
  const url = attrs.value.url
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
})

// ============ 预览：可在浏览器端 JS 预览的才用 Modal，否则新开 tab ============
const ext = computed(() => (attrs.value.name || '').split('.').pop()?.toLowerCase() || '')

const MODEL_EXT = ['stl', 'obj', 'glb', 'gltf', 'fbx', '3ds', 'ply', 'dae', 'off', 'step', 'stp', 'iges', 'igs', 'ifc', '3mf', 'amf', 'blend', 'dwg', 'dxf']
const OFFICE_EXT = ['doc', 'docx', 'docm', 'dot', 'rtf', 'wps', 'xls', 'xlsx', 'csv', 'ods', 'ppt', 'pptx', 'dps', 'pot']
// 压缩包：zip 可用 jszip 浏览器端解析预览；rar/7z/tar/gz 无法纯前端解析，走新开 tab
const ZIP_EXT = ['zip']
// 常见压缩/归档扩展（zip 图标直接走本地 lucide 兜底）
const ARCHIVE_EXT = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz']
// 纯文本 / 代码：本地 Modal 直接展示
const TEXT_EXT = [
  'txt', 'md', 'markdown', 'log', 'text', 'ini', 'conf', 'properties', 'env',
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'h', 'cpp', 'hpp', 'cs', 'php',
  'json', 'xml', 'yaml', 'yml', 'toml', 'html', 'htm', 'css', 'scss', 'less', 'vue', 'svelte',
  'sh', 'bash', 'zsh', 'bat', 'ps1', 'sql', 'csv', 'graphql', 'dockerfile',
]

const previewKind = ref('')
const previewOpen = ref(false)

// HTML 文件：是否显示「运行」按钮（全屏 iframe 独立运行）
const HTML_EXT = ['html', 'htm', 'mht']
const isHtml = computed(() => HTML_EXT.includes(ext.value) && !!attrs.value.url)
const isHtmlRun = computed(() => isHtml.value && attrs.value.uploaded !== false)
const runOpen = ref(false)
const runHtml = ref('')

// 打开运行层：抓取 HTML 文本用 srcdoc 运行（服务端对 .html 以 text/plain 返回防止存储型 XSS，
// 直接 iframe src 会显示源码而非运行效果，故需取回内容后用 srcdoc 渲染）
const runLoading = ref(false)
async function openRun() {
  if (!attrs.value.url) return
  runOpen.value = true
  runLoading.value = true
  runHtml.value = ''
  try {
    const res = await fetch(attrs.value.url, { method: 'GET', credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    runHtml.value = await res.text()
  } catch (e) {
    console.warn('[ueditor] html run fetch failed:', e)
    runHtml.value = ''
  } finally {
    runLoading.value = false
  }
}

const is3d = computed(() => previewKind.value === '3d')

// 3D / Office 预览用「假节点」复用已有渲染组件
const modelNode = computed(() => ({
  attrs: {
    content: JSON.stringify({
      models: [{ name: attrs.value.name || 'model', url: attrs.value.url }],
      height: 640,
      bg: '#e0f2fe',
      autoRotate: true,
    }),
  },
}))
const officeNode = computed(() => ({
  attrs: {
    content: JSON.stringify({
      url: attrs.value.url,
      height: 760,
      name: attrs.value.name || '',
    }),
  },
}))

function openPreview() {
  if (!attrs.value.url) return
  // 未上传到服务器的 blob 临时 URL（编辑器残留），fetch 必然失败
  if (attrs.value.uploaded === false && /^blob:/i.test(attrs.value.url)) {
    toast.add({ title: t('ueditor.file.notUploaded'), color: 'warning' })
    return
  }
  const e = ext.value
  if (MODEL_EXT.includes(e)) {
    previewKind.value = '3d'
    previewOpen.value = true
  } else if (OFFICE_EXT.includes(e)) {
    previewKind.value = 'office'
    previewOpen.value = true
  } else if (ZIP_EXT.includes(e)) {
    previewKind.value = 'zip'
    previewOpen.value = true
  } else if (TEXT_EXT.includes(e)) {
    previewKind.value = 'text'
    previewOpen.value = true
  } else {
    // pdf / 图片 / 视频 / 音频 / 其他二进制压缩格式等：浏览器原生能显示就先看，否则会触发下载 → 新开 tab
    window.open(attrs.value.url, '_blank')
  }
}

// 按 Esc 退出 HTML 全屏运行层
onMounted(() => {
  const onKey = (e) => {
    if (e.key === 'Escape' && runOpen.value) runOpen.value = false
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})
</script>

<style scoped>
/* 文件卡片：整行、现代化横向布局 */
.umo-node-view {
  width: 100% !important;
  min-width: 0;
}

.umo-node-file--wide {
  width: 100% !important;
  min-width: 0;
}

.umo-node-file.umo-node-container {
  width: 100% !important;
  box-sizing: border-box;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.umo-node-file.umo-node-container:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.umo-node-file .umo-file-icon {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.umo-node-file .umo-file-icon .icon-file {
  width: 40px;
  height: 40px;
  object-fit: contain;
  display: block;
}
.umo-node-file .umo-file-icon .icon-fallback {
  width: 34px;
  height: 34px;
  color: #94a3b8;
}

.umo-node-file .umo-file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.umo-node-file .umo-file-name {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.umo-node-file .umo-file-meta {
  font-size: 12px;
  color: #94a3b8;
}

.umo-node-file .umo-file-action {
  flex: none;
  display: flex;
  align-items: center;
  gap: 2px;
}

.umo-node-file .umo-file-action :deep(.u-button) {
  color: #64748b;
  width: 28px;
  height: 28px;
  padding: 0;
  justify-content: center;
  border-radius: 6px;
}
.umo-node-file .umo-file-action :deep(.u-button:hover) {
  background: #f1f5f9;
  color: #2563eb;
}
</style>