/**
 * Shared test helpers for base auth component tests.
 *
 * - Exposes auto-imported base composables onto globalThis (so .vue source
 *   files that rely on Nuxt auto-imports can run under vitest).
 * - Stubs cross-module composable useUserProfileConfig (lms module).
 * - Provides common NuxtUI / Nuxt component stubs used across auth tests.
 *
 * Each test file imports { _globalStubs, _globalConfig, baseBeforeEach } from
 * this helper and may extend the stubs object with component-specific entries.
 */
export { describe, it, expect, beforeEach, vi } from 'vitest'
export { mount, flushPromises } from '@vue/test-utils'
export { ref, computed, reactive } from 'vue'
export {
  resetAllStubs,
  setMockI18n,
  setMockAuthUser,
  setMockFetchHandler,
  clearMockFetchHandler,
  getToastCalls,
  clearToastCalls,
} from '../../../../../test/setup/nuxt-stubs'

// base composables — auto-imported in Nuxt, must be exposed for tests
import { useProfileModal } from '../../../composables/useProfileModal'
import { useImportUsers } from '../../../composables/useImportUsers'
import { useRegisterForm } from '../../../composables/useRegisterForm'
import { useUserEditModal } from '../../../composables/useUserEditModal'
import { useUserProfileForm } from '../../../composables/useUserProfileForm'
import { useSiteConfig } from '../../../composables/useSiteConfig'
import { useSettingsForm } from '../../../composables/useSettingsForm'
import { useClasses } from '../../../composables/useClasses'

/** Expose all base auto-imported composables onto globalThis. Call in beforeEach. */
export function setupComposables() {
  ;(globalThis as any).useProfileModal = useProfileModal
  ;(globalThis as any).useImportUsers = useImportUsers
  ;(globalThis as any).useRegisterForm = useRegisterForm
  ;(globalThis as any).useUserEditModal = useUserEditModal
  ;(globalThis as any).useUserProfileForm = useUserProfileForm
  ;(globalThis as any).useSiteConfig = useSiteConfig
  ;(globalThis as any).useSettingsForm = useSettingsForm
  ;(globalThis as any).useClasses = useClasses
  // useUserProfileConfig lives in the lms module — stub with permissive defaults
  ;(globalThis as any).useUserProfileConfig = () => ({
    allowSelfAvatarUpload: computed(() => true),
    allowChangePassword: computed(() => true),
    allowChangeEmail: computed(() => true),
    allowChangeLocale: computed(() => true),
    allowExportData: computed(() => true),
    refresh: async () => {},
  })
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
    template: '<button class="ubtn" :disabled="disabled || loading" @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
    props: ['color', 'variant', 'size', 'loading', 'label', 'icon', 'to', 'disabled', 'block', 'type'],
  },
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'title', 'ui', 'scrollable', 'fullscreen'],
  },
  UInput: {
    template: '<input class="uinput" :value="modelValue" :type="type" :placeholder="placeholder" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'icon', 'size', 'disabled', 'autocomplete'],
  },
  USelect: {
    template: '<select class="uselect" :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in items || options || []" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'options', 'items', 'valueKey', 'size', 'disabled', 'placeholder'],
  },
  UCheckbox: {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue', 'label'],
  },
  USwitch: {
    template: '<input type="checkbox" class="uswitch" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name', 'class'] },
  USkeleton: { template: '<div class="skeleton" />', props: ['class'] },
  UTextarea: {
    template: '<textarea class="utextarea" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'rows'],
  },
  UBadge: { template: '<span class="ubadge"><slot /></span>', props: ['color', 'variant', 'size'] },
  UAvatar: {
    template: '<div class="uavatar" :data-src="src" :data-alt="alt" :data-text="text">{{ text || alt }}</div>',
    props: ['src', 'alt', 'size', 'text'],
  },
  UForm: {
    template: '<form class="uform" @submit.prevent="$emit(\'submit\', $event)"><slot /></form>',
  },
  UFormField: {
    template: '<div class="uformfield"><label v-if="label">{{ label }}<span v-if="required">*</span></label><slot /><div v-if="error" class="error">{{ error }}</div></div>',
    props: ['label', 'required', 'error', 'description'],
  },
  ClientOnly: { template: '<div><slot /></div>' },
  NuxtLink: { template: '<a class="nuxtlink" :href="to"><slot /></a>', props: ['to'] },
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
