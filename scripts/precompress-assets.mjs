/**
 * 构建产物 Brotli 预压缩（替代 Nitro 内建的 compressPublicAssets）。
 *
 * 背景：Nitro 的 compressPublicAssets 把 brotli 质量硬编码为最高级
 * （zlib.constants.BROTLI_MAX_QUALITY = 11，见 nitropack/core 源码），且把
 * 参数写在裸 options 上而非 `params` 里，导致这个"配置"实际无效、只能跑 11 级。
 * 结果每次 `nuxt build` 都要把 ~70MB 的 .output/public（vendor + pyodide + _nuxt）
 * 重新压一遍，实测耗时 ~95s（wasm 单个 9.6MB 就要 ~27s）。
 *
 * 这里改成：关闭 Nitro 内建压缩，改在 `nitro:build:public-assets` 阶段
 * （copyPublicAssets 之后、Nitro 生成 public-assets 清单之前）用质量 9 压一次。
 * 输出体积只大约 ~10%，但耗时从 ~95s 降到 ~4s；且因为发生在清单生成之前，
 * 压缩产物能被运行时正确命中。
 *
 * 幂等：已存在 .br 的文件直接跳过（重复构建不会重复压缩）。
 * 过滤规则对齐 Nitro：跳过 <1KB、.map、图片/媒体等不可压缩类型。
 *
 * 用法：
 *   node scripts/precompress-assets.mjs [dir]   # 默认 .output/public
 */
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { brotliCompress, constants as zlibConstants } from 'node:zlib'
import { promisify } from 'node:util'

const brotli = promisify(brotliCompress)

const QUALITY = 9
const MIN_SIZE = 1024

// 与 Nitro 的可压缩 mime 集合对齐（按扩展名近似）；woff/woff2 本身已压缩，Nitro 也不压。
const COMPRESSIBLE_EXTS = new Set([
  '.js', '.mjs', '.cjs', '.css', '.json', '.html', '.htm',
  '.xml', '.svg', '.txt', '.csv', '.tsv', '.wasm',
  '.ttf', '.otf', '.eot',
])

export async function precompressDir(dir, { quality = QUALITY } = {}) {
  let count = 0
  let before = 0
  let after = 0

  const walk = async (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
        continue
      }
      const ext = extname(entry.name)
      if (ext === '.br' || ext === '.gz' || ext === '.map') continue
      if (!COMPRESSIBLE_EXTS.has(ext)) continue
      if (existsSync(full + '.br')) continue
      const size = statSync(full).size
      if (size < MIN_SIZE) continue

      const out = await brotli(readFileSync(full), {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: quality,
          [zlibConstants.BROTLI_PARAM_SIZE_HINT]: size,
        },
      })
      writeFileSync(full + '.br', out)
      count++
      before += size
      after += out.length
    }
  }

  if (!existsSync(dir)) return { count, before, after }
  await walk(dir)
  return { count, before, after }
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ''))
if (isMain) {
  const dir = process.argv[2] || '.output/public'
  const t = Date.now()
  const { count, before, after } = await precompressDir(dir)
  const mb = (n) => (n / 1048576).toFixed(2)
  console.log(
    `[precompress-assets] ${dir}: brotli(q=${QUALITY}) ${count} 个文件，`
    + `${mb(before)}MB → ${mb(after)}MB，耗时 ${((Date.now() - t) / 1000).toFixed(1)}s`,
  )
}
