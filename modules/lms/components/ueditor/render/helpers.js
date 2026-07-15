// Totalshared utilityFunction

export const DEFAULT_LINE_HEIGHT = 1.75
export const DEFAULT_TEXT_ALIGN = 'start'
export const DEFAULT_INDENT_SIZE = 2
export const DEFAULT_INDENT_UNIT = 'em'

// margin Property → CSS style Object
export const computeMarginStyle = (margin) => {
  if (!margin || typeof margin !== 'object') return {}
  const styles = {}
  if (margin.top) styles.marginTop = `${margin.top}px`
  if (margin.bottom) styles.marginBottom = `${margin.bottom}px`
  return styles
}

// nodeAlign Property → CSS style Object
export const computeNodeAlignStyle = (nodeAlign) => {
  return nodeAlign ? { justifyContent: nodeAlign } : {}
}

// combinedand margin + nodeAlign（originalchild nodePointcommonuse）
export const computeAtomNodeStyle = (attrs) => ({
  ...computeNodeAlignStyle(attrs.nodeAlign),
  ...computeMarginStyle(attrs.margin),
})

// paragraph/Titleetc.nodePointGlobalProperty → HTML attributes
export const computeNodeStyle = (node) => {
  const { attrs = {}, type } = node
  const styles = []
  const dataAttrs = {}

  if (['paragraph', 'heading'].includes(type)) {
    if (
      attrs.lineHeight != null &&
      attrs.lineHeight !== DEFAULT_LINE_HEIGHT
    ) {
      styles.push(`line-height: ${attrs.lineHeight}`)
    }
  }

  if (['paragraph', 'heading'].includes(type) && attrs.textAlign) {
    if (attrs.textAlign === 'distributed') {
      styles.push('text-align-last: justify')
    } else if (attrs.textAlign !== DEFAULT_TEXT_ALIGN) {
      styles.push(`text-align: ${attrs.textAlign}`)
    }
  }

  if (
    ['paragraph', 'heading', 'listItem', 'taskItem'].includes(type) &&
    attrs.indent &&
    attrs.indent > 0
  ) {
    const unit = attrs.indentUnit || DEFAULT_INDENT_UNIT
    styles.push(`text-indent: ${attrs.indent * DEFAULT_INDENT_SIZE}${unit}`)
  }

  if (
    ['paragraph', 'heading'].includes(type) &&
    attrs.wordWrap &&
    attrs.wordWrap !== 'normal'
  ) {
    if (attrs.wordWrap === 'break-all') {
      styles.push('word-break: break-all')
    } else if (attrs.wordWrap === 'break-word') {
      styles.push('word-break: break-word')
    }
    dataAttrs['data-word-wrap'] = attrs.wordWrap
  }

  if (attrs.margin && typeof attrs.margin === 'object') {
    if (attrs.margin.top) styles.push(`margin-top: ${attrs.margin.top}px`)
    if (attrs.margin.bottom) styles.push(`margin-bottom: ${attrs.margin.bottom}px`)
  }

  const result = {}
  if (styles.length) result.style = styles.join('; ')
  Object.assign(result, dataAttrs)
  return result
}

// TablecellProperty → HTML attributes
export const computeTableCellAttrs = (attrs) => {
  const result = {}
  if (attrs.align) result.align = attrs.align
  const styles = []
  if (attrs.background) styles.push(`background-color: ${attrs.background}`)
  if (attrs.color) styles.push(`color: ${attrs.color}`)
  if (styles.length) result.style = styles.join('; ')
  if (attrs.colspan) result.colspan = attrs.colspan
  if (attrs.rowspan) result.rowspan = attrs.rowspan
  return result
}

// Text + marks Render（Return VNode orcharactersstring）
import { h } from 'vue'

export const renderTextWithMarks = (text, marks) => {
  if (!marks || marks.length === 0) return text

  const tsStyles = []
  const otherMarks = []

  for (const mark of marks) {
    const { type, attrs = {} } = mark
    if (type === 'textStyle') {
      if (attrs.color) tsStyles.push(`color: ${attrs.color}`)
      if (attrs.fontSize) tsStyles.push(`font-size: ${attrs.fontSize}`)
      if (attrs.fontFamily) tsStyles.push(`font-family: ${attrs.fontFamily}`)
      if (attrs.background color) tsStyles.push(`background-color: ${attrs.background color}`)
    } else if (type === 'letterSpacing' && attrs.spacing) {
      tsStyles.push(`letter-spacing: ${attrs.spacing}`)
    } else {
      otherMarks.push(mark)
    }
  }

  let result = text
  if (tsStyles.length) {
    result = h('span', { style: tsStyles.join('; ') }, result)
  }

  for (let i = otherMarks.length - 1; i >= 0; i--) {
    result = renderMark(otherMarks[i], result)
  }
  return result
}

export const renderMark = (mark, children) => {
  const { type, attrs = {} } = mark
  switch (type) {
    case 'bold':
      return h('b', {}, children)
    case 'italic':
      return h('i', {}, children)
    case 'strike':
      return h('s', {}, children)
    case 'code':
      return h('code', {}, children)
    case 'underline':
      return h('u', {}, children)
    case 'subscript':
      return h('sub', {}, children)
    case 'superscript':
      return h('sup', {}, children)
    case 'link':
      return h('a', { href: attrs.href, target: attrs.target, rel: attrs.rel }, children)
    case 'bookmark':
      return h(
        'bookmark',
        {
          class: 'umo-editor-bookmark',
          bookmarkName: attrs.bookmarkName || 'bookmarkName',
        },
        children,
      )
    default:
      return children
  }
}
