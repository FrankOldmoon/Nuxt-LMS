/**
 * Nuxt auto-imports + composable test stubs
 *
 * 被 vitest.config.ts 中 "composables" 项目引用。
 *
 * 为所有 composable 测试提供：
 * 1. Nuxt auto-imports（useState / useFetch / useRoute / useI18n / $fetch / ...）
 * 2. Nitro auto-imports（createError / getQuery / getCookie / defineEventHandler / ...）
 * 3. base 模块 utils（cRequest / useAuth / useWsConnection / registerWsHandler）
 * 4. 浏览器 API 桩（通过 happy-dom 提供，但 Web Speech / WebGPU 需要手动 stub）
 *
 * @example
 * ```ts
 * import { setupNuxtStubs } from './nuxt-stubs'
 * setupNuxtStubs()
 * ```
 */
import { ref, computed, reactive, watch, watchEffect, onMounted, onBeforeUnmount, onUnmounted, onBeforeMount, nextTick, getCurrentInstance, toValue } from 'vue'

// ===================== 1. Nuxt auto-imports =====================

/** useState: 跨调用全局共享响应式状态 */
const _useStateStore = new Map<string, any>()
export function useState<T>(key: string, init?: () => T) {
  if (!_useStateStore.has(key)) {
    _useStateStore.set(key, ref(init ? init() : (undefined as any)))
  }
  return _useStateStore.get(key)
}

export function clearUseState() {
  _useStateStore.clear()
}

/** useRoute: 提供 route.params / query */
let _mockRoute: any = { params: {}, query: {}, path: '/', fullPath: '/' }
export function useRoute() {
  return _mockRoute
}
export function setMockRoute(route: any) {
  _mockRoute = reactive({ ...route })
}

/** useRouter */
let _mockRouter: any = {
  push: () => {},
  replace: () => {},
  back: () => {},
  go: () => {},
  currentRoute: _mockRoute,
}
export function useRouter() {
  return _mockRouter
}
export function setMockRouter(router: any) {
  _mockRouter = { ...router }
}

/** useNuxtApp: 提供 payload / static / ssrContext */
const _nuxtApp: any = {
  payload: { data: {}, state: {} },
  static: { data: {} },
  ssrContext: undefined,
  isHydrating: false,
}
export function useNuxtApp() {
  return _nuxtApp
}
export function clearNuxtAppPayload() {
  _nuxtApp.payload.data = {}
  _nuxtApp.static.data = {}
}

/** useFetch: 模拟 useFetch（单层包装） */
export function useFetch(url: any, options: any = {}) {
  const data = ref<any>(options.default ? options.default() : null)
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<any>(null)
  const refresh = async () => {
    status.value = 'pending'
    try {
      let resp: any
      // 优先用 _mockFetchHandler（可完整 mock 响应）
      if (_mockFetchHandler) {
        resp = await _mockFetchHandler(toValue(url), options)
      } else if (url === '/api/auth/me' && _mockAuthUser) {
        // 兼容旧的 _mockAuthUser 短路
        resp = {
          data: {
            user: _mockAuthUser,
            roles: _mockAuthRoles,
            permissions: _mockAuthPermissions,
          },
          success: true,
          msg: '',
        }
      } else {
        resp = await $fetch(url, options as any)
      }
      const transformed = options.transform ? options.transform(resp) : resp
      data.value = transformed
      status.value = 'success'
    } catch (e) {
      error.value = e
      status.value = 'error'
    }
  }
  // 默认立刻执行（lazy=false）
  if (options.lazy !== true) {
    refresh()
  }
  return { data, status, error, refresh, pending: computed(() => status.value === 'pending') }
}

/** useAsyncData: 类似 useFetch */
export function useAsyncData(_key: string, _handler?: () => Promise<any>, options: any = {}) {
  return useFetch('', { ...options, transform: options.transform })
}

/** useI18n */
let _mockI18n: any = { locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) }
export function useI18n() {
  return _mockI18n
}
export function setMockI18n(i18n: any) {
  _mockI18n = { ...i18n }
}

/** useRuntimeConfig */
let _mockConfig: any = { public: { moduleBase: true, moduleLms: false }, ...process.env }
export function useRuntimeConfig() {
  return _mockConfig
}
export function setMockRuntimeConfig(cfg: any) {
  _mockConfig = { ..._mockConfig, ...cfg }
}

