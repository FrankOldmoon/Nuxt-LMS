<template>
  <!-- 未验证：输入查看密码 -->
  <div v-if="!verified" class="min-h-[60vh] flex items-center justify-center px-4">
    <UCard class="w-full max-w-sm">
      <div class="space-y-4 text-center">
        <UIcon name="i-lucide-shield-check" class="size-10 text-primary mx-auto" />
        <div>
          <h1 class="text-lg font-bold text-highlighted">服务监控</h1>
          <p class="text-sm text-muted mt-1">请输入查看密码</p>
        </div>
        <UInput v-model="pwdInput" type="password" size="lg" placeholder="查看密码"
          autofocus @keydown.enter="unlock" />
        <UButton color="primary" block size="lg" :loading="unlocking" @click="unlock">进入</UButton>
      </div>
    </UCard>
  </div>

  <!-- 已验证：监控面板 -->
  <div v-else class="container mx-auto max-w-7xl px-4 py-6 space-y-6">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-activity" class="size-6 text-primary" />
          服务监控
        </h1>
        <p v-if="configFile" class="text-xs text-muted mt-1 font-mono">{{ configFile }}</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 text-sm text-muted">
          自动刷新
          <USelect v-model="autoRefreshSec" size="xs" class="w-24" :items="refreshOptions" />
        </div>
        <UButton icon="i-lucide-refresh-cw" color="primary" variant="soft" size="sm" :loading="refreshing"
          @click="refreshAll">
          刷新
        </UButton>
      </div>
    </div>

    <!-- 数据概览 -->
    <div v-if="data" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <UCard v-for="card in statCards" :key="card.key" :ui="{ body: { padding: 'p-3' } }">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">{{ card.label }}</span>
          <UIcon :name="card.icon" class="size-4 text-primary" />
        </div>
        <div class="mt-1 text-lg font-bold text-highlighted">{{ card.value }}</div>
      </UCard>
    </div>

    <!-- 数据库状态 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-highlighted">数据库状态</span>
          <span class="text-xs text-muted">检查时间：{{ dbCheckedAtText || '-' }}</span>
        </div>
      </template>

      <div v-if="!db" class="py-8 flex justify-center">
        <UProgress indeterminate class="w-40" />
      </div>

      <div v-else-if="!db.ok" class="py-8 text-center">
        <UBadge color="error" variant="soft" size="lg">
          <UIcon name="i-lucide-database-zap" class="size-4" /> 连接异常
        </UBadge>
        <p class="text-sm text-red-500 mt-3 break-all font-mono">{{ db.error }}</p>
      </div>

      <template v-else>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div v-for="s in dbStats" :key="s.label" class="flex items-center gap-3 rounded-md border border-(--ui-border) p-3">
            <UIcon :name="s.icon" class="size-5 text-primary shrink-0" />
            <div class="min-w-0">
              <div class="text-xs text-muted">{{ s.label }}</div>
              <div class="text-sm font-bold text-highlighted truncate" :title="s.value">{{ s.value }}</div>
            </div>
          </div>
        </div>
        <UTable :data="db.tables" :columns="dbColumns" :ui="{ td: 'py-1.5' }">
          <template #rows-cell="{ row }">
            <span class="font-mono text-sm">{{ row.original.rows.toLocaleString() }}</span>
          </template>
          <template #size-cell="{ row }">
            <span class="font-mono text-sm">{{ row.original.size }}</span>
          </template>
        </UTable>
      </template>
    </UCard>

    <!-- 实例状态表 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-highlighted">实例运行状态</span>
          <span class="text-xs text-muted">检查时间：{{ checkedAtText || '-' }}</span>
        </div>
      </template>

      <div v-if="loading" class="py-10 flex justify-center">
        <UProgress indeterminate class="w-40" />
      </div>

      <div v-else-if="!instances.length" class="py-10 text-center text-sm text-muted">
        未读取到实例配置（ecosystem 配置文件不存在或解析失败）
      </div>

      <UTable v-else :data="instances" :columns="columns" :ui="{ td: 'py-2' }">
        <template #name-cell="{ row }">
          <span class="font-mono text-sm">{{ row.original.name }}</span>
        </template>
        <template #port-cell="{ row }">
          <span class="font-mono text-sm">127.0.0.1:{{ row.original.port }}</span>
        </template>
        <template #status-cell="{ row }">
          <span v-if="row.original.ok" class="inline-flex items-center gap-1.5 text-sm text-green-600">
            <span class="size-2 rounded-full bg-green-500"></span> 在线
          </span>
          <span v-else class="inline-flex items-center gap-1.5 text-sm text-red-500" :title="row.original.error || ''">
            <span class="size-2 rounded-full bg-red-500"></span> 离线
          </span>
        </template>
        <template #latency-cell="{ row }">
          <span v-if="row.original.ok" class="text-sm font-mono">{{ row.original.latencyMs }} ms</span>
          <span v-else class="text-xs text-muted">—</span>
        </template>
        <template #outLog-cell="{ row }">
          <LogInfoCell :log="row.original.outLog ?? null" />
        </template>
        <template #errorLog-cell="{ row }">
          <LogInfoCell :log="row.original.errorLog ?? null" :error="true" />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UButton icon="i-lucide-file-text" size="xs" color="neutral" variant="ghost"
              title="查看 out 日志" @click="openLogs(row.original, 'out')" />
            <UButton icon="i-lucide-alert-triangle" size="xs" color="error" variant="ghost"
              title="查看 error 日志" @click="openLogs(row.original, 'error')" />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- 日志查看弹窗 -->
    <UModal v-model:open="logOpen" :ui="{ width: 'max-w-4xl' }">
      <template #body>
        <div class="space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="font-semibold text-highlighted flex items-center gap-2">
              {{ logTarget?.name }} ({{ logTarget?.port }})
              <UBadge :color="logType === 'error' ? 'error' : 'neutral'" variant="soft" size="sm">
                {{ logType === 'error' ? 'error' : 'out' }} 日志
              </UBadge>
            </div>
            <div class="flex items-center gap-2">
              <UInput v-model="logGrep" size="xs" class="w-40" placeholder="过滤关键词…" clearable
                @keydown.enter="fetchLogs" />
              <USelect v-model="logLines" size="xs" class="w-24" :items="linesOptions" @change="fetchLogs" />
              <UButton icon="i-lucide-refresh-cw" size="xs" color="primary" variant="soft"
                :loading="logLoading" @click="fetchLogs">刷新</UButton>
            </div>
          </div>
          <p class="text-xs text-muted font-mono break-all">{{ logPath }}</p>
          <div class="text-xs text-muted space-x-3">
            <span v-if="!logData?.exists">日志文件不存在</span>
            <template v-else>
              <span>共 {{ logData.lines.length }} 行</span>
              <span v-if="logData.truncated" class="text-warning">（已截取末尾）</span>
            </template>
          </div>
          <div v-if="logLoading" class="py-6 flex justify-center">
            <UProgress indeterminate class="w-40" />
          </div>
          <pre v-else class="text-xs leading-relaxed max-h-[55vh] overflow-auto rounded-md bg-muted/40 p-3 font-mono whitespace-pre-wrap break-all">{{ logText || '（无内容）' }}</pre>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
