import type { ColumnMeta } from '../utils/types'
import { widgetFor } from '../utils/widgetMap'

/**
 * CForm formState and submit logic
 *
 * Manages form / jsonStrings / jsonErrors / fkOptions / fkLoading / saving state,
 * encapsulates initForm (initialize + load FK options), validateJson, onSubmit (validate + assemble data).
 *
 * Extracted from CForm.vue, so the component only handles rendering.
 *
 * @param editableColumns Editable columns (readonly excluded)
 * @param row Edit row (null when adding new)
 */
export function useCForm(
  editableColumns: ComputedRef<ColumnMeta[]>,
  row: ComputedRef<Record<string, any> | null>,
  emit: (event: 'submit', data: Record<string, any>) => void,
  open: Ref<boolean>,
) {
  const { t } = useI18n()
  const toast = useToast()

  const form = reactive<Record<string, any>>({})
  const jsonStrings = reactive<Record<string, string>>({})
  const jsonErrors = reactive<Record<string, boolean>>({})
  const fkOptions = reactive<Record<string, { id: number; label: string }[]>>({})
  const fkLoading = reactive<Record<string, boolean>>({})
  const saving = ref(false)

  /** Initialize formData + load FK options */
  async function initForm() {
    Object.keys(form).forEach((k) => delete form[k])
    Object.keys(jsonStrings).forEach((k) => delete jsonStrings[k])
    Object.keys(jsonErrors).forEach((k) => delete jsonErrors[k])

    for (const col of editableColumns.value) {
      const val = row.value?.[col.jsName]
      const w = widgetFor(col)
      if (w === 'json') {
        jsonStrings[col.jsName] = val != null ? JSON.stringify(val, null, 2) : ''
      } else if (w === 'richEditor') {
        form[col.jsName] = val !== undefined ? val : { type: 'doc', content: [] }
      } else if (val !== undefined) {
        form[col.jsName] = val
      } else if (w === 'boolean') {
        form[col.jsName] = false
      } else {
        form[col.jsName] = null
      }
    }

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
    if (!s || !s.trim()) { jsonErrors[col.jsName] = false; return true }
    try { JSON.parse(s); jsonErrors[col.jsName] = false; return true }
    catch { jsonErrors[col.jsName] = true; return false }
  }

  async function onSubmit() {
    let valid = true
    for (const col of editableColumns.value) {
      if (widgetFor(col) === 'json' && !validateJson(col)) valid = false
      if (col.notNull && !col.hasDefault && (form[col.jsName] === null || form[col.jsName] === '' || form[col.jsName] === undefined)) {
        valid = false
        toast.add({ title: `${col.jsName}: ${t('admin.form.required')}`, color: 'error' })
      }
    }
    if (!valid) return

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
    try { emit('submit', data); open.value = false }
    finally { saving.value = false }
  }

  watch(open, (val) => { if (val) initForm() })

  return { form, jsonStrings, jsonErrors, fkOptions, fkLoading, saving, initForm, onSubmit }
}