/** $fetch (useNuxt $fetch) */
let _mockFetchHandler: ((url: string, options: any) => Promise<any>) | null = null
export async function $fetch(url: any, options: any = {}): Promise<any> {
  if (_mockFetchHandler) {
    return _mockFetchHandler(toValue(url), options)
  }
  // 默认返回 success 包裹格式
  return { data: null, success: true, msg: '' }
}
export function setMockFetchHandler(handler: (url: string, options: any) => Promise<any>) {
  _mockFetchHandler = handler
}
export function clearMockFetchHandler() {
  _mockFetchHandler = null
}

/** refreshNuxtData: 触发 useFetch 重新拉取 */
export async function refreshNuxtData(key: string) {
  if (_mockRefreshHandlers.has(key)) {
    await _mockRefreshHandlers.get(key)!()
  }
}
const _mockRefreshHandlers = new Map<string, () => Promise<void>>()
export function registerMockRefresh(key: string, handler: () => Promise<void>) {
  _mockRefreshHandlers.set(key, handler)
}

/** useHead / useSeoMeta (空实现) */
export function useHead() {}
export function useSeoMeta() {}

/** definePageMeta (空实现) */
export function definePageMeta() {}

/** navigateTo */
export async function navigateTo(to: any) {
  _mockRouter.push(to)
  return Promise.resolve()
}

/** useToast — Nuxt UI toast，测试中收集 add 调用便于断言 */
const _toastCalls: any[] = []
export function useToast() {
  return {
    add: (opts: any) => { _toastCalls.push(opts) },
    remove: (_id: any) => {},
    update: (_id: any, _opts: any) => {},
  }
}
export function getToastCalls() { return _toastCalls }
export function clearToastCalls() { _toastCalls.length = 0 }

/** defineNuxtRouteMiddleware — 路由中间件定义，返回传入函数 */
export function defineNuxtRouteMiddleware(fn: (to: any, from: any) => any) {
  return fn
}

/** getRouterParam — 从 event.params 读取路由参数 */
export function getRouterParam(event: any, name: string): string | undefined {
  return event?.params?.[name]
}

/** useLayoutState — layout 共享状态（lms useChapterTask 用） */
let _mockLayoutState: any = { notifyCourseNavUpdate: () => {} }
export function useLayoutState() {
  return _mockLayoutState
}
export function setMockLayoutState(state: any) {
  _mockLayoutState = { ..._mockLayoutState, ...state }
}

/** provide / inject — Vue 依赖注入桩（useLmsContext 用，无组件上下文时用 Map 存储） */
const _provideStore = new Map<any, any>()
export function provide(key: any, value: any) {
  _provideStore.set(key, value)
}
export function inject(key: any, defaultValue?: any) {
  return _provideStore.has(key) ? _provideStore.get(key) : defaultValue
}
export function clearProvideStore() {
  _provideStore.clear()
}

/** useLmsContext 桩 — 返回可配置的 courseId/chapterId computed refs */
let _mockLmsCourseId = ref(0)
let _mockLmsChapterId = ref(0)
export function useLmsContext() {
  return {
    courseId: computed(() => _mockLmsCourseId.value),
    chapterId: computed(() => _mockLmsChapterId.value),
  }
}
export function setMockLmsContext(courseId: number, chapterId: number = 0) {
  _mockLmsCourseId.value = courseId
  _mockLmsChapterId.value = chapterId
}

/** provideLmsContext / provideLmsCourseId — 桩（测试中 no-op） */
export function provideLmsContext(_courseId: any, _chapterId?: any) {}
export function provideLmsCourseId(_courseId: any) {}

/** createError */
export function createError(opts: { statusCode?: number; statusMessage?: string; message?: string }) {
  const err: any = new Error(opts.statusMessage || opts.message || 'Error')
  err.statusCode = opts.statusCode ?? 500
  err.statusMessage = opts.statusMessage
  return err
}

/** import.meta.client / import.meta.server — 由 vitest.config.ts define 提供 */

// ===================== 2. Nitro auto-imports =====================

/** defineEventHandler */
export function defineEventHandler(handler: (event: any) => any) {
  return handler
}

/** eventHandler — 别名（部分文件用此小写形式） */
export const eventHandler = defineEventHandler

