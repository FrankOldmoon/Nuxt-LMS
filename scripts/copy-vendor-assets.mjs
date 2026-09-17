/**
 * 把各第三方库的浏览器运行时文件从 node_modules 复制到 public/vendor，
 * 供浏览器通过「同源 URL」加载（不再请求公网 CDN）。
 *
 * 背景：内网 / 无外网环境下 CDN 请求会悬挂或失败（例如思维导图、PDF 预览、
 * PPT/Excel 导出会卡住）。仓库只提交拷贝产物，依赖版本由 package.json 锁定；
 * 升级依赖后重新执行本脚本即可（会写入 .versions 标记便于比对）。
 *
 * 重量级依赖（ffmpeg core / Univer / Babylon / web-llm）不在这里拷贝，
 * 它们统一走 runtimeConfig 的 assetsBase（见 nuxt.config.ts 的 public.assetsBase）。
 *
 * 用法：
 *   node scripts/copy-vendor-assets.mjs
 */
import {
  existsSync, mkdirSync, copyFileSync, cpSync, readFileSync, writeFileSync,
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const modulesDir = join(root, 'node_modules')
const vendorDir = join(root, 'public', 'vendor')

/** 单文件拷贝：[源（相对 node_modules）, 目标（相对 public/vendor）] */
const FILES = [
  // PDF 预览（usePdfRender）
  ['pdfjs-dist/build/pdf.min.mjs', 'pdfjs/pdf.min.mjs'],
  ['pdfjs-dist/build/pdf.worker.min.mjs', 'pdfjs/pdf.worker.min.mjs'],
  // 思维导图（useMindmapRender / exportPpt/imageRender）：用自包含的 ESM 版，比 UMD 小 3MB+
  ['simple-mind-map/dist/simpleMindMap.esm.min.js', 'simple-mind-map/simpleMindMap.esm.min.js'],
  ['simple-mind-map/dist/simpleMindMap.esm.min.css', 'simple-mind-map/simpleMindMap.esm.min.css'],
  // Excel 导出（exportSheet；注意 CDN 上的 xlsx@0.20.3 已是 404，本地 0.18.5 才可用）
  ['xlsx/dist/xlsx.full.min.js', 'xlsx/xlsx.full.min.js'],
  // PPT 导出（exportPpt：公式转图 + 生成 pptx）
  ['html2canvas/dist/html2canvas.min.js', 'html2canvas/html2canvas.min.js'],
  ['pptxgenjs/dist/pptxgen.bundle.js', 'pptxgenjs/pptxgen.bundle.js'],
  ['katex/dist/katex.min.js', 'katex/katex.min.js'],
  ['katex/dist/katex.min.css', 'katex/katex.min.css'],
  // 时序图（pintora）
  ['@pintora/standalone/lib/pintora-standalone.esm.mjs', 'pintora/pintora-standalone.esm.mjs'],
  // PPT 模板（ppt_template.html）
  ['reveal.js/dist/reveal.js', 'reveal.js/reveal.js'],
  ['reveal.js/dist/reveal.css', 'reveal.js/reveal.css'],
  ['reveal.js/dist/theme/white.css', 'reveal.js/theme/white.css'],
  ['reveal.js/plugin/highlight/highlight.js', 'reveal.js/plugin/highlight/highlight.js'],
  ['reveal.js/plugin/highlight/monokai.css', 'reveal.js/plugin/highlight/monokai.css'],
  ['reveal.js/plugin/notes/notes.js', 'reveal.js/plugin/notes/notes.js'],
  ['reveal.js/plugin/zoom/zoom.js', 'reveal.js/plugin/zoom/zoom.js'],
  ['@tailwindcss/browser/dist/index.global.js', 'tailwindcss-browser/index.global.js'],
]

/** 目录拷贝：[源, 目标] */
const DIRS = [
  // KaTeX 的 CSS 通过相对路径引用 fonts/，必须一起拷贝
  ['katex/dist/fonts', 'katex/fonts'],
  // 文件节点的类型图标（editor-external 的 icons/file/*.svg）
  ['@umoteam/editor-external/icons/file', 'editor-external/icons/file'],
]

/** 记录版本号到 public/vendor/.versions，便于比对依赖是否升级 */
const VERSION_PACKAGES = [
  'pdfjs-dist', 'simple-mind-map', 'xlsx', 'html2canvas', 'pptxgenjs',
  'katex', '@pintora/standalone', 'reveal.js', '@tailwindcss/browser', '@umoteam/editor-external',
]

function packageVersion(name) {
  try {
    const pkg = JSON.parse(readFileSync(join(modulesDir, name, 'package.json'), 'utf8'))
    return pkg.version
  } catch {
    return null
  }
}

if (!existsSync(modulesDir)) {
  console.warn('[copy-vendor-assets] node_modules 不存在，跳过（先执行安装）')
  process.exit(0)
}

let copied = 0
let missing = 0

mkdirSync(vendorDir, { recursive: true })

for (const [from, to] of FILES) {
  const src = join(modulesDir, from)
  const dest = join(vendorDir, to)
  if (!existsSync(src)) {
    console.warn(`[copy-vendor-assets] 缺少源文件，跳过: ${from}`)
    missing++
    continue
  }
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)
  copied++
}

for (const [from, to] of DIRS) {
  const src = join(modulesDir, from)
  const dest = join(vendorDir, to)
  if (!existsSync(src)) {
    console.warn(`[copy-vendor-assets] 缺少源目录，跳过: ${from}`)
    missing++
    continue
  }
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(src, dest, { recursive: true })
  copied++
}

const versions = {}
for (const name of VERSION_PACKAGES) versions[name] = packageVersion(name)
writeFileSync(join(vendorDir, '.versions'), `${JSON.stringify(versions, null, 2)}\n`)

console.log(`[copy-vendor-assets] 完成：${copied} 项已复制，${missing} 项缺失`)
console.log(`[copy-vendor-assets] 目标目录：public/vendor（版本记录见 .versions）`)
