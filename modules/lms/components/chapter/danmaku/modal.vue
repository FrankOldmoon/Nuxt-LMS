<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-4">
        <h3 class="text-base font-semibold mb-3">{{ $t('chapter.danmaku') }}</h3>

        <!-- 教师：控制学生能否发送弹幕（课程级配置） -->
        <div v-if="canEdit" class="flex items-center justify-between mb-3 pb-3 border-b border-default">
          <div>
            <p class="text-sm font-medium">{{ $t('chapter.danmakuToggle') }}</p>
            <p class="text-xs text-muted">{{ $t('chapter.danmakuToggleHint') }}</p>
          </div>
          <USwitch :model-value="allowStudentSend" @update:model-value="toggleStudentSend" />
        </div>

        <!-- 发送弹幕：教师或"允许学生发送"开启时 -->
        <div v-if="canEdit || allowStudentSend" class="flex gap-2">
          <UInput
            v-model="danmakuText"
            :placeholder="$t('chapter.danmakuPlaceholder')"
            maxlength="200"
            class="flex-1"
            @keyup.enter="sendDanmaku"
          />
          <UButton :label="$t('chapter.danmakuSend')" color="primary" size="sm" :disabled="!danmakuText.trim()" @click="sendDanmaku" />
        </div>
        <p v-else class="text-sm text-muted">{{ $t('chapter.danmakuDisabled') }}</p>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{ classId: number; canEdit: boolean }>()
const open = defineModel<boolean>('open', { default: false })

const { user } = useAuth()
const { courseId } = useLmsContext()
const { sendDanmaku: wsSendDanmaku } = useWebSocket()
const danmakuText = ref('')

// 课程级：学生是否可发送弹幕
const allowStudentSend = ref(true)

async function loadSendToggle() {
  if (!courseId.value) return
  try {
    const data = await cRequest(`/api/lms-config/course?course_id=${courseId.value}`)
    if (data && data.studentCanSend !== undefined) {
      allowStudentSend.value = !!data.studentCanSend
    }
  } catch (e) {
    // 读取失败保持默认
  }
}

async function toggleStudentSend(val: boolean) {
  const original = allowStudentSend.value
  allowStudentSend.value = val
  if (!courseId.value) return
  try {
    await cRequest('/api/lms-config/course', {
      method: 'POST',
      body: { course_id: courseId.value, danmaku: { studentCanSend: val } },
    })
  } catch (e) {
    allowStudentSend.value = original
  }
}

function sendDanmaku() {
  const text = danmakuText.value.trim()
  if (!text || !props.classId) return
  wsSendDanmaku(props.classId, text, user.value?.name || 'anonymous', Number(courseId.value) || 0, user.value?.id || 0)
  danmakuText.value = ''
  open.value = false
}

onMounted(loadSendToggle)
</script>