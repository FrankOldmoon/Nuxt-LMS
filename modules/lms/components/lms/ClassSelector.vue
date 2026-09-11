<template>
  <USelectMenu
    v-model="selectedClassId"
    :items="classOptions"
    value-key="value"
    option-attribute="label"
    :placeholder="$t('classSelector.selectClass')"
    size="sm"
    class="w-56"
    @change="onChange"
  />
</template>

<script setup lang="ts">
import { switchDefaultClass } from '../../composables/useDefaultClassSwitch'

const props = defineProps<{
  courseId?: number
}>()

const { classes, classOptions, loadClasses } = useClasses()
const { user } = useAuth()

loadClasses()

// 绑定当前默认班级；外部（侧边目录/其他弹窗）切换 defaultClass 时同步
const selectedClassId = ref<number | null>(null)
watch(
  () => user.value?.defaultClass?.id,
  (v) => { selectedClassId.value = v ?? null },
  { immediate: true },
)

// USelectMenu 的 @change 在 v-model 更新后触发，selectedClassId 已是新值
async function onChange() {
  const id = selectedClassId.value
  if (!id) return
  const cls = classes.value.find((c) => c.id === id)
  if (!cls) return
  await switchDefaultClass(id, cls.name, props.courseId || 0)
}
</script>