/** getQuery */
let _mockQuery: Record<string, any> = {}
export function getQuery(event?: any): Record<string, any> {
  return event?.query ?? _mockQuery
}
export function setMockQuery(q: Record<string, any>) {
  _mockQuery = q
}

/** getCookie */
let _mockCookies: Record<string, any> = {}
export function getCookie(event: any, name: string): any {
  return event?.cookies?.[name] ?? _mockCookies[name]
}
export function setMockCookie(name: string, value: any) {
  _mockCookies[name] = value
}
export function clearMockCookies() {
  _mockCookies = {}
}

/** readBody */
export async function readBody(event: any) {
  return event?.body
}
export function setMockBody(event: any, body: any) {
  event.body = body
}

/** sendError / setResponseStatus / setHeader */
export function sendError(_event: any, err: any) {
  throw err
}
export function setResponseStatus(_event: any, _code: number) {
  /* stub */
}
export function setHeader(_event: any, _name: string, _value: any) {
  /* stub */
}
export function getHeader(_event: any, _name: string) {
  return undefined
}

/** setCookie / deleteCookie（实际写入 event.cookies） */
export function setCookie(event: any, name: string, value: string, _opts?: any) {
  if (!event.cookies) event.cookies = {}
  event.cookies[name] = value
}
export function deleteCookie(event: any, name: string, _opts?: any) {
  if (event.cookies) delete event.cookies[name]
}

/** getRequestIP 桩 */
export function getRequestIP(_event: any, _opts?: any): string | null {
  return null
}

/** runOnMeEnrich 桩 — 跨模块扩展钩子 */
const _meEnrichHandlers: Array<(user: any) => Promise<any> | any> = []
export function registerMeEnrich(handler: (user: any) => Promise<any> | any) {
  _meEnrichHandlers.push(handler)
  return () => {
    const i = _meEnrichHandlers.indexOf(handler)
    if (i >= 0) _meEnrichHandlers.splice(i, 1)
  }
}
export async function runOnMeEnrich(user: any) {
  let extra: any = {}
  for (const h of _meEnrichHandlers) {
    try {
      const r = await h(user)
      if (r && typeof r === 'object') extra = { ...extra, ...r }
    } catch {
      /* swallow */
    }
  }
  return extra
}
export function clearMeEnrichHandlers() {
  _meEnrichHandlers.length = 0
}

/** runOnUserImported 桩 — 用户导入后跨模块扩展钩子（空实现，不阻塞） */
export async function runOnUserImported(_inserted: any[], _rawUsers: any[]): Promise<void> {
  /* no-op stub */
}

/** useStorage (Nitro) */
export function useStorage() {
  return {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  }
}

/** getSchemaTables 桩 — 返回可配置的表名列表（admin server utils/端点 auto-import） */
let _mockSchemaTables: string[] = ['users', 'courses', 'chapters', 'questions', 'roles', 'permissions']
export function getSchemaTables(): string[] {
  return [..._mockSchemaTables].sort()
}
export function setMockSchemaTables(tables: string[]) {
  _mockSchemaTables = [...tables]
}

/** getTableMeta 桩 — 返回可配置的表元数据（admin 端点 auto-import） */
const _mockTableMetaStore: Record<string, any> = {}
export function getTableMeta(tableName: string): any {
  return _mockTableMetaStore[tableName] || {
    name: tableName,
    hasId: true,
    compositePk: false,
    readOnly: false,
    labelColumn: 'name',
    columns: [{ name: 'id', jsName: 'id', dataType: 'number', columnType: 'PgSerial', notNull: true, hasDefault: true, isPrimaryKey: true, isAutoIncrement: true, isTimestamp: false, isDeletedAt: false }],
  }
}
export function setMockTableMeta(tableName: string, meta: any) {
  _mockTableMetaStore[tableName] = meta
}
export function clearMockTableMeta() {
  Object.keys(_mockTableMetaStore).forEach(k => delete _mockTableMetaStore[k])
}

/** validateTable 桩 — 校验表名在 mock schema 中，否则抛 400 */
export function validateTable(tableName: string | undefined): string {
  if (!tableName || !_mockSchemaTables.includes(tableName)) {
    throw createError({ statusCode: 400, message: `无效的表名: ${tableName}` })
  }
  return tableName
}

