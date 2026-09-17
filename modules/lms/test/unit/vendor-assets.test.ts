/**
 * CDN 本地化守卫测试
 *
 * 目的：
 * 1. 已本地化的加载器不得再引用公网 CDN（jsdelivr / unpkg / esm.sh / esm.run）——
 *    内网 / 无外网环境下这些请求会悬挂或失败。
 * 2. public/vendor 下的本地资源必须真实存在（由 scripts/copy-vendor-assets.mjs 从 npm 包生成），
 *    缺失会导致对应功能静默失效。
 *
 * 说明：重量级依赖（ffmpeg core / Univer / Babylon / web-llm / three-vrm）按其体积走
 * 「可配置基址」，不在此守卫范围内。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()

/** 已本地化、且必须保持「零公网 CDN」的加载器 */
const LOCALIZED_FILES = [
  'modules/lms/components/ueditor/extensions/nodes/vue/pdf/usePdfRender.ts',
  'modules/lms/components/ueditor/extensions/nodes/vue/mindmap/useMindmapRender.ts',
  'modules/lms/components/ueditor/extensions/nodes/vue/pintora/usePintoraRender.ts',
  'modules/lms/components/ueditor/extensions/nodes/vue/3d/render.vue',
  'modules/lms/components/ueditor/render/nodes/file.vue',
  'modules/lms/components/ueditor/useUeditorIndex.ts',
  'modules/lms/utils/exportPpt/imageRender.ts',
  'modules/lms/utils/exportPpt/mathRender.ts',
  'modules/lms/utils/exportPpt/index.ts',
  'modules/lms/utils/ai.ts',
  'modules/lms/composables/useVrm.ts',
  'modules/lms/components/class/usersTable/exportSheet.vue',
  'modules/base/composables/useUniverSheet.ts',
  'modules/base/utils/compressImage.ts',
]

const CDN_HOST_RE = /https?:\/\/(cdn\.jsdelivr\.net|unpkg\.com|esm\.sh|esm\.run|cdn\.tailwindcss\.com)/

/** public/vendor 下必须存在的本地资源（相对仓库根） */
const REQUIRED_VENDOR_ASSETS = [
  'public/vendor/pdfjs/pdf.min.mjs',
  'public/vendor/pdfjs/pdf.worker.min.mjs',
  'public/vendor/simple-mind-map/simpleMindMap.esm.min.js',
  'public/vendor/simple-mind-map/simpleMindMap.esm.min.css',
  'public/vendor/jszip/jszip.min.js',
  'public/vendor/xlsx/xlsx.full.min.js',
  'public/vendor/html2canvas/html2canvas.min.js',
  'public/vendor/pptxgenjs/pptxgen.bundle.js',
  'public/vendor/katex/katex.min.js',
  'public/vendor/katex/katex.min.css',
  'public/vendor/pintora/pintora-standalone.esm.mjs',
  'public/vendor/editor-external/icons/file/common.svg',
  'public/browser-image-compression.js',
]

describe('CDN 本地化守卫', () => {
  it.each(LOCALIZED_FILES)('%s 不再引用公网 CDN', (file) => {
    const content = readFileSync(resolve(root, file), 'utf8')
    // 去掉注释行后再检查：允许注释里说明「原先用的是哪个 CDN 地址」
    const code = content
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n')
    const hit = code.match(CDN_HOST_RE)
    expect(hit?.[0] ?? null).toBeNull()
  })

  it.each(REQUIRED_VENDOR_ASSETS)('%s 已随仓库提供', (asset) => {
    const full = resolve(root, asset)
    expect(existsSync(full)).toBe(true)
    expect(statSync(full).size).toBeGreaterThan(0)
  })
})
