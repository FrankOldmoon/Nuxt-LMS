<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-2xl' }" scrollable>
    <template #content>
      <component
        v-if="hasFormOverride"
        :is="override.form"
        :row="row"
        @saved="(d) => { emit('saved', d); open = false }"
        @cancel="open = false"
      />
      <div v-else class="p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold">
            {{ isEdit ? t('admin.table.editRecord') : t('admin.table.addNew') }}
          </h3>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="open = false" />
        </div>

        <div class="space-y-3 max-h-[65vh] overflow-auto pr-1">
          <UFormField
            v-for="col in editableColumns"
            :key="col.jsName"
            :label="col.jsName"
            :required="col.notNull && !col.hasDefault"
            :description="col.fkTable ? `→ ${col.fkTable}` : col.dataType"
          >
            <!-- 日期 -->
            <UInput
              v-if="widget(col) === 'date'"
              v-model="form[col.jsName]"
              :type="isDateTime(col) ? 'datetime-local' : 'date'"
              size="sm"
              class="w-full"
            />

            <!-- 布尔 -->
            <USwitch
              v-else-if="widget(col) === 'boolean'"
              v-model="form[col.jsName]"
            />

            <!-- 枚举 -->
            <USelect
              v-else-if="widget(col) === 'select'"
              v-model="form[col.jsName]"
              :items="col.enumValues?.map((v) => ({ label: v, value: v }))"
              value-key="value"
              :placeholder="t('admin.form.selectFk')"
              size="sm"
              class="w-full"
            />

            <!-- 外键 -->
            <USelectMenu
              v-else-if="widget(col) === 'fk'"
              v-model="form[col.jsName]"
              :items="fkOptions[col.jsName] || []"
              value-key="id"
              option-attribute="label"
              :placeholder="t('admin.form.selectFk')"
              :loading="fkLoading[col.jsName]"
              searchable
              size="sm"
              class="w-full"
            />

            <!-- 数字 -->
            <UInput
              v-else-if="widget(col) === 'number'"
              v-model.number="form[col.jsName]"
              type="number"
              size="sm"
              class="w-full"
            />

            <!-- Tiptap 富文本编辑（仅当 lms 启用 + RichEditor 组件存在；否则回退 JSON 文本域） -->
            <template v-else-if="widget(col) === 'richEditor'">
              <ClientOnly>
                <component
                  :is="richEditorComp"
                  v-if="richEditorComp"
                  v-model="form[col.jsName]"
                  :course-id="rowCourseId"
                />
                <UTextarea
                  v-else
                  v-model="jsonStrings[col.jsName]"
                  :rows="4"
                  size="sm"
                  class="w-full font-mono text-xs"
                  placeholder='{ }'
                />
                <template #fallback>
                  <UTextarea
                    v-model="jsonStrings[col.jsName]"
                    :rows="4"
                    size="sm"
                    class="w-full font-mono text-xs"
                    placeholder='{ }'
                  />
                </template>
              </ClientOnly>
              <div v-if="jsonErrors[col.jsName]" class="text-xs text-error mt-1">
                {{ t('admin.form.invalidJson') }}
              </div>
            </template>

            <!-- JSON（包入 template 恢复 v-if/v-else-if 单链，避免末尾 UInput v-else 对其它列额外渲染） -->
            <template v-else-if="widget(col) === 'json'">
              <UTextarea
                v-model="jsonStrings[col.jsName]"
                :rows="4"
                size="sm"
                class="w-full font-mono text-xs"
                placeholder='{ }'
              />
              <div v-if="jsonErrors[col.jsName]" class="text-xs text-error mt-1">
                {{ t('admin.form.invalidJson') }}
              </div>
            </template>

            <!-- 图标选择（FormInputIcon） -->
            <div v-else-if="widget(col) === 'icon'" class="flex items-center gap-2">
              <FormInputIcon
                v-model="form[col.jsName]"
                size="sm"
                :placeholder="t('admin.form.selectIcon')"
              />
              <UInput
                v-model="form[col.jsName]"
                size="sm"
                class="flex-1"
                :placeholder="t('admin.form.iconName')"
              />
            </div>

            <!-- 文件上传（FormInputFile，多文件） -->
            <div v-else-if="widget(col) === 'file'">
              <FormInputFile
                v-model="form[col.jsName]"
                multiple
                size="sm"
                :placeholder="t('admin.form.uploadFiles')"
              />
              <div v-if="form[col.jsName] && Array.isArray(form[col.jsName]) && form[col.jsName].length" class="mt-2 space-y-1">
                <div
                  v-for="(url, idx) in (form[col.jsName] as string[])"
                  :key="idx"
                  class="flex items-center gap-2 text-xs"
                >
                  <UIcon name="i-lucide-link" class="size-3 text-muted shrink-0" />
                  <a :href="url" target="_blank" class="text-blue-500 hover:underline truncate">{{ url }}</a>
                </div>
              </div>
            </div>

            <!-- 图片裁剪上传（ImageCropperTrigger + FormImageCropperModal） -->
            <div v-else-if="widget(col) === 'imageCropper'" class="space-y-2">
              <div class="flex items-center gap-2">
                <UInput
                  v-model="form[col.jsName]"
                  size="sm"
                  class="flex-1"
                  placeholder="https://..."
                />
                <UAvatar
                  v-if="form[col.jsName]"
                  :src="String(form[col.jsName])"
                  size="sm"
                  class="cursor-pointer"
                  @click="previewImage = true"
                />
                <TableImageCropperTrigger
                  @uploaded="(url) => { form[col.jsName] = url }"
                />
              </div>
              <UModal v-model:open="previewImage">
                <template #content>
                  <img :src="String(form[col.jsName])" class="max-w-full max-h-[80vh] mx-auto" />
                </template>
              </UModal>
            </div>

            <!-- 旧版 image（纯 URL，保留兼容） -->
            <div v-else-if="widget(col) === 'image'" class="flex items-center gap-2">
              <UInput v-model="form[col.jsName]" size="sm" class="flex-1" placeholder="https://..." />
              <UAvatar v-if="form[col.jsName]" :src="String(form[col.jsName])" size="sm" />
            </div>

            <!-- 密码 -->
            <UInput
              v-else-if="widget(col) === 'password'"
              v-model="form[col.jsName]"
              type="password"
              size="sm"
              class="w-full"
            />

            <!-- 文本 -->
            <UInput
              v-else
              v-model="form[col.jsName]"
              size="sm"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" variant="ghost" :label="t('admin.form.cancel')" @click="open = false" />
          <UButton color="primary" :label="t('admin.form.save')" :loading="saving" @click="onSubmit" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../utils/types'
