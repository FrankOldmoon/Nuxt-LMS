/**
 * PPT 导出模块的类型定义
 */

/** 列表项（扁平化后的结构） */
export interface ListItem {
  runs: any[]
  indentLevel: number
  bulletPrefix: string  // 如 "• " / "1. " / "☑ "
}

/** 预渲染的数学公式图片（blockMath 用） */
export interface MathImage {
  dataUrl: string   // PNG base64
  width: number     // 英寸
  height: number    // 英寸
}

/** 幻灯片渲染上下文，贯穿整个导出流程 */
export interface SlideContext {
  pres: any
  slide: any
  currentY: number
  marginX: number
  contentWidth: number
  startY: number
  maxY: number
  /** 预取的题目数据缓存（cid → question data） */
  questionCache: Map<number, any>
  /** 预渲染的块级公式图片缓存（latex → MathImage | null，null 表示渲染失败） */
  blockMathCache: Map<string, MathImage | null>
  /** 预渲染的行内公式文本缓存（latex → Unicode 字符串） */
  inlineMathCache: Map<string, string>
  /** 预取的测验数据缓存（cid → quiz data） */
  quizCache: Map<number, any>
  /** 预取的作业数据缓存（cid → homework data） */
  homeworkCache: Map<number, any>
  /** 预取的竞赛数据缓存（cid → race data） */
  raceCache: Map<number, any>
  /** 预渲染的 echarts 图表图片缓存（节点对象引用 → MathImage | null） */
  echartsCache: Map<any, MathImage | null>
  /** 预渲染的思维导图图片缓存（markdown 内容 → MathImage | null） */
  mindmapCache: Map<string, MathImage | null>
  /** 预渲染的 HTML 块图片缓存（html 内容 → MathImage | null） */
  htmlCache: Map<string, MathImage | null>
}
