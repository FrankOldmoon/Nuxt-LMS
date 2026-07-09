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
import { ref, computed, reactive, watch, watchEffect, onMounted, onBeforeUnmount, onUnmounted, onBeforeMount, nextTick, getCurrentInstance } from 'vue'

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
        resp = await _mockFetchHandler(url, options)
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
    return _mockFetchHandler(url, options)
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

/** useStorage (Nitro) */
export function useStorage() {
  return {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  }
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
let _mockAuthState: { id: number; username: string; roles: string[]; permissions: string[] } | null = null
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

/** 给 cRequest 加 .use 方法（composables 测试用） */
;(cRequest as any).use = (url: any, options: any = {}) => {
  return useFetch(url, options)
}

/** useAuth 桩 — 完整 mock */
let _mockAuthUser: any = null
let _mockAuthRoles: any[] = []
let _mockAuthPermissions: any[] = []
export function useAuth() {
  const data = computed(() => {
    if (!_mockAuthUser) return null
    return { user: _mockAuthUser, roles: _mockAuthRoles, permissions: _mockAuthPermissions }
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
    login: async () => ({ user: _mockAuthUser, token: 'mock-token' }),
    register: async () => ({ user: _mockAuthUser, token: 'mock-token' }),
    logout: async () => {},
    refreshUser: async () => {},
    data,
  }
}
export function setMockAuthUser(user: any, roles: any[] = [], permissions: any[] = []) {
  _mockAuthUser = user
  _mockAuthRoles = roles
  _mockAuthPermissions = permissions
}
export function clearMockAuth() {
  _mockAuthUser = null
  _mockAuthRoles = []
  _mockAuthPermissions = []
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
  refreshNuxtData,
  useHead,
  useSeoMeta,
  definePageMeta,
  navigateTo,
  createError,
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
  _mockAuthState = null
  _mockRefreshHandlers.clear()
  _mockQuery = {}
  _mockRoute = { params: {}, query: {}, path: '/', fullPath: '/' }
  _mockCookies = {}
  userPeers.clear()
  allPeers.clear()
}