// ===================== 2.5. base 模块 server utils 桩 =====================

/** getConfig — 从内存缓存读 site config（默认 mock：返回 null，业务测试可 spy 覆盖） */
let _mockConfigStore: Record<string, any> = {}
export async function getConfig(key: string): Promise<any> {
  return _mockConfigStore[key] ?? null
}
export function setMockConfigStore(store: Record<string, any>) {
  _mockConfigStore = { ...store }
}
export function setMockConfigValue(key: string, value: any) {
  _mockConfigStore[key] = value
}
export function clearMockConfigStore() {
  _mockConfigStore = {}
}

/** assignRoleToUser 桩 */
const _assignedRoles: Array<{ userId: number; roleCode: string; result: boolean }> = []
export async function assignRoleToUser(userId: number, roleCode: string): Promise<boolean> {
  // 默认行为：查 role 是否存在；不 mock db 时返回 true
  const result = true
  _assignedRoles.push({ userId, roleCode, result })
  return result
}
export function getAssignedRoles() {
  return _assignedRoles
}
export function clearAssignedRoles() {
  _assignedRoles.length = 0
}

/** getCurrentUserId 桩（utils/auth 中如有） */
export function getCurrentUserId(_event: any): number | null {
  return null
}

/** addTable / updateTable / batchTable 桩 — 基础 CRUD 工具（auto-import，见 modules/base/server/utils/db.ts）
 *  测试环境不连真实 db，这里返回最小可用值让端点逻辑（如 broadcastToAll）能继续执行 */
export async function addTable(_tableName: string, data: Record<string, any>) {
  return [data]
}
export async function updateTable(_tableName: string, _id: number, _data: Record<string, any>) {
  return undefined
}
export async function batchTable(_tableName: string, _ids: number[], _action: any) {
  return undefined
}
export async function showTable(_tableName: string, id: number) {
  return { id }
}
export async function listTablePaged(_tableName: string, query: any) {
  return { data: [], total: 0, page: query?.page || 1, pageSize: query?.pageSize || 20, columns: [], meta: { name: _tableName, hasId: true, compositePk: false, columns: [], readOnly: false } }
}
export async function importTableRows(_tableName: string, rows: Record<string, any>[]) {
  return { inserted: rows.length, errors: [] }
}
export async function exportTableRows(_tableName: string, _query?: any) {
  return []
}

/** cResp — 统一响应包装（mock 版本） */
export function cResp(data: any = null, msg: string = '', success: boolean = true) {
  return { data, msg, success }
}

/** hashPassword / verifyPassword / generateToken 桩
 *  使用 node:crypto 的 scrypt 生成与真实实现相同格式的 salt:derivedKey
 *  真实实现基于 @nuxthub/db 的依赖，动态加载可能不可用
 */
import { randomBytes, scrypt as _scrypt } from 'node:crypto'
const _SALT_LEN = 16
const _KEY_LEN = 64

