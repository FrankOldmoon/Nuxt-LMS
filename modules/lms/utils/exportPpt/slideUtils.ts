/**
 * Slide pagination utilities
 */

import type { SlideContext } from './types'

/** Create a new slide, with optional title */
export function newSlide(ctx: SlideContext, pres: any, title?: string): void {
  ctx.slide = pres.addSlide()
  ctx.currentY = ctx.startY
  if (title) {
    ctx.slide.addText(title, {
      x: ctx.marginX,
      y: 0.3,
      w: ctx.contentWidth,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: '2B579A',
      fontFace: 'Calibri',
      valign: 'middle',
    })
    // Decorative line below the title
    ctx.slide.addShape('line', {
      x: ctx.marginX,
      y: 1.05,
      w: ctx.contentWidth,
      h: 0,
      line: { color: '2B579A', width: 1.5 },
    })
    ctx.currentY = 1.25
  }
}
