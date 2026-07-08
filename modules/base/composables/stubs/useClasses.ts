/**
 * useClasses stub（lms 未启用时由 base 提供）
 *
 * lms 启用时，lms/composables/useClasses.ts 会覆盖本 composable，
 * 提供真正的班级列表加载逻辑（请求 /api/classes/list）。
 *
 * 本文件位于 stubs/ 子目录，仅当 lms 模块未启用时由 base/index.ts 注册，
 * 避免与 lms 版本产生 "Duplicated imports" 警告。
 *
 * 确保 base 模块组件（如 userProfileForm.vue）在 lms 未启用时不会崩溃。
 * 显式从 vue 导入 ref/computed，不依赖 Nuxt 自动导入（与 useWebSocket stub 风格一致）。
 */
import { computed, ref } from 'vue'

interface ClassItem {
  id: number
  name: string
  code: string
}

export function useClasses() {
  const classes = ref<ClassItem[]>([])
  const classOptions = computed(() => [{ label: '', value: null as number | null }])
  async function loadClasses() {}
  return { classes, classOptions, loadClasses }
}
