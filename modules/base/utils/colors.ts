/**
 * Color and difficulty level mapping utility functions
 * Reused across multiple pages and components (homepage course cards, course detail page, course editor, etc.)
 */

/** Difficulty level → UBadge color mapping */
const LEVEL_COLOR_MAP: Record<string, 'success' | 'warning' | 'error'> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'error',
}

/** Color value → Tailwind text class mapping */
const COLOR_TEXT_MAP: Record<string, string> = {
  primary: 'text-primary',
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  error: 'text-error',
  neutral: 'text-highlighted',
}

/** Color value → Tailwind bg class mapping */
const COLOR_BG_MAP: Record<string, string> = {
  primary: 'bg-primary/10',
  success: 'bg-success/10',
  info: 'bg-info/10',
  warning: 'bg-warning/10',
  error: 'bg-error/10',
  neutral: 'bg-elevated',
}

/** Color value → Hero section dark background mapping */
const COLOR_HERO_BG_MAP: Record<string, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-error',
  neutral: 'bg-neutral-700',
}

/**
 * Get the UBadge color corresponding to the difficulty level
 * Compatible with i18n-translated level text (e.g. "Beginner")
 */
export function levelColor(level: string): 'success' | 'warning' | 'error' | 'neutral' {
  // Try direct match first
  if (level in LEVEL_COLOR_MAP) return LEVEL_COLOR_MAP[level]
  // Then try matching i18n-translated text
  const { t } = useI18n()
  const map: Record<string, 'success' | 'warning' | 'error'> = {
    [t('home.levels.beginner')]: 'success',
    [t('home.levels.intermediate')]: 'warning',
    [t('home.levels.advanced')]: 'error',
  }
  return map[level] || 'neutral'
}

/** Get the Tailwind text class corresponding to the color value */
export function colorTextClass(color: string): string {
  return COLOR_TEXT_MAP[color] || 'text-primary'
}

/** Get the Tailwind bg class corresponding to the color value */
export function colorBgClass(color: string): string {
  return COLOR_BG_MAP[color] || 'bg-primary/10'
}

/** Get the Hero section dark background class corresponding to the color value */
export function colorHeroBgClass(color: string): string {
  return COLOR_HERO_BG_MAP[color] || 'bg-primary'
}

/** Color options (for USelect / UInputMenu) */
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

/** Difficulty options (for USelect / UInputMenu) */
export function levelOptions() {
  const { t } = useI18n()
  return [
    { label: t('home.levels.beginner'), value: t('home.levels.beginner') },
    { label: t('home.levels.intermediate'), value: t('home.levels.intermediate') },
    { label: t('home.levels.advanced'), value: t('home.levels.advanced') },
  ]
}
