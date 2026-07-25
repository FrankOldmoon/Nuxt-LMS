/**
 * 颜色 / 字号转换工具
 */

/** CSS 颜色 → pptxgenjs hex (无 #，大写) */
export function cssColorToHex(color: string | undefined): string | undefined {
  if (!color || typeof color !== 'string') return undefined
  const c = color.trim().toLowerCase()
  // #rgb / #rrggbb
  const hexMatch = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/)
  if (hexMatch && hexMatch[1]) {
    let hex: string = hexMatch[1]
    if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('')
    return hex.toUpperCase()
  }
  // rgb(r, g, b) / rgba(r, g, b, a)
  const rgbMatch = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
    return [rgbMatch[1], rgbMatch[2], rgbMatch[3]]
      .map(n => parseInt(n!).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  }
  // 常见命名颜色
  const named: Record<string, string> = {
    red: 'FF0000', green: '008000', blue: '0000FF', black: '000000',
    white: 'FFFFFF', yellow: 'FFFF00', orange: 'FFA500', purple: '800080',
    gray: '808080', grey: '808080', pink: 'FFC0CB', brown: 'A52A2A',
    cyan: '00FFFF', magenta: 'FF00FF', lime: '00FF00', navy: '000080',
    teal: '008080', maroon: '800000', olive: '808000', silver: 'C0C0C0',
    transparent: 'FFFFFF',
  }
  return named[c]
}

/** CSS 字号字符串 → pt 数字 */
export function parseFontSize(size: string | undefined): number | undefined {
  if (!size) return undefined
  const m = String(size).match(/^([\d.]+)\s*(px|pt|em|rem)?$/)
  if (!m) return undefined
  const val = parseFloat(m[1]!)
  const unit = m[2] || 'px'
  switch (unit) {
    case 'px': return Math.round(val * 0.75)
    case 'pt': return val
    case 'em':
    case 'rem': return Math.round(val * 12 * 0.75)
    default: return Math.round(val * 0.75)
  }
}
