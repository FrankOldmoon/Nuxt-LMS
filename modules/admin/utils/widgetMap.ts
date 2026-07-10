import type { ColumnMeta } from './types'

/** 图片列名匹配（含 img/avatar/logo/cover/banner/photo/head） */
const IMAGE_RE = /(img|image|avatar|logo|cover|banner|photo|head(er)?|thumb(nail)?)$/i
/** URL 结尾的列名（应作为纯 URL 字符串处理） */
const URL_END_RE = /url|link|href$/i
/** 图标列名匹配（icon）—— 兼容 icon / menuIcon / menu_icon / MenuIcon */
const ICON_RE = /(?:^|[A-Z_-])icon$/i
/** 文件列名匹配（files/fileUrls/attachment/attachments） */
const FILE_RE = /(files|fileUrls|attachments?)$/i

/**
 * 为 cform 选择表单控件类型
 */
export function widgetFor(column: ColumnMeta): string {
  // 只读列：自增主键 / 时间戳
  if (column.isAutoIncrement) return 'readonly'
  if (column.jsName === 'createdAt' || column.jsName === 'updatedAt' || column.jsName === 'deletedAt') return 'readonly'
  if (column.jsName === 'password') return 'password'

  // 外键
  if (column.fkTable) return 'fk'

  // 枚举
  if (column.enumValues && column.enumValues.length > 0) return 'select'

  // 布尔
  if (column.dataType === 'boolean') return 'boolean'

  // 日期 / 时间戳
  if (column.isTimestamp) return 'date'

  // JSON（Tiptap doc 内容用 RichEditor，其他 json/array 用文本域）
  // richEditor 覆盖：chapters / chapterVersions / courses / courseVersions / homeworks /
  //   quizzes / races / comments / questions / announcements / medals
  // （questions 走 form 覆盖，不经过本函数）
  if (column.dataType === 'json' || column.dataType === 'array' || column.columnType === 'PgJSONB') {
    if (column.jsName === 'content') return 'richEditor'
    return 'json'
  }

  // 数字
  if (column.dataType === 'number') return 'number'

  // 字符串特殊类型（仅在 string 时匹配）
  if (column.dataType === 'string') {
    // 文件字段（FormInputFile）—— 优先于 URL/Image，因为 files 也可能包含 URL
    if (FILE_RE.test(column.jsName)) return 'file'

    // 图标字段（FormInputIcon）
    if (ICON_RE.test(column.jsName)) return 'icon'

    // URL 结尾 → 纯 URL 字符串
    if (URL_END_RE.test(column.jsName)) return 'image'

    // 图片字段（FormInputFile + FormImageCropperModal）
    if (IMAGE_RE.test(column.jsName)) return 'imageCropper'
  }

  return 'text'
}

/**
 * 为 cellView 选择展示类型
 */
export function cellTypeFor(column: ColumnMeta): string {
  // 自增 id / 主键 → id 标签
  if (column.isAutoIncrement || (column.isPrimaryKey && column.jsName === 'id')) return 'id'

  // 时间戳 → 日期本地化
  if (column.isTimestamp) return 'date'

  // 布尔
  if (column.dataType === 'boolean') return 'boolean'

  // JSON
  if (column.dataType === 'json' || column.dataType === 'array' || column.columnType === 'PgJSONB') return 'json'

  // 枚举
  if (column.enumValues && column.enumValues.length > 0) return 'enum'

  // 外键
  if (column.fkTable) return 'fk'

  // 字符串特殊类型
  if (column.dataType === 'string') {
    if (FILE_RE.test(column.jsName)) return 'file'
    if (ICON_RE.test(column.jsName)) return 'icon'
    if (IMAGE_RE.test(column.jsName) || URL_END_RE.test(column.jsName)) return 'image'
  }

  // 数字
  if (column.dataType === 'number') return 'number'

  // 密码 → 脱敏
  if (column.jsName === 'password') return 'password'

  return 'text'
}

/** 图片列名判定（供 cellView 额外判断） */
export function isImageColumn(column: ColumnMeta): boolean {
  return column.dataType === 'string' && (IMAGE_RE.test(column.jsName) || URL_END_RE.test(column.jsName))
}

/** 图标列名判定（供 cellView 额外判断） */
export function isIconColumn(column: ColumnMeta): boolean {
  return ICON_RE.test(column.jsName) && column.dataType === 'string'
}

/** 文件列名判定（供 cellView 额外判断） */
export function isFileColumn(column: ColumnMeta): boolean {
  return FILE_RE.test(column.jsName) && column.dataType === 'string'
}
