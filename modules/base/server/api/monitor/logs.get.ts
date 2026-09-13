/**
 * 监控页：读取指定实例的日志（out/error）末尾 N 行
 * query: name=实例名或端口 & type=out|error & lines=行数 & grep=过滤关键词
 */
import {
  resolveEcosystemConfigPath,
  loadEcosystemConfig,
  resolveLogFile,
  tailFile,
} from '../../utils/monitor'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const name = String(query.name || '')
  const type = query.type === 'error' ? 'error' : 'out'
  const lines = Math.min(Math.max(Number(query.lines) || 100, 1), 2000)
  const grep = String(query.grep || '')

  const config = useRuntimeConfig(event)
  const cfgPath = resolveEcosystemConfigPath(config.monitor?.ecosystemConfig)
  const logDir = config.monitor?.logDir || ''
  const instances = loadEcosystemConfig(cfgPath)
  const app = instances.find((a) => a.name === name || String(a.port) === name)
  if (!app) return cResp(null, '未找到实例', false)

  const path = resolveLogFile(app, type, logDir)
  const tail = tailFile(path, lines, grep)
  return cResp({
    name: app.name,
    port: app.port,
    type,
    path,
    ...tail,
  })
})
