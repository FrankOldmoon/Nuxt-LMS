/**
 * 单元测试 setup：把 Nitro + Nuxt + base 模块的 stubs 暴露到 globalThis
 *
 * vitest.config.ts 中 unit 项目通过 setupFiles 引用此文件。
 */
import { ref, computed, reactive, watch, watchEffect, onMounted, onBeforeUnmount, onUnmounted, onBeforeMount, nextTick, getCurrentInstance } from 'vue'
import {
  getQuery, setMockQuery,
  getCookie, setMockCookie, clearMockCookies,
  createError, readBody, setMockBody,
  sendError, setResponseStatus, setHeader, getHeader,
  setCookie, deleteCookie,
  getRequestIP,
  registerMeEnrich, runOnMeEnrich, clearMeEnrichHandlers,
  getConfig, setMockConfigValue, setMockConfigStore, clearMockConfigStore,
  assignRoleToUser, getAssignedRoles, clearAssignedRoles,
  getCurrentUserId,
  cResp, hashPassword, verifyPassword, generateToken,
  requireAuth, requireRole, requirePermission, requireAdmin, getCurrentUser,
  setMockAuthState,
  upsertConfig, reloadConfig,
  broadcastToAll, getWsBroadcasts, clearWsBroadcasts,
  requireCourseTeacher,
  defineEventHandler, eventHandler, $fetch,
  setMockFetchHandler, clearMockFetchHandler,
  useStorage,
  useState, clearUseState,
  useRoute, setMockRoute, useRouter, setMockRouter,
  useNuxtApp, clearNuxtAppPayload,
  useFetch, useAsyncData,
  useI18n, setMockI18n,
  useRuntimeConfig, setMockRuntimeConfig,
  refreshNuxtData, useHead, useSeoMeta, definePageMeta, navigateTo,
  useAuth, setMockAuthUser, clearMockAuth,
  useWsConnection, cRequest,
  registerWsHandler, dispatchWsHandler, clearMockWsHandlers,
  resetAllStubs,
} from './nuxt-stubs'

const _exports: Record<string, any> = {
  // Vue auto-imports
  ref, computed, reactive, watch, watchEffect,
  onMounted, onBeforeUnmount, onUnmounted, onBeforeMount, nextTick, getCurrentInstance,
  // Nuxt auto-imports
  getQuery, setMockQuery,
  getCookie, setMockCookie, clearMockCookies,
  createError, readBody, setMockBody,
  sendError, setResponseStatus, setHeader, getHeader,
  setCookie, deleteCookie,
  getRequestIP,
  registerMeEnrich, runOnMeEnrich, clearMeEnrichHandlers,
  getConfig, setMockConfigValue, setMockConfigStore, clearMockConfigStore,
  assignRoleToUser, getAssignedRoles, clearAssignedRoles,
  getCurrentUserId,
  cResp, hashPassword, verifyPassword, generateToken,
  requireAuth, requireRole, requirePermission, requireAdmin, getCurrentUser,
  setMockAuthState,
  upsertConfig, reloadConfig,
  broadcastToAll, getWsBroadcasts, clearWsBroadcasts,
  requireCourseTeacher,
  defineEventHandler, eventHandler, $fetch,
  setMockFetchHandler, clearMockFetchHandler,
  useStorage,
  useState, clearUseState,
  useRoute, setMockRoute, useRouter, setMockRouter,
  useNuxtApp, clearNuxtAppPayload,
  useFetch, useAsyncData,
  useI18n, setMockI18n,
  useRuntimeConfig, setMockRuntimeConfig,
  refreshNuxtData, useHead, useSeoMeta, definePageMeta, navigateTo,
  useAuth, setMockAuthUser, clearMockAuth,
  useWsConnection, cRequest,
  registerWsHandler, dispatchWsHandler, clearMockWsHandlers,
  resetAllStubs,
}

for (const [name, value] of Object.entries(_exports)) {
  // @ts-ignore
  globalThis[name] = value
}
