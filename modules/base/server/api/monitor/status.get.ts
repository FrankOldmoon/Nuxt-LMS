/**
 * 监控页：各端口实例运行状态
 * 读取 PM2 ecosystem 配置，逐端口 HTTP 探测，并返回各自日志文件信息
 */
import {
  resolveEcosystemConfigPath,
  loadEcosystemConfig,
  resolveLogFile,
  logFileInfo,
  checkPort,
  assertMonitorPassword,
} from '../../utils/monitor'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  assertMonitorPassword(event, config.monitor?.viewPassword || '')
  const cfgPath = resolveEcosystemConfigPath(config.monitor?.ecosystemConfig)
  const logDir = config.monitor?.logDir || ''
  const instances = loadEcosystemConfig(cfgPath)

  const results = await Promise.all(
    instances.map(async (app) => {
      const status = await checkPort(app.port)
      return {
        name: app.name,
        port: app.port,
        script: app.script,
        cwd: app.cwd,
        ...status,
        outLog: logFileInfo(resolveLogFile(app, 'out', logDir)),
        errorLog: logFileInfo(resolveLogFile(app, 'error', logDir)),
      }
    }),
  )

  return cResp({
    configFile: cfgPath,
    checkedAt: new Date().toISOString(),
    instances: results,
  })
})
