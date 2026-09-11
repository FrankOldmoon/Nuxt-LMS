#!/usr/bin/env node
/**
 * 温和递增的 HTTP 压测脚本（本地运行）
 *
 * 特性：
 * - 并发从低到高分阶段递增（STAGES），每阶段持续 STAGE_MS 毫秒
 * - 统计每阶段 rps / 错误率 / 延迟分位（p50/p95/p99/max）
 * - 两个停机条件（满足其一即停止）：
 *   1) 错误率 > MAX_ERR_RATE
 *   2) 饱和启发：rps 不再增长（<上阶段×1.05）且 p95 飙升(>上阶段×2.5)
 * - 温和、可中断：每个 stage 结束后才升档，不会无限硬压
 *
 * 用法：
 *   node scripts/loadtest.mjs [url]
 *   TARGET=http://10.28.1.151/ node scripts/loadtest.mjs
 *   可选环境变量：STAGE_MS=8000 MAX_ERR_RATE=0.10
 */
import http from 'node:http'
import { performance } from 'node:perf_hooks'

const TARGET = process.env.TARGET || process.argv[2] || 'http://10.28.1.151/'
const STAGES = [1, 2, 5, 10, 20, 30, 50, 75, 100]
const STAGE_MS = Number(process.env.STAGE_MS || 8000)
const MAX_ERR_RATE = Number(process.env.MAX_ERR_RATE || 0.10)

function wait(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function runStage(url, workers, durationMs) {
  const agent = new http.Agent({ keepAlive: true, maxSockets: workers })
  let stop = false
  let done = 0
  let errors = 0
  const lat = []
  const errCodes = {}
  const start = performance.now()

  async function worker() {
    while (!stop) {
      const t0 = performance.now()
      try {
        const res = await new Promise((resolve, reject) => {
          const u = new URL(url)
          const req = http.request(u, { method: 'GET', agent, headers: { accept: 'text/html' } }, (r) => resolve(r))
          req.on('error', reject)
          req.end()
        })
        // 排空响应体（页面较大，需读完才计入完成）
        await new Promise((r) => res.resume().on('end', r))
        const ms = performance.now() - t0
        lat.push(ms)
        if (res.statusCode >= 500) {
          errors++
          errCodes[res.statusCode] = (errCodes[res.statusCode] || 0) + 1
        }
        done++
      } catch (e) {
        errors++
        errCodes[e.code || 'ERR'] = (errCodes[e.code || 'ERR'] || 0) + 1
      }
    }
  }

  const workersArr = Array.from({ length: workers }, () => worker())
  await wait(durationMs)
  stop = true
  await Promise.all(workersArr)

  const elapsed = (performance.now() - start) / 1000
  const sorted = [...lat].sort((a, b) => a - b)
  const p = (q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : 0)
  const total = done + errors
  return {
    workers,
    reqs: done,
    errors,
    errRate: total ? errors / total : 0,
    rps: total / elapsed,
    p50: p(0.5),
    p95: p(0.95),
    p99: p(0.99),
    max: sorted[sorted.length - 1] || 0,
    errCodes,
  }
}

const url = TARGET
console.log(`Target   : ${url}`)
console.log(`Stages   : ${STAGES.join(' → ')}  (每档 ${Math.round(STAGE_MS / 1000)}s)`)
console.log(`Stop if  : errRate > ${MAX_ERR_RATE}  or  饱和(RPS 停滞 + p95×2.5)\n`)

let prev = null
let summary = []
for (const w of STAGES) {
  const r = await runStage(url, w, STAGE_MS)
  const line = `并发=${r.workers}  ${r.reqs}req  rps≈${r.rps.toFixed(1)}  错误=${r.errors}(${(r.errRate * 100).toFixed(1)}%)  p50=${r.p50.toFixed(0)}ms  p95=${r.p95.toFixed(0)}ms  p99=${r.p99.toFixed(0)}ms  峰值=${r.max.toFixed(0)}ms`
  console.log(line)
  summary.push(line)
  if (r.errors && r.errRate <= MAX_ERR_RATE) console.log(`      (errCodes=${JSON.stringify(r.errCodes)})`)

  if (r.errRate > MAX_ERR_RATE) {
    console.log('  >> 错误率超过阈值，停止。')
    break
  }
  if (prev && r.rps < prev.rps * 1.05 && r.p95 > prev.p95 * 2.5) {
    console.log('  >> 检测到饱和：RPS 停滞 + p95 明显上升，停止。')
    break
  }
  prev = r
}

console.log('\n==== 汇总 ====')
summary.forEach((l) => console.log(l))