useHead(() => ({ title: '服务监控' }))

// ---------- 查看密码验证 ----------
const verified = ref(false)
const unlocking = ref(false)
const pwdInput = ref('')
const pwd = ref('')
const toast = useToast()

async function unlock() {
  const value = pwdInput.value.trim()
  if (!value) return
  unlocking.value = true
  pwd.value = value
  try {
    await fetchStatus(true)
    verified.value = true
    refreshAll()
  } catch (e: any) {
    // 密码错误（403）时清除已填密码
    if (e?.response?.status === 403) {
      toast.add({ title: '查看密码错误', color: 'error' })
      pwd.value = ''
      pwdInput.value = ''
    } else {
      toast.add({ title: '监控服务暂不可用', color: 'error' })
    }
  } finally {
    unlocking.value = false
  }
}

/** 监控 API 请求头（携带查看密码） */
function monitorHeaders() {
  return pwd.value ? { 'x-monitor-pwd': pwd.value } : {}
}

// ---------- 通用格式化 ----------
function formatBytes(n: number): string {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`
}
function formatTime(s: string | null): string {
  return s ? new Date(s).toLocaleString() : '—'
}

// ---------- 数据概览 ----------
const data = ref<{
  counts: Record<string, number>
  storageBytes: number
  newUsers7d: number
  newUsers30d: number
  checkedAt: string
} | null>(null)

const statCards = computed(() => {
  const c = data.value?.counts || {}
  const items: { key: string; label: string; icon: string; value: string }[] = [
    { key: 'users', label: '用户', icon: 'i-lucide-users', value: String(c.users ?? '-') },
    { key: 'courses', label: '课程', icon: 'i-lucide-book-open', value: String(c.courses ?? '-') },
    { key: 'chapters', label: '章节', icon: 'i-lucide-list-tree', value: String(c.chapters ?? '-') },
    { key: 'questions', label: '题目', icon: 'i-lucide-help-circle', value: String(c.questions ?? '-') },
    { key: 'homeworks', label: '作业', icon: 'i-lucide-clipboard-list', value: String(c.homeworks ?? '-') },
    { key: 'quizzes', label: '测验', icon: 'i-lucide-file-question', value: String(c.quizzes ?? '-') },
    { key: 'comments', label: '评论', icon: 'i-lucide-message-square', value: String(c.comments ?? '-') },
    { key: 'classes', label: '班级', icon: 'i-lucide-school', value: String(c.classes ?? '-') },
    { key: 'files', label: '文件数', icon: 'i-lucide-files', value: String(c.files ?? '-') },
    { key: 'storage', label: '存储用量', icon: 'i-lucide-database', value: formatBytes(data.value?.storageBytes ?? 0) },
    { key: 'new7d', label: '新增用户 7d', icon: 'i-lucide-user-plus', value: String(data.value?.newUsers7d ?? '-') },
    { key: 'new30d', label: '新增用户 30d', icon: 'i-lucide-trending-up', value: String(data.value?.newUsers30d ?? '-') },
  ]
  return items
})

// ---------- 数据库状态 ----------
const db = ref<any>(null)

const dbCheckedAtText = computed(() => (db.value?.checkedAt ? new Date(db.value.checkedAt).toLocaleString() : ''))

const dbStats = computed(() => {
  const d = db.value
  if (!d?.ok) return []
  return [
    { label: '状态', value: '正常', icon: 'i-lucide-circle-check' },
    { label: '版本', value: `PostgreSQL ${d.version}`, icon: 'i-lucide-database' },
    { label: '响应延迟', value: `${d.latencyMs} ms`, icon: 'i-lucide-zap' },
    { label: '库大小', value: formatBytes(d.databaseSize), icon: 'i-lucide-hard-drive' },
    { label: '活动连接', value: String(d.activeConnections), icon: 'i-lucide-plug' },
    { label: '数据表', value: `${d.tables.length} 张`, icon: 'i-lucide-table' },
  ]
})

const dbColumns = [
  { id: 'name', accessorKey: 'name', header: '数据表' },
  { id: 'rows', accessorKey: 'rows', header: '行数' },
  { id: 'size', accessorKey: 'size', header: '大小' },
]

async function fetchDb() {
  try {
    const res = await cRequest<any>('/api/monitor/db', { headers: monitorHeaders() })
    db.value = res
  } catch (e: any) {
    console.error('[monitor] db failed', e)
    if (e?.response?.status === 403) verified.value = false
  }
}

// ---------- 实例状态 ----------
interface LogInfo { path: string; exists: boolean; sizeBytes: number; modifiedAt: string | null }
interface Instance {
  name: string; port: number; ok: boolean; status: number; latencyMs: number; error?: string
  outLog: LogInfo; errorLog: LogInfo
}
const instances = ref<Instance[]>([])
const configFile = ref('')
const checkedAt = ref('')
const loading = ref(false)
const refreshing = ref(false)

const checkedAtText = computed(() => (checkedAt.value ? new Date(checkedAt.value).toLocaleString() : ''))

const columns = [
  { id: 'name', accessorKey: 'name', header: '实例' },
  { id: 'port', accessorKey: 'port', header: '地址' },
  { id: 'status', accessorKey: 'status', header: '状态' },
  { id: 'latency', accessorKey: 'latency', header: '响应' },
  { id: 'outLog', accessorKey: 'outLog', header: 'out 日志' },
  { id: 'errorLog', accessorKey: 'errorLog', header: 'error 日志' },
  { id: 'actions', accessorKey: 'actions', header: '操作' },
]

async function fetchStatus(silent = false) {
  if (!silent) loading.value = true
  try {
    const res = await cRequest<{ configFile: string; checkedAt: string; instances: Instance[] }>(
      '/api/monitor/status', { headers: monitorHeaders() },
    )
    instances.value = res.instances || []
    configFile.value = res.configFile || ''
    checkedAt.value = res.checkedAt || ''
  } catch (e: any) {
    console.error('[monitor] status failed', e)
    if (e?.response?.status === 403) {
      verified.value = false
      throw e // 重新抛出，供 unlock() 弹出密码错误提示
    }
  } finally {
    loading.value = false
  }
}

async function fetchData() {
  try {
    const res = await cRequest<any>('/api/monitor/data', { headers: monitorHeaders() })
    data.value = res
  } catch (e: any) {
    console.error('[monitor] data failed', e)
    if (e?.response?.status === 403) verified.value = false
  }
}

async function refreshAll() {
  if (!verified.value) return
  refreshing.value = true
  try {
    await Promise.all([fetchStatus(), fetchData(), fetchDb()])
  } catch {
    // 403 等已由 fetch 内部处理（重置 verified / 弹出提示），此处兜底避免未捕获异常
  }
  refreshing.value = false
}

// ---------- 自动刷新 ----------
const autoRefreshSec = ref(10)
const refreshOptions = [
  { label: '关闭', value: 0 },
  { label: '5 秒', value: 5 },
  { label: '10 秒', value: 10 },
  { label: '30 秒', value: 30 },
]
let timer: ReturnType<typeof setInterval> | null = null

function restartTimer() {
  if (timer) { clearInterval(timer); timer = null }
  if (autoRefreshSec.value > 0) {
    timer = setInterval(refreshAll, autoRefreshSec.value * 1000)
  }
}
watch(autoRefreshSec, restartTimer)

onMounted(restartTimer)
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

// ---------- 日志查看 ----------
const logOpen = ref(false)
const logTarget = ref<Instance | null>(null)
const logType = ref<'out' | 'error'>('out')
const logGrep = ref('')
const logLines = ref(100)
const logLoading = ref(false)
const logData = ref<{ exists: boolean; lines: string[]; truncated: boolean } | null>(null)
const logPath = ref('')

const linesOptions = [50, 100, 200, 500, 1000].map((v) => ({ label: `${v} 行`, value: v }))
const logText = computed(() => logData.value?.lines.join('\n') ?? '')

function openLogs(row: Instance, type: 'out' | 'error') {
  logTarget.value = row
  logType.value = type
  logGrep.value = ''
  logData.value = null
  logPath.value = ''
  logOpen.value = true
  fetchLogs()
}

async function fetchLogs() {
  if (!logTarget.value) return
  logLoading.value = true
  try {
    const res = await cRequest<{ path: string; exists: boolean; lines: string[]; truncated: boolean }>(
      `/api/monitor/logs?name=${logTarget.value.name}&type=${logType.value}&lines=${logLines.value}&grep=${encodeURIComponent(logGrep.value)}`,
      { headers: monitorHeaders() },
    )
    logData.value = res
    logPath.value = res.path || ''
  } catch (e: any) {
    console.error('[monitor] logs failed', e)
    if (e?.response?.status === 403) verified.value = false
    logData.value = null
  } finally {
    logLoading.value = false
  }
}
</script>
