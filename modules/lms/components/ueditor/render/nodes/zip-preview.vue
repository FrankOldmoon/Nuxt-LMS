<template>
  <div class="zip-preview">
    <div v-if="loading" class="zip-state">{{ $t('ueditor.file.loadingZip') }}</div>
    <div v-else-if="error" class="zip-state zip-error">{{ error }}</div>
    <template v-else>
      <div class="zip-summary">
        {{ $t('ueditor.file.zipSummary', { files: fileCount }) }}
        <span v-if="totalSize" class="ml-2 text-gray-400">{{ totalSize }}</span>
      </div>
      <div class="zip-list">
        <!-- 文件夹：纯行展示 -->
        <div v-for="e in dirs" :key="e.name" class="zip-dir">
          <UIcon name="i-lucide-folder" class="zip-dir-icon" />
          <span class="zip-dir-name">{{ e.name }}</span>
        </div>
        <!-- 文件：直接用 file.vue 渲染（卡片 + 预览/下载），支持包内直接预览 -->
        <FileView
          v-for="e in files"
          :key="e.name"
          :node="e.node"
          allow-blob
          class="zip-file-row"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import JSZip from 'jszip'
import FileView from './file.vue'

const props = defineProps({
  url: { type: String, required: true },
  name: { type: String, default: '' },
})

const { t } = useI18n()
const loading = ref(true)
const error = ref('')
const dirs = ref([])
const files = ref([])
const totalSize = ref('')
const fileCount = ref(0)

function pretty(n) {
  if (!n || n <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(i ? 1 : 0)} ${units[i]}`
}

let zip = null
let blobUrls = []

const MIME_MAP = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', ico: 'image/x-icon',
  txt: 'text/plain', md: 'text/markdown', json: 'application/json', xml: 'application/xml', html: 'text/html', csv: 'text/csv', log: 'text/plain',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
}
function mimeFor(name) {
  const ext = (name.split('.').pop() || '').toLowerCase()
  return MIME_MAP[ext] || 'application/octet-stream'
}

function revokeBlobs() {
  blobUrls.forEach((u) => URL.revokeObjectURL(u))
  blobUrls = []
}

onMounted(async () => {
  try {
    const resp = await fetch(props.url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const ab = await resp.arrayBuffer()
    zip = await JSZip.loadAsync(ab)

    const nameList = Object.keys(zip.files).sort()
    const d = []
    const f = []
    let size = 0
    let count = 0

    for (const name of nameList) {
      const entry = zip.files[name]
      if (entry.dir) {
        d.push({ name })
      } else {
        const s = entry._data ? entry._data.uncompressedSize || 0 : 0
        size += s
        count++
        // 把包内条目抽成 blob URL（按扩展名给正确 MIME），交给 file.vue 复用预览/下载
        let blobUrl = ''
        try {
          const bytes = await entry.async('uint8array')
          blobUrl = URL.createObjectURL(new Blob([bytes], { type: mimeFor(name) }))
          blobUrls.push(blobUrl)
        } catch (_) { /* 个别条目抽失败也不影响列表 */ }
        f.push({
          name,
          size: s,
          node: {
            attrs: { name, size: s, url: blobUrl || '', uploaded: true },
          },
        })
      }
    }

    dirs.value = d
    files.value = f
    if (size) totalSize.value = pretty(size)
    fileCount.value = count
    loading.value = false
  } catch (e) {
    error.value = `${t('ueditor.file.zipError')}: ${e?.message || String(e)}`
    loading.value = false
  }
})

onBeforeUnmount(revokeBlobs)
</script>

<style scoped>
.zip-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 200px;
}
.zip-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #9ca3af;
}
.zip-error {
  color: #ef4444;
}
.zip-summary {
  font-size: 13px;
  color: #6b7280;
  padding: 2px 2px;
}
.zip-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 70vh;
  overflow: auto;
  padding: 2px;
}
.zip-dir {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 13px;
  color: #4b5563;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}
.zip-dir-icon { color: #94a3b8; flex: none; }
.zip-dir-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>