function _scryptAsync(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    _scrypt(password, salt, _KEY_LEN, (err, key) => {
      if (err) reject(err)
      else resolve(key.toString('hex'))
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(_SALT_LEN).toString('hex')
  const key = await _scryptAsync(password, salt)
  return `${salt}:${key}`
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false
  const computed = await _scryptAsync(password, salt)
  return key === computed
}
export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/** requireAuth / requireRole / requireAdmin / requirePermission 桩 */
let _mockAuthState: { id: number; username: string; name: string; roles: string[]; permissions: string[] } | null = null
export function setMockAuthState(state: typeof _mockAuthState) {
  _mockAuthState = state
}
export async function requireAuth(_event: any): Promise<NonNullable<typeof _mockAuthState>> {
  if (!_mockAuthState) {
    const err: any = new Error('请先登录')
    err.statusCode = 401
    throw err
  }
  return _mockAuthState
}
export async function requireRole(_event: any, roleCodes: string[]): Promise<NonNullable<typeof _mockAuthState>> {
  const u = await requireAuth(_event)
  if (!roleCodes.some((c) => u.roles.includes(c))) {
    const err: any = new Error('无权限执行此操作')
    err.statusCode = 403
    throw err
  }
  return u
}
export async function requirePermission(_event: any, permCodes: string[]): Promise<NonNullable<typeof _mockAuthState>> {
  const u = await requireAuth(_event)
  if (!permCodes.some((c) => u.permissions.includes(c))) {
    const err: any = new Error('无权限执行此操作')
    err.statusCode = 403
    throw err
  }
  return u
}
export async function requireAdmin(event: any): Promise<NonNullable<typeof _mockAuthState>> {
  return requireRole(event, ['admin'])
}
export async function getCurrentUser(_event: any) {
  return _mockAuthState
}

/** upsertConfig / reloadConfig 桩（直接操作 _mockConfigStore） */
export async function upsertConfig(key: string, value: any) {
  _mockConfigStore[key] = value
}
export async function reloadConfig() {
  // mock：无操作；真实实现会重读 db
}

/** broadcastToAll（WebSocket）桩 */
const _wsBroadcasts: any[] = []
export function broadcastToAll(msg: any) {
  _wsBroadcasts.push(msg)
}
export function getWsBroadcasts() {
  return _wsBroadcasts
}
export function clearWsBroadcasts() {
  _wsBroadcasts.length = 0
}

/** sendToUser（WebSocket 推送给指定用户）桩 */
const _wsSentToUser: Array<{ userId: number; msg: any }> = []
export function sendToUser(userId: number, msg: any) {
  _wsSentToUser.push({ userId, msg })
}
export function getWsSentToUser() {
  return _wsSentToUser
}
export function clearWsSentToUser() {
  _wsSentToUser.length = 0
}

/** trackPeer / untrackPeer / userPeers / allPeers 桩 */
export const userPeers = new Map<number, Set<any>>()
export const allPeers = new Set<any>()
export function trackPeer(_userId: number, _peer: any) {}
export function untrackPeer(_peer: any) {}

/** requireCourseTeacher 桩 */
export async function requireCourseTeacher(_event: any, _courseId?: number) {
  if (!_mockAuthState) {
    const err: any = new Error('请先登录')
    err.statusCode = 401
    throw err
  }
  return _mockAuthState
}

/** isCourseTeacher 桩（LMS 扩展用） */
export async function isCourseTeacher(_userId: number, _courseId: number): Promise<boolean> {
  return false
}

/** LMS config auto-imports 桩 */
const _lmsConfigStore: Record<string, any> = {
  ai: { mode: 'api', model: 'gpt-3.5' },
  question: { submitExp: 2 },
  homework: { submitExp: 5 },
  comment: { publishExp: 3 },
  chapter: { passScore: 60 },
  race: {},
  quiz: { passScore: 60 },
  general: {},
}
export function getLmsConfigSync(): any {
  return _lmsConfigStore
}
export async function reloadLmsConfig(): Promise<any> {
  return _lmsConfigStore
}
export async function getCourseLmsConfig(courseId: number): Promise<any> {
  return { ..._lmsConfigStore, courseId }
}
export function setMockLmsConfig(store: Record<string, any>) {
  Object.keys(_lmsConfigStore).forEach(k => delete _lmsConfigStore[k])
  Object.assign(_lmsConfigStore, store)
}
export function clearMockLmsConfig() {
  Object.keys(_lmsConfigStore).forEach(k => delete _lmsConfigStore[k])
}

/**
 * 拍平存储桩（与 lmsConfig.ts 实现一致：把树形对象转换为 [{key:'lms:section.field', value}]）
 * 供 update.post.ts 在测试环境写入"拍平行"使用
 */
export function flattenTree(prefix: string, obj: any, result: Record<string, any>) {
  if (obj === null || obj === undefined) return
  if (typeof obj !== 'object' || Array.isArray(obj) || obj instanceof Date) {
    if (prefix) result[prefix] = obj
    return
  }
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      flattenTree(fullKey, val, result)
    } else if (val !== undefined) {
      result[fullKey] = val
    }
  }
}
export function unflattenTree(flat: Record<string, any>): any {
  const result: any = {}
  for (const [key, val] of Object.entries(flat)) {
    if (val === undefined) continue
    const parts = key.split('.')
    let cur = result
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]
      if (!(p in cur) || cur[p] === null || typeof cur[p] !== 'object' || Array.isArray(cur[p])) {
        cur[p] = {}
      }
      cur = cur[p]
    }
    cur[parts[parts.length - 1]] = val
  }
  return result
}
export function mergeConfig(defaults: any, overrides: any): any {
  if (!overrides) return defaults
  if (defaults === null || typeof defaults !== 'object' || Array.isArray(defaults) || defaults instanceof Date) {
    return overrides === undefined ? defaults : overrides
  }
  const result: any = { ...defaults }
  for (const [key, val] of Object.entries(overrides)) {
    const defVal = (defaults as any)[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)
        && defVal !== null && typeof defVal === 'object' && !Array.isArray(defVal) && !(defVal instanceof Date)) {
      result[key] = mergeConfig(defVal, val)
    } else {
      result[key] = val === undefined ? defVal : val
    }
  }
  return result
}
/** 拍平为 lms:* 键值对列表 */
export function buildLmsConfigPairs(obj: any): Array<{ key: string; value: any }> {
  const flat: Record<string, any> = {}
  flattenTree('', obj, flat)
  return Object.entries(flat).map(([k, v]) => ({ key: `lms:${k}`, value: v }))
}
/** 测试助手：返回最近一次 buildLmsConfigPairs 的调用（用于断言） */
let _lastLmsPairs: Array<{ key: string; value: any }> = []
export function getLastLmsPairs() { return _lastLmsPairs }