import { widgetFor } from '../../utils/widgetMap'

const props = defineProps<{
  tableName: string
  columns: ColumnMeta[]
  /** 编辑时传入已有行；新增时为 null */
  row: Record<string, any> | null
}>()

const emit = defineEmits<{
  submit: [data: Record<string, any>]
  saved: [data: any]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const toast = useToast()
const { override, hasFormOverride } = useTableOverride(() => props.tableName)

/**
 * RichEditor 组件（LMS 提供，<ueditor> 弹窗式富文本编辑）。
 * lms 未启用或组件不可用 → null，回退到 JSON 文本域。
 */
const richEditorComp = computed(() => {
  if (!useRuntimeConfig().public.moduleLms) return null
  try {
    const c = resolveComponent('RichEditor')
    return c
  } catch {
    return null
  }
})

const isEdit = computed(() => !!props.row)
const form = reactive<Record<string, any>>({})
const jsonStrings = reactive<Record<string, string>>({})
const jsonErrors = reactive<Record<string, boolean>>({})
const fkOptions = reactive<Record<string, { id: number; label: string }[]>>({})
const fkLoading = reactive<Record<string, boolean>>({})
const saving = ref(false)

/**
 * 从当前行推导 courseId：admin 后台富文本编辑器（RichEditor）需要它来正确显示
 * 课程上下文内的 question / homework 等节点。优先 courseId，兼容 course_id 字段。
 */
const rowCourseId = computed(() => {
  const r: any = props.row
  if (!r) return undefined
  const v = r.courseId ?? r.course_id
  if (v === undefined || v === null || v === '') return undefined
  return Number(v) || undefined
})

const editableColumns = computed(() =>
  props.columns.filter((c) => widgetFor(c) !== 'readonly'),
)

function widget(col: ColumnMeta): string {
  return widgetFor(col)
}

function isDateTime(col: ColumnMeta): boolean {
  return col.columnType === 'PgTimestamp'
}

// ============ 图片裁剪 ============
const previewImage = ref(false)

/** 初始化表单数据 + 加载 FK 选项 */
async function initForm() {
  Object.keys(form).forEach((k) => delete form[k])
  Object.keys(jsonStrings).forEach((k) => delete jsonStrings[k])
  Object.keys(jsonErrors).forEach((k) => delete jsonErrors[k])

  for (const col of editableColumns.value) {
    const val = props.row?.[col.jsName]
    const w = widgetFor(col)
    if (w === 'json') {
      jsonStrings[col.jsName] = val != null ? JSON.stringify(val, null, 2) : ''
    } else if (w === 'richEditor') {
      // Tiptap JSON 对象直接进 form（RichEditor v-model 接受 string | object）
      if (val !== undefined) form[col.jsName] = val
      else form[col.jsName] = { type: 'doc', content: [] }
    } else if (val !== undefined) {
      form[col.jsName] = val
    } else if (w === 'boolean') {
      form[col.jsName] = false
    } else {
      form[col.jsName] = null
    }
  }

  // 加载 FK 选项
  for (const col of editableColumns.value) {
    if (widgetFor(col) === 'fk' && col.fkTable) {
      fkLoading[col.jsName] = true
      try {
        const opts = await cRequest<{ id: number; label: string }[]>(
          `/api/admin/fk-options?table=${col.fkTable}&label=${col.fkLabel || ''}`,
        )
        fkOptions[col.jsName] = opts || []
      } catch {
        fkOptions[col.jsName] = []
      } finally {
        fkLoading[col.jsName] = false
      }
    }
  }
}

function validateJson(col: ColumnMeta): boolean {
  const s = jsonStrings[col.jsName]
  if (!s || !s.trim()) {
    jsonErrors[col.jsName] = false
    return true
  }
  try {
    JSON.parse(s)
    jsonErrors[col.jsName] = false
    return true
  } catch {
    jsonErrors[col.jsName] = true
    return false
  }
}

async function onSubmit() {
  // 校验 JSON 字段
  let valid = true
  for (const col of editableColumns.value) {
    if (widgetFor(col) === 'json' && !validateJson(col)) valid = false
    // 必填校验
    if (col.notNull && !col.hasDefault && (form[col.jsName] === null || form[col.jsName] === '' || form[col.jsName] === undefined)) {
      valid = false
      toast.add({ title: `${col.jsName}: ${t('admin.form.required')}`, color: 'error' })
    }
  }
  if (!valid) return

  // 组装数据
  const data: Record<string, any> = {}
  for (const col of editableColumns.value) {
    if (widgetFor(col) === 'json') {
      const s = jsonStrings[col.jsName]
      data[col.jsName] = s && s.trim() ? JSON.parse(s) : null
    } else {
      data[col.jsName] = form[col.jsName]
    }
  }

  saving.value = true
  try {
    emit('submit', data)
    open.value = false
  } finally {
    saving.value = false
  }
}

watch(open, (val) => {
  if (val) initForm()
})
</script>
