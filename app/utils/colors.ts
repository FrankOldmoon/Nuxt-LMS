/**
 * 颜色与难度级别映射工具函数
 * 在多个页面和组件中复用（首页课程卡片、课程详情页、课程编辑器等）
 */

/** 难度级别 → UBadge color 映射 */
const LEVEL_COLOR_MAP: Record<string, 'success' | 'warning' | 'error'> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'error',
}

/** 颜色值 → Tailwind text class 映射 */
const COLOR_TEXT_MAP: Record<string, string> = {
  primary: 'text-primary',
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  error: 'text-error',
  neutral: 'text-highlighted',
}

/** 颜色值 → Tailwind bg class 映射 */
const COLOR_BG_MAP: Record<string, string> = {
  primary: 'bg-primary/10',
  success: 'bg-success/10',
  info: 'bg-info/10',
  warning: 'bg-warning/10',
  error: 'bg-error/10',
  neutral: 'bg-elevated',
}

/**
 * 获取难度级别对应的 UBadge color
 * 兼容 i18n 翻译后的 level 文本（如"入门"/"Beginner"）
 */
export function levelColor(level: string): 'success' | 'warning' | 'error' | 'neutral' {
  // 先尝试直接匹配
  if (level in LEVEL_COLOR_MAP) return LEVEL_COLOR_MAP[level]
  // 再尝试匹配 i18n 翻译后的文本
  const { t } = useI18n()
  const map: Record<string, 'success' | 'warning' | 'error'> = {
    [t('home.levels.beginner')]: 'success',
    [t('home.levels.intermediate')]: 'warning',
    [t('home.levels.advanced')]: 'error',
  }
  return map[level] || 'neutral'
}

/** 获取颜色值对应的 Tailwind text class */
export function colorTextClass(color: string): string {
  return COLOR_TEXT_MAP[color] || 'text-primary'
}

/** 获取颜色值对应的 Tailwind bg class */
export function colorBgClass(color: string): string {
  return COLOR_BG_MAP[color] || 'bg-primary/10'
}

/** 颜色选项（用于 USelect / UInputMenu） */
export function colorOptions() {
  const { t } = useI18n()
  return [
    { label: t('courseEditor.colors.primary'), value: 'primary' },
    { label: t('courseEditor.colors.success'), value: 'success' },
    { label: t('courseEditor.colors.info'), value: 'info' },
    { label: t('courseEditor.colors.warning'), value: 'warning' },
    { label: t('courseEditor.colors.error'), value: 'error' },
    { label: t('courseEditor.colors.neutral'), value: 'neutral' },
  ]
}

/** 难度选项（用于 USelect / UInputMenu） */
export function levelOptions() {
  const { t } = useI18n()
  return [
    { label: t('home.levels.beginner'), value: t('home.levels.beginner') },
    { label: t('home.levels.intermediate'), value: t('home.levels.intermediate') },
    { label: t('home.levels.advanced'), value: t('home.levels.advanced') },
  ]
}
