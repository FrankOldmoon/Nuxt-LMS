<template>
  <div>
    <!-- 拖拽上传区域 -->
    <div
      class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
      :class="isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'"
      @click="handleClick"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        :multiple="multiple"
        class="hidden"
        @change="handleFileChange"
      />
      
      <div class="flex flex-col items-center gap-2">
        <UIcon name="i-heroicons-cloud-arrow-up" class="w-10 h-10 text-gray-400" />
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ placeholder || $t('upload.dragHint') }}
        </p>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          {{ $t('upload.clickHint') }}
        </p>
        <UButton
          icon="i-lucide-hard-drive"
          color="neutral"
          variant="outline"
          size="xs"
          class="mt-1"
          :label="$t('myFiles.pickFromDrive')"
          @click.stop="driveOpen = true"
        />
      </div>

      <!-- URL 输入 -->
      <div class="mt-3 flex items-center gap-2" @click.stop>
        <UInput
          v-model="urlInput"
          :placeholder="$t('upload.urlPlaceholder')"
          size="sm"
          icon="i-lucide-link"
          class="flex-1"
          @keydown.enter="addUrl"
        />
        <UButton
          icon="i-lucide-plus"
          color="primary"
          variant="outline"
          size="sm"
          :disabled="!urlInput.trim()"
          @click="addUrl"
        />
      </div>
    </div>

    <!-- 网盘文件选择弹窗 -->
    <FilesMyFilesModal
      v-model:open="driveOpen"
      picker
      :multiple="multiple"
      @confirm="onDriveConfirm"
    />
    
    <!-- 上传列表 -->
    <div v-if="fileList.length > 0" class="mt-4 space-y-2">
      <div
        v-for="(file, idx) in fileList"
        :key="idx"
        class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
      >
        <!-- 文件图标 -->
        <UIcon :name="getFileIcon(file.name)" class="w-8 h-8 text-gray-400 flex-shrink-0" />
        
        <!-- 文件信息 -->
        <div class="flex-1 min-w-0">
          <p class="text-sm truncate">{{ file.name }}</p>
          <p class="text-xs text-gray-400">{{ formatSize(file.size) }}</p>
        </div>
        
        <!-- 上传状态 -->
        <div class="flex items-center gap-2">
          <!-- 上传中 -->
          <UIcon v-if="file.status === 'uploading'" name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-primary-500" />
          
          <!-- 上传成功 -->
          <UIcon v-else-if="file.status === 'success'" name="i-heroicons-check-circle" class="w-5 h-5 text-green-500" />
          
          <!-- 上传失败 -->
          <UIcon v-else-if="file.status === 'error'" name="i-heroicons-x-circle" class="w-5 h-5 text-red-500" />
          
          <!-- 删除按钮 -->
          <UButton
            v-if="file.status !== 'uploading'"
            variant="ghost"
            size="xs"
            icon="i-heroicons-trash"
            class="text-red-500 hover:text-red-600"
            @click="removeFile(idx)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Array], default: () => [] },
  multiple: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const isDragging = ref(false)
const fileList = ref([])
const driveOpen = ref(false)
const urlInput = ref('')

// 通过 URL 添加文件
function addUrl() {
  const url = urlInput.value.trim()
  if (!url) return
  const name = url.split('/').pop()?.split('?')[0] || 'file'
  fileList.value.push({
    name: decodeURIComponent(name),
    size: 0,
    status: 'success',
    url,
  })
  urlInput.value = ''
  updateModelValue()
}

// 从网盘选择文件
function onDriveConfirm(selectedFiles) {
  for (const f of selectedFiles) {
    fileList.value.push({
      name: f.name,
      size: f.size,
      status: 'success',
      url: f.url,
    })
  }
  updateModelValue()
}

function handleClick() {
  fileInput.value?.click()
}

function handleDrop(e) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length > 0) {
    uploadFiles(files)
  }
}

function handleFileChange(e) {
  const files = Array.from(e.target.files || [])
  if (files.length > 0) {
    uploadFiles(files)
  }
  // 清空 input 值，允许重复选择同一文件
  e.target.value = ''
}

async function uploadFiles(files) {
  // 并行上传所有文件
  const uploadPromises = files.map(file => uploadSingleFile(file))
  await Promise.all(uploadPromises)
}

async function uploadSingleFile(file) {
  const fileItem = {
    name: file.name,
    size: file.size,
    status: 'uploading',
    url: '',
  }
  fileList.value.push(fileItem)
  
  try {
    const formData = new FormData()
    formData.append('files', file)
    
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
    })
    
    const result = await response.json()
    
    if (result.success) {
      fileItem.status = 'success'
      fileItem.url = result.data.url
      
      // 更新 v-model
      updateModelValue()
    } else {
      fileItem.status = 'error'
      console.error('上传失败:', result.message)
    }
  } catch (error) {
    fileItem.status = 'error'
    console.error('上传出错:', error)
  }
}

function removeFile(idx) {
  fileList.value.splice(idx, 1)
  updateModelValue()
}

function updateModelValue() {
  const urls = fileList.value
    .filter(f => f.status === 'success')
    .map(f => f.url)
  
  if (props.multiple) {
    emit('update:modelValue', urls)
  } else {
    emit('update:modelValue', urls[0] || '')
  }
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  const iconMap = {
    pdf: 'i-heroicons-document-text',
    doc: 'i-heroicons-document',
    docx: 'i-heroicons-document',
    xls: 'i-heroicons-table-cells',
    xlsx: 'i-heroicons-table-cells',
    ppt: 'i-heroicons-presentation-chart-bar',
    pptx: 'i-heroicons-presentation-chart-bar',
    jpg: 'i-heroicons-photo',
    jpeg: 'i-heroicons-photo',
    png: 'i-heroicons-photo',
    gif: 'i-heroicons-photo',
    mp4: 'i-heroicons-video-camera',
    mp3: 'i-heroicons-musical-note',
    zip: 'i-heroicons-archive-box',
    rar: 'i-heroicons-archive-box',
  }
  return iconMap[ext] || 'i-heroicons-document'
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>
