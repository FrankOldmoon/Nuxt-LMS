/**
 * pretty-bytes stub for component tests.
 *
 * The real `pretty-bytes` package is a transitive dep (via pnpm .pnpm store)
 * but not hoisted to top-level node_modules, so Vite import-analysis fails
 * to resolve `import prettyBytes from 'pretty-bytes'` inside .vue files.
 *
 * This stub provides a minimal compatible implementation that is wired up
 * via vitest resolve.alias in the `components` project.
 */
export default function prettyBytes(bytes: number): string {
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B'
  const units = ['B', 'kB', 'MB', 'GB', 'TB']
  let val = bytes
  let i = 0
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024
    i++
  }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}