// ===================== 3. base 模块 utils 桩 =====================

/** cRequest — 命令式 API 调用，自动解包 {data, success, msg} */
export async function cRequest<T = any>(url: string, options: any = {}): Promise<T> {
  const resp = await $fetch(url, options)
  if (resp && typeof resp === 'object' && 'success' in resp) {
    if (!resp.success) throw new Error(resp.msg || '请求失败')
    return resp.data
  }
  return resp as T
}

/** 给 cRequest 加 .use 方法（composables 测试用） — 模拟真实 cRequest.use 的 transform 解包逻辑 */
;(cRequest as any).use = (url: any, options: any = {}) => {
  const { transform: customTransform, ...rest } = options
  return useFetch(url, {
    ...rest,
    transform: (raw: any) => {
      if (raw && typeof raw === 'object' && 'data' in raw && 'success' in raw) {
        return customTransform ? customTransform(raw.data) : raw.data
      }
      return customTransform ? customTransform(raw) : raw
    },
  })
}

/** useAuth 桩 — 完整 mock（login/register/logout 走 cRequest，便于测试断言 API 调用） */
let _mockAuthUser: any = null
let _mockAuthRoles: any[] = []
let _mockAuthPermissions: any[] = []
let _mockAuthExtra: any = {}
export function useAuth() {
  const data = computed(() => {
    if (!_mockAuthUser) return null
    return { user: _mockAuthUser, roles: _mockAuthRoles, permissions: _mockAuthPermissions, ..._mockAuthExtra }
  })
  const user = computed(() => _mockAuthUser)
  const roles = computed(() => _mockAuthRoles)
  const permissions = computed(() => _mockAuthPermissions)
  const isLoggedIn = computed(() => !!_mockAuthUser)
  return {
    user,
    roles,
    permissions,
    isLoggedIn,
    isLoading: ref(false),
    hasRole: (code: string) => _mockAuthRoles.some((r: any) => r.code === code),
    hasAnyRole: (codes: string[]) => codes.some(c => _mockAuthRoles.some((r: any) => r.code === c)),
    hasPermission: (code: string) => _mockAuthPermissions.some((p: any) => p.code === code),
    login: async (username: string, password: string) => {
      return await cRequest<{ user: any; token: string }>('/api/auth/login', {
        method: 'POST',
        body: { username, password },
      })
    },
    register: async (username: string, password: string, name: string, email?: string) => {
      return await cRequest<{ user: any; token: string }>('/api/auth/register', {
        method: 'POST',
        body: { username, password, name, email },
      })
    },
    logout: async () => {
      await cRequest('/api/auth/logout', { method: 'POST' })
    },
    refreshUser: async () => {},
    data,
    // 暴露 authData 别名，与真实 useAuth 返回结构一致（供 useAuthLms 读取扩展字段）
    authData: data,
  }
}
export function setMockAuthUser(user: any, roles: any[] = [], permissions: any[] = [], extra: any = {}) {
  _mockAuthUser = user
  _mockAuthRoles = roles
  _mockAuthPermissions = permissions
  _mockAuthExtra = extra
}
export function clearMockAuth() {
  _mockAuthUser = null
  _mockAuthRoles = []
  _mockAuthPermissions = []
  _mockAuthExtra = {}
}

