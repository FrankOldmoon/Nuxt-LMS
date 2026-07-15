import type { ColumnMeta } from './types'

/** Image column name matching (includes img/avatar/logo/cover/banner/photo/head) */
const IMAGE_RE = /(img|image|avatar|logo|cover|banner|photo|head(er)?|thumb(nail)?)$/i
/** URL-ending column names (should be treated as pure URL strings) */
const URL_END_RE = /url|link|href$/i
/** Icon column name matching (icon) — compatible with icon / menuIcon / menu_icon / MenuIcon */
const ICON_RE = /(?:^|[A-Z_-])icon$/i
/** File column name matching (files/fileUrls/attachment/attachments) */
const FILE_RE = /(files|fileUrls|attachments?)$/i

/**
 * Select form control type for cform
 */
export function widgetFor(column: ColumnMeta): string {
  // Readonly columns: auto-increment primary key / timestamps
  if (column.isAutoIncrement) return 'readonly'
  if (column.jsName === 'createdAt' || column.jsName === 'updatedAt' || column.jsName === 'deletedAt') return 'readonly'
  if (column.jsName === 'password') return 'password'

  // Foreign key
  if (column.fkTable) return 'fk'

  // Enum
  if (column.enumValues && column.enumValues.length > 0) return 'select'

  // Boolean
  if (column.dataType === 'boolean') return 'boolean'

  // Date / timestamp
  if (column.isTimestamp) return 'date'

  // JSON (Tiptap doc content uses RichEditor, other json/array uses textarea)
  // richEditor override: chapters / chapterVersions / courses / courseVersions / homeworks /
  //   quizzes / races / comments / questions / announcements / medals
  // (questions goes through form override, does not pass through this function)
  if (column.dataType === 'json' || column.dataType === 'array' || column.columnType === 'PgJSONB') {
    if (column.jsName === 'content') return 'richEditor'
    return 'json'
  }

  // Number
  if (column.dataType === 'number') return 'number'

  // String special types (only matched when string)
  if (column.dataType === 'string') {
    // File field (FormInputFile) — takes priority over URL/Image, because files may also contain URL
    if (FILE_RE.test(column.jsName)) return 'file'

    // Icon field (FormInputIcon)
    if (ICON_RE.test(column.jsName)) return 'icon'

    // URL ending → pure URL string
    if (URL_END_RE.test(column.jsName)) return 'image'

    // Image field (FormInputFile + FormImageCropperModal)
    if (IMAGE_RE.test(column.jsName)) return 'imageCropper'
  }

  return 'text'
}

/**
 * Select display type for cellView
 */
export function cellTypeFor(column: ColumnMeta): string {
  // Auto-increment id / primary key → id label
  if (column.isAutoIncrement || (column.isPrimaryKey && column.jsName === 'id')) return 'id'

  // Timestamp → date localization
  if (column.isTimestamp) return 'date'

  // Boolean
  if (column.dataType === 'boolean') return 'boolean'

  // JSON
  if (column.dataType === 'json' || column.dataType === 'array' || column.columnType === 'PgJSONB') return 'json'

  // Enum
  if (column.enumValues && column.enumValues.length > 0) return 'enum'

  // Foreign key
  if (column.fkTable) return 'fk'

  // String special types
  if (column.dataType === 'string') {
    if (FILE_RE.test(column.jsName)) return 'file'
    if (ICON_RE.test(column.jsName)) return 'icon'
    if (IMAGE_RE.test(column.jsName) || URL_END_RE.test(column.jsName)) return 'image'
  }

  // Number
  if (column.dataType === 'number') return 'number'

  // Password → masked
  if (column.jsName === 'password') return 'password'

  return 'text'
}

/** Image column name check (for cellView extra checks) */
export function isImageColumn(column: ColumnMeta): boolean {
  return column.dataType === 'string' && (IMAGE_RE.test(column.jsName) || URL_END_RE.test(column.jsName))
}

/** Icon column name check (for cellView extra checks) */
export function isIconColumn(column: ColumnMeta): boolean {
  return ICON_RE.test(column.jsName) && column.dataType === 'string'
}

/** File column name check (for cellView extra checks) */
export function isFileColumn(column: ColumnMeta): boolean {
  return FILE_RE.test(column.jsName) && column.dataType === 'string'
}
