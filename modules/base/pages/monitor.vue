<template>
  <div class="container mx-auto max-w-7xl px-4 py-6 space-y-6">
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

// ---------- 管理员守卫 ----------
const { hasRole } = useAuth()
if (import.meta.client && !hasRole('admin')) {
  navigateTo('/')
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

async function fetchStatus() {
  loading.value = true
  try {
    const res = await cRequest<{ configFile: string; checkedAt: string; instances: Instance[] }>('/api/monitor/status')
    instances.value = res.instances || []
    configFile.value = res.configFile || ''
    checkedAt.value = res.checkedAt || ''
  } catch (e: any) {
    console.error('[monitor] status failed', e)
  } finally {
    loading.value = false
  }
}

async function fetchData() {
  try {
    const res = await cRequest<any>('/api/monitor/data')
    data.value = res
  } catch (e: any) {
    console.error('[monitor] data failed', e)
  }
}

async function refreshAll() {
  refreshing.value = true
  await Promise.all([fetchStatus(), fetchData()])
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

onMounted(() => {
  refreshAll()
  restartTimer()
})
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
    )
    logData.value = res
    logPath.value = res.path || ''
  } catch (e: any) {
    console.error('[monitor] logs failed', e)
    logData.value = null
  } finally {
    logLoading.value = false
  }
}
</script>