/** useWsConnection 桩 */
export function useWsConnection() {
  return {
    ws: ref(null),
    wsConnected: ref(false),
    joinedRooms: new Set<string>(),
    send: () => {},
    connect: () => {},
    disconnect: () => {},
    joinRoom: () => {},
    leaveRoom: () => {},
  }
}

/**
 * registerWsHandler (composable 测试中可用)
 * 通过动态 import 真实实现，避免在 setup 阶段同步加载造成循环依赖
 */
let _wsHandlersModule: any = null
export async function getWsCallbacksModule() {
  if (!_wsHandlersModule) {
    // vitest 工作目录是项目根，路径用绝对路径
    _wsHandlersModule = await import('../../modules/base/composables/ws/callbacks')
  }
  return _wsHandlersModule
}

// 同步桥接：先占位，由 setupNuxtStubs 异步预加载
const _wsHandlerStubs = new Map<string, ((data: any) => void)[]>()
export function registerWsHandler(type: string, cb: (data: any) => void): () => void {
  let arr = _wsHandlerStubs.get(type)
  if (!arr) {
    arr = []
    _wsHandlerStubs.set(type, arr)
  }
  arr.push(cb)
  return () => {
    const a = _wsHandlerStubs.get(type)
    if (a) {
      const i = a.indexOf(cb)
      if (i >= 0) a.splice(i, 1)
    }
  }
}
export function dispatchWsHandler(type: string, data: any) {
  const arr = _wsHandlerStubs.get(type)
  if (arr) arr.forEach((cb) => cb(data))
}
export function clearMockWsHandlers() {
  _wsHandlerStubs.clear()
}

// ===================== 4. 浏览器 API 扩展桩 =====================

