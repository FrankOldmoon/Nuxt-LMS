import { describe, it, expect } from 'vitest'
import { widgetFor, cellTypeFor, isImageColumn, isIconColumn, isFileColumn } from '../../utils/widgetMap'
import type { ColumnMeta } from '../../utils/types'

/** 构造 ColumnMeta 测试桩 */
function makeCol(over: Partial<ColumnMeta>): ColumnMeta {
  return {
    name: over.name || over.jsName || 'col',
    jsName: over.jsName || 'col',
    dataType: 'string',
    columnType: 'PgVarChar',
    notNull: false,
    hasDefault: false,
    isPrimaryKey: false,
    isAutoIncrement: false,
    isTimestamp: false,
    isDeletedAt: false,
    ...over,
  } as ColumnMeta
}

describe('admin/widgetMap', () => {
  describe('widgetFor', () => {
    it('主键自增 → readonly', () => {
      const col = makeCol({ jsName: 'id', isAutoIncrement: true, isPrimaryKey: true })
      expect(widgetFor(col)).toBe('readonly')
    })

    it('createdAt/updatedAt/deletedAt → readonly', () => {
      expect(widgetFor(makeCol({ jsName: 'createdAt' }))).toBe('readonly')
      expect(widgetFor(makeCol({ jsName: 'updatedAt' }))).toBe('readonly')
      expect(widgetFor(makeCol({ jsName: 'deletedAt' }))).toBe('readonly')
    })

    it('password → password', () => {
      expect(widgetFor(makeCol({ jsName: 'password' }))).toBe('password')
    })

    it('外键 → fk', () => {
      expect(widgetFor(makeCol({ jsName: 'userId', fkTable: 'users' }))).toBe('fk')
    })

    it('枚举 → select', () => {
      expect(widgetFor(makeCol({ jsName: 'role', enumValues: ['admin', 'user'] }))).toBe('select')
    })

    it('布尔 → boolean', () => {
      expect(widgetFor(makeCol({ jsName: 'isActive', dataType: 'boolean' }))).toBe('boolean')
    })

    it('timestamp → date', () => {
      expect(widgetFor(makeCol({ jsName: 'loginAt', isTimestamp: true }))).toBe('date')
    })

    it('jsonb content → richEditor', () => {
      const col = makeCol({ jsName: 'content', dataType: 'json', columnType: 'PgJSONB' })
      expect(widgetFor(col)).toBe('richEditor')
    })

    it('jsonb 其它字段 → json', () => {
      const col = makeCol({ jsName: 'meta', dataType: 'json', columnType: 'PgJSONB' })
      expect(widgetFor(col)).toBe('json')
    })

    it('数字 → number', () => {
      expect(widgetFor(makeCol({ jsName: 'age', dataType: 'number' }))).toBe('number')
    })

    it('icon 列 → icon', () => {
      expect(widgetFor(makeCol({ jsName: 'icon' }))).toBe('icon')
      expect(widgetFor(makeCol({ jsName: 'menuIcon' }))).toBe('icon')
      expect(widgetFor(makeCol({ jsName: 'app_icon' }))).toBe('icon')
      // 包含 icon 但不是结尾 → 视为其它类型（用 _icon 后缀）
      expect(widgetFor(makeCol({ jsName: 'iconography' }))).not.toBe('icon')
    })

    it('files 列 → file', () => {
      expect(widgetFor(makeCol({ jsName: 'files' }))).toBe('file')
      expect(widgetFor(makeCol({ jsName: 'fileUrls' }))).toBe('file')
      expect(widgetFor(makeCol({ jsName: 'attachments' }))).toBe('file')
    })

    it('img/avatar/logo/cover 等 → imageCropper', () => {
      expect(widgetFor(makeCol({ jsName: 'avatarImg' }))).toBe('imageCropper')
      // coverUrl 结尾是 Url → 纯 URL 字符串
      expect(widgetFor(makeCol({ jsName: 'coverUrl' }))).toBe('image')
      expect(widgetFor(makeCol({ jsName: 'logoImg' }))).toBe('imageCropper')
      expect(widgetFor(makeCol({ jsName: 'banner' }))).toBe('imageCropper')
      expect(widgetFor(makeCol({ jsName: 'photo' }))).toBe('imageCropper')
    })

    it('其它 url → image（纯 URL 字符串）', () => {
      expect(widgetFor(makeCol({ jsName: 'homepage' }))).not.toBe('imageCropper')
      expect(widgetFor(makeCol({ jsName: 'homepageUrl' }))).toBe('image')
    })

    it('默认 → text', () => {
      expect(widgetFor(makeCol({ jsName: 'name' }))).toBe('text')
    })
  })

  describe('cellTypeFor', () => {
    it('主键 id → id', () => {
      const col = makeCol({ jsName: 'id', isPrimaryKey: true })
      expect(cellTypeFor(col)).toBe('id')
    })

    it('icon → icon', () => {
      expect(cellTypeFor(makeCol({ jsName: 'icon' }))).toBe('icon')
    })

    it('file → file', () => {
      expect(cellTypeFor(makeCol({ jsName: 'files' }))).toBe('file')
    })

    it('image → image', () => {
      expect(cellTypeFor(makeCol({ jsName: 'avatarImg' }))).toBe('image')
    })

    it('数字 → number', () => {
      expect(cellTypeFor(makeCol({ jsName: 'age', dataType: 'number' }))).toBe('number')
    })

    it('密码 → password', () => {
      expect(cellTypeFor(makeCol({ jsName: 'password' }))).toBe('password')
    })
  })

  describe('辅助函数', () => {
    it('isImageColumn: 识别图片列', () => {
      expect(isImageColumn(makeCol({ jsName: 'avatarImg' }))).toBe(true)
      expect(isImageColumn(makeCol({ jsName: 'name' }))).toBe(false)
    })

    it('isIconColumn: 识别图标列', () => {
      expect(isIconColumn(makeCol({ jsName: 'icon' }))).toBe(true)
      expect(isIconColumn(makeCol({ jsName: 'name' }))).toBe(false)
    })

    it('isFileColumn: 识别文件列', () => {
      expect(isFileColumn(makeCol({ jsName: 'files' }))).toBe(true)
      expect(isFileColumn(makeCol({ jsName: 'name' }))).toBe(false)
    })

    it('非 string 类型不识别为图片/图标/文件', () => {
      const numCol = makeCol({ jsName: 'avatarImg', dataType: 'number' })
      expect(isImageColumn(numCol)).toBe(false)
      expect(isIconColumn(numCol)).toBe(false)
      expect(isFileColumn(numCol)).toBe(false)
    })
  })
})
