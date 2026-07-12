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
</script>