/** Web Speech API stub */
if (typeof (globalThis as any).speechSynthesis === 'undefined') {
  ;(globalThis as any).speechSynthesis = {
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    getVoices: () => [],
    speaking: false,
    paused: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  ;(globalThis as any).SpeechSynthesisUtterance = class {
    text = ''
    lang = ''
    rate = 1
    pitch = 1
    volume = 1
    voice: any = null
    onstart: any = null
    onend: any = null
    onerror: any = null
    constructor(text: string) { this.text = text }
  }
}

/** window 桩：让 ai.ts 等访问 window.speechSynthesis 不报 ReferenceError */
if (typeof (globalThis as any).window === 'undefined') {
  ;(globalThis as any).window = globalThis as any
}

/** WebGPU stub */
try {
  if (typeof (globalThis as any).navigator !== 'undefined') {
    const nav = (globalThis as any).navigator
    if (!('gpu' in nav)) {
      Object.defineProperty(nav, 'gpu', {
        value: undefined,
        configurable: true,
      })
    }
  }
} catch { /* ignore */ }

// ===================== 4b. admin 模块 utils 桩 =====================

/** 表个性化覆盖注册表（与 admin/utils/tableOverride.ts 同构） */
const _tableOverrideRegistry: Record<string, any> = {}
export function registerTableOverride(table: string, override: any) {
  _tableOverrideRegistry[table] = { ..._tableOverrideRegistry[table], ...override }
}
export function clearTableOverrideRegistry() {
  for (const k of Object.keys(_tableOverrideRegistry)) delete _tableOverrideRegistry[k]
}
export function useTableOverride(table: any) {
  const name = computed(() => toValue(table))
  const override = computed(() => _tableOverrideRegistry[name.value] || {})
  return {
    override,
    hasFormOverride: computed(() => !!override.value.form),
    hasShowOverride: computed(() => !!override.value.show),
    hasDeleteOverride: computed(() => !!override.value.delete),
  }
}

// ===================== 5. 初始化入口 =====================

/** 全局 setup 入口 — composable 测试在 beforeEach 中调用 */
export function setupNuxtStubs() {
  // 此 setup 文件已在 import 时完成所有 stub 注入；该函数仅为语义提示
  return true
}

// ===================== 6. 暴露到 globalThis（关键）=====================
// 源文件代码用 auto-imports（useState / useFetch / useI18n / ref / computed / ...），
// 测试环境没有 nuxt 注入，需手动暴露到 globalThis 才能让源码正常运行
const _stubsToExpose: Record<string, any> = {
  // Vue auto-imports（composables 源码中直接用 ref / computed / watch 等）
  ref,
  computed,
  reactive,
  watch,
  watchEffect,
  onMounted,
  onBeforeUnmount,
  onUnmounted,
  onBeforeMount,
  nextTick,
  getCurrentInstance,
  toValue,
  // Nuxt auto-imports
  useState,
  useRoute,
  useRouter,
  useNuxtApp,
  useFetch,
  useAsyncData,
  useI18n,
  useRuntimeConfig,
  $fetch,
  refreshNuxtData, useHead, useSeoMeta, definePageMeta, navigateTo,
  createError,
  useToast, defineNuxtRouteMiddleware, getRouterParam, useLayoutState,
  // Nitro auto-imports
  defineEventHandler,
  eventHandler,
  getQuery,
  getCookie,
  readBody,
  sendError,
  setResponseStatus,
  setHeader,
  getHeader,
  setCookie,
  deleteCookie,
  getRequestIP,
  registerMeEnrich,
  runOnMeEnrich,
  clearMeEnrichHandlers,
  runOnUserImported,
  cResp,
  hashPassword,
  verifyPassword,
  generateToken,
  requireAuth,
  requireRole,
  requirePermission,
  requireAdmin,
  getCurrentUser,
  setMockAuthState,
  upsertConfig,
  reloadConfig,
  broadcastToAll,
  getWsBroadcasts,
  clearWsBroadcasts,
  sendToUser,
  getWsSentToUser,
  clearWsSentToUser,
  trackPeer,
  untrackPeer,
  userPeers,
  allPeers,
  requireCourseTeacher,
  isCourseTeacher,
  addTable,
  updateTable,
  batchTable,
  showTable,
  listTablePaged,
  importTableRows,
  exportTableRows,
  getLmsConfigSync,
  reloadLmsConfig,
  getCourseLmsConfig,
  setMockLmsConfig,
  clearMockLmsConfig,
  flattenTree,
  unflattenTree,
  mergeConfig,
  buildLmsConfigPairs,
  getLastLmsPairs,
  useStorage,
  getSchemaTables, setMockSchemaTables,
  getTableMeta, setMockTableMeta, clearMockTableMeta,
  validateTable,
  // admin module utils
  useTableOverride,
  registerTableOverride,
  clearTableOverrideRegistry,
  // base module utils
  cRequest,
  useAuth,
  useWsConnection,
  registerWsHandler,
  // 控制函数（测试 helper）
  setMockRoute,
  setMockRouter,
  clearNuxtAppPayload,
  setMockI18n,
  setMockRuntimeConfig,
  setMockFetchHandler,
  clearMockFetchHandler,
  registerMockRefresh,
  setMockQuery,
  setMockCookie,
  clearMockCookies,
  setMockBody,
  setMockAuthUser,
  clearMockAuth,
  dispatchWsHandler,
  clearMockWsHandlers,
  clearUseState,
  getToastCalls, clearToastCalls,
  setMockLayoutState,
  resetAllStubs,
}

for (const [name, value] of Object.entries(_stubsToExpose)) {
  ;(globalThis as any)[name] = value
}

/** 清理所有 stub（每个测试间调用） */
export function resetAllStubs() {
  clearUseState()
  clearNuxtAppPayload()
  clearMockAuth()
  clearMockCookies()
  clearMockFetchHandler()
  clearMockWsHandlers()
  clearMeEnrichHandlers()
  clearMockConfigStore()
  clearAssignedRoles()
  clearWsBroadcasts()
  clearWsSentToUser()
  clearMockLmsConfig()
  clearToastCalls()
  clearMockTableMeta()
  clearTableOverrideRegistry()
  _mockAuthState = null
  _mockRefreshHandlers.clear()
  _mockQuery = {}
  _mockRoute = { params: {}, query: {}, path: '/', fullPath: '/' }
  _mockCookies = {}
  _mockSchemaTables = ['users', 'courses', 'chapters', 'questions', 'roles', 'permissions']
  _mockLayoutState = { notifyCourseNavUpdate: () => {} }
  clearProvideStore()
  _mockLmsCourseId.value = 0
  _mockLmsChapterId.value = 0
  userPeers.clear()
  allPeers.clear()
}
