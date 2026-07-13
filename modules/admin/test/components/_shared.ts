/**
 * Shared test helpers for admin table component tests.
 *
 * - Exposes auto-imported admin composables onto globalThis (so .vue source
 *   files that rely on Nuxt auto-imports can run under vitest).
 * - Provides common NuxtUI / Nuxt component stubs used across table tests.
 *
 * Each test file imports { _globalStubs, _globalConfig, baseBeforeEach, makeColumn }
 * from this helper and may extend the stubs object with component-specific entries.
 */
export { describe, it, expect, beforeEach } from 'vitest'
export { mount, flushPromises } from '@vue/test-utils'
export { resetAllStubs, setMockI18n } from '../../../../test/setup/nuxt-stubs'

// admin composables — auto-imported in Nuxt, must be exposed for tests
import { useCellView } from '../../composables/useCellView'
import { useCForm } from '../../composables/useCForm'
import { useManagerIo } from '../../composables/useManagerIo'
import { useConfirmBatch } from '../../composables/useConfirmBatch'
import { useImportSheet } from '../../composables/useImportSheet'
import { useFkLabels } from '../../composables/useFkLabels'
import { useAdminTable } from '../../composables/useAdminTable'
import { useTableMeta } from '../../composables/useTableMeta'

/** Expose all admin auto-imported composables onto globalThis. Call in beforeEach. */
export function setupComposables() {
  ;(globalThis as any).useCellView = useCellView
  ;(globalThis as any).useCForm = useCForm
  ;(globalThis as any).useManagerIo = useManagerIo
  ;(globalThis as any).useConfirmBatch = useConfirmBatch
  ;(globalThis as any).useImportSheet = useImportSheet
  ;(globalThis as any).useFkLabels = useFkLabels
  ;(globalThis as any).useAdminTable = useAdminTable
  ;(globalThis as any).useTableMeta = useTableMeta
}

/** Default i18n mock — passes through the key (optionally interpolating params). */
export function _t(k: string, params?: any) {
  if (params) {
    let s = k
    for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
    return s
  }
  return k
}

/** Common NuxtUI / Nuxt component stubs. Extend per-test as needed. */
export const _globalStubs: Record<string, any> = {
  UPopover: { template: '<div class="popover"><slot /><slot name="content" /></div>', props: ['open', 'ui', 'content'] },
  UButton: {
    template: '<button class="ubtn" :disabled="loading" @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
    props: ['color', 'variant', 'size', 'loading', 'label', 'icon', 'to', 'disabled'],
  },
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'title', 'ui', 'scrollable'],
  },
  UInput: {
    template: '<input :type="type" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'icon', 'size'],
  },
  USelect: {
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in items || options || []" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'options', 'items', 'valueKey', 'size'],
  },
  USelectMenu: {
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in items || []" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'valueKey', 'size'],
  },
  UCheckbox: {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue', 'label'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  USkeleton: { template: '<div class="skeleton" />', props: ['class'] },
  UDropdown: { template: '<div><slot /><slot name="item" /></div>', props: ['items'] },
  UTextarea: { template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue'] },
  UBadge: { template: '<span class="ubadge"><slot /></span>', props: ['color', 'variant', 'size'] },
  UTable: { template: '<table><slot /></table>', props: ['data', 'columns'] },
  UAvatar: { template: '<img class="uavatar" :src="src" :alt="alt" />', props: ['src', 'alt', 'size'] },
  UAlert: { template: '<div class="ualert"><slot /></div>', props: ['icon', 'color', 'variant', 'title'] },
  UPagination: {
    template: '<div class="pagination"><button class="prev" @click="$emit(\'update:page\', Math.max(1, (page||1)-1))">prev</button><span>{{ page }}</span><button class="next" @click="$emit(\'update:page\', (page||1)+1)">next</button></div>',
    props: ['page', 'total', 'itemsPerPage', 'siblingCount'],
  },
  UFormField: { template: '<div class="uformfield"><label>{{ label }}</label><slot /></div>', props: ['label', 'required', 'description'] },
  ClientOnly: { template: '<div><slot /></div>' },
  NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
}

/** Common global config — mocks + stubs. */
export const _globalConfig = {
  mocks: {
    $t: _t,
    $i18n: { t: _t, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

/** Standard beforeEach: reset stubs, set i18n, expose composables. */
export function baseBeforeEach() {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: _t,
    d: (v: any) => String(v),
  })
  setupComposables()
}

/** Build a ColumnMeta with sensible defaults; override via partial. */
export function makeColumn(over: Record<string, any> = {}): any {
  return {
    name: over.name || 'id',
    jsName: over.jsName || 'id',
    dataType: over.dataType || 'number',
    columnType: over.columnType || 'PgSerial',
    notNull: over.notNull ?? true,
    hasDefault: over.hasDefault ?? true,
    isPrimaryKey: over.isPrimaryKey ?? true,
    isAutoIncrement: over.isAutoIncrement ?? true,
    enumValues: over.enumValues,
    isTimestamp: over.isTimestamp ?? false,
    isDeletedAt: over.isDeletedAt ?? false,
    fkTable: over.fkTable,
    fkLabel: over.fkLabel,
    ...over,
  }
}
