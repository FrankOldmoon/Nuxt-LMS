<template>
  <div>
    <!-- 拖拽上传区域 -->
    <FormInputFileDropzone
      :multiple="multiple"
      :placeholder="placeholder"
      @files-selected="uploadFiles"
      @url-added="addUrl"
      @drive-open="driveOpen = true"
    />

    <!-- 网盘文件选择弹窗 -->
    <FilesMyFilesModal
      v-model:open="driveOpen"
      picker
      :multiple="multiple"
      @confirm="onDriveConfirm"
    />

    <!-- 上传列表 -->
    <FormInputFileList :files="fileList" @remove="removeFile" />
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: [String, Array], default: () => [] },
  multiple: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const {
  fileList,
  driveOpen,
  uploadFiles,
  addUrl,
  onDriveConfirm,
  removeFile,
} = useFileUploader(
  () => props.multiple,
  (val) => emit('update:modelValue', val),
)

// 暴露 fileList 给父组件访问（含本地原始文件名）
defineExpose({ fileList })

// 同步外部 modelValue（如已加载的历史提交文件）到 fileList
// 避免外部已存在的文件不显示，以及新上传时把历史文件覆盖丢失
watch(() => props.modelValue, (val) => {
  const urls = Array.isArray(val) ? val : (val ? [val] : [])
  const urlSet = new Set(urls.filter(Boolean))
  // 移除已不在 modelValue 中的 success 项（保留 uploading/error 项，避免打断进行中的上传）
  fileList.value = fileList.value.filter(f => f.status !== 'success' || urlSet.has(f.url))
  // 补充 modelValue 中存在但 fileList 缺失的项
  const existing = new Set(fileList.value.map(f => f.url).filter(Boolean))
  for (const url of urls) {
    if (url && !existing.has(url)) {
      const item = { name: getFileNameFromUrl(url), size: 0, status: 'success', url }
      fileList.value.push(item)
      // 历史 url 只含哈希路径：异步从服务端补全原始文件名与大小（失败保留 url 解析名）
      fetchFileMeta(url, item)
    }
  }
}, { immediate: true, deep: true })

// 通过 /api/files/meta 按 pathname 补全文件元数据（name/size）
async function fetchFileMeta(url, item) {
  try {
    const u = new URL(url, window.location.origin)
    const pathname = u.searchParams.get('pathname')
    if (!pathname) return
    const data = await cRequest(`/api/files/meta?pathname=${encodeURIComponent(pathname)}`)
    if (data?.name) item.name = data.name
    if (data?.size != null) item.size = Number(data.size)
  } catch {
    // 补全失败保持 url 解析名
  }
}
</script>
