/**
 * Type definitions for the PPT export module
 */

/** List item (flattened structure) */
export interface ListItem {
  runs: any[]
  indentLevel: number
  bulletPrefix: string  // e.g., "• " / "1. " / "☑ "
}

/** Pre-rendered math formula image (for blockMath) */
export interface MathImage {
  dataUrl: string   // PNG base64
  width: number     // inches
  height: number    // inches
}

/** Slide rendering context, used throughout the export process */
export interface SlideContext {
  pres: any
  slide: any
  currentY: number
  marginX: number
  contentWidth: number
  startY: number
  maxY: number
  /** Pre-fetched question data cache (cid → question data) */
  questionCache: Map<number, any>
  /** Pre-rendered block formula image cache (latex → MathImage | null, null means rendering failed) */
  blockMathCache: Map<string, MathImage | null>
  /** Pre-rendered inline formula text cache (latex → Unicode string) */
  inlineMathCache: Map<string, string>
  /** Pre-fetched quiz data cache (cid → quiz data) */
  quizCache: Map<number, any>
  /** Pre-fetched homework data cache (cid → homework data) */
  homeworkCache: Map<number, any>
  /** Pre-fetched race data cache (cid → race data) */
  raceCache: Map<number, any>
  /** Pre-rendered echarts chart image cache (node object reference → MathImage | null) */
  echartsCache: Map<any, MathImage | null>
  /** Pre-rendered mindmap image cache (markdown content → MathImage | null) */
  mindmapCache: Map<string, MathImage | null>
  /** Pre-rendered HTML block image cache (html content → MathImage | null) */
  htmlCache: Map<string, MathImage | null>
}
