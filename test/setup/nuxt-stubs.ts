/**
 * Vitest setup — stub Nuxt & 模块 auto-imports，让 composable 测试在 happy-dom 环境运行
 *
 * 覆盖的 auto-imports：
 * - Vue: ref, reactive, computed, watch, watchEffect, nextTick, onMounted, onBeforeUnmount, onUnmounted
 * - Nuxt: useState, useRoute, useFetch, useRuntimeConfig, useCookie, navigateTo, useNuxtApp
 * - i18n: useI18n
 * - 模块: cRequest (+cRequest.use), useLayoutState, mergeCourseLmsConfig
 *
 * import.meta.client 在 vitest.config.ts 的 define 中替换为 true
 */
import { vi } from "vitest";
import {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  nextTick,
  onMounted,
  onBeforeUnmount,
  onUnmounted,
  type Ref,
} from "vue";

// ====================== Vue auto-imports ======================
Object.assign(globalThis, {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  nextTick,
  onMounted,
  onBeforeUnmount,
  onUnmounted,
});

// ====================== Nuxt auto-imports ======================

/**
 * useState — 按 key 持久化 ref，模拟 Nuxt 的 SSR 状态共享
 * 同一 key 多次调用返回同一个 ref
 */
const stateMap = new Map<string, Ref<any>>();
function useState<T>(key: string, init: () => T): Ref<T> {
  if (!stateMap.has(key)) {
    stateMap.set(key, ref(init()));
  }
  return stateMap.get(key) as Ref<T>;
}

/** 重置所有 useState 缓存（每个 test beforeEach 调用） */
function resetNuxtState() {
  stateMap.clear();
}

/** useRoute — 返回 mock 路由，测试可覆盖 globalRoute */
const defaultRoute = {
  path: "/",
  params: {} as Record<string, string>,
  query: {} as Record<string, any>,
  meta: {},
};
let currentRoute = { ...defaultRoute };
function useRoute() {
  return currentRoute;
}
function setMockRoute(override: Partial<typeof defaultRoute>) {
  currentRoute = { ...defaultRoute, ...override };
}

/** useFetch — mock，返回可控的 data/refresh/status */
function useFetch(url: string, opts?: any) {
  const data = ref(opts?.default ? opts.default() : null);
  const status = ref("idle");
  const refresh = vi.fn(async () => {
    status.value = "pending";
    await nextTick();
    status.value = "success";
  });
  return { data, refresh, status, error: ref(null), pending: computed(() => status.value === "pending") };
}

/** useRuntimeConfig — mock */
function useRuntimeConfig() {
  return {
    public: {
      apiBase: "http://localhost:3000",
    },
  };
}

/** useCookie — mock */
function useCookie(key: string, opts?: any) {
  const val = ref(null);
  return Object.assign(val, {
    value: null as any,
  }) as any;
}

/** navigateTo — mock */
function navigateTo(to: any) {
  return Promise.resolve();
}

/** useNuxtApp — mock */
function useNuxtApp() {
  return {
    $i18n: { t: (k: string) => k, locale: { value: "en" } },
    provide: vi.fn(),
  };
}

Object.assign(globalThis, {
  useState,
  useRoute,
  useFetch,
  useRuntimeConfig,
  useCookie,
  navigateTo,
  useNuxtApp,
});

// ====================== i18n auto-import ======================
let i18nT = (key: string, params?: any) => key;
function useI18n() {
  return {
    t: i18nT,
    locale: { value: "en" },
    locales: { value: [{ code: "en" }, { code: "zh" }] },
  };
}
function setMockI18n(t: (key: string, params?: any) => string) {
  i18nT = t;
}
Object.assign(globalThis, { useI18n });

// ====================== 模块 auto-imports ======================

/** cRequest — mock async 函数，测试可 vi.mocked 覆盖 */
const cRequest = Object.assign(
  vi.fn(async (url: string, opts?: any) => {
    return null;
  }),
  {
    /** cRequest.use — mock useFetch 风格 */
    use: vi.fn((url: string, opts?: any) => {
      const data = ref(opts?.default ? opts.default() : null);
      const refresh = vi.fn(async () => {});
      return { data, refresh, pending: ref(false), error: ref(null) };
    }),
  },
);
Object.assign(globalThis, { cRequest });

/** useLayoutState — mock，提供 setLayout + 常用状态 */
function useLayoutState() {
  return {
    tocLinks: useState<any[]>("layout-toc", () => []),
    editableContent: useState<any>("layout-editable-content", () => null),
    editableTable: useState<string>("layout-editable-table", () => ""),
    editableId: useState<number>("layout-editable-id", () => 0),
    editableCourseId: useState<number>("layout-editable-course-id", () => 0),
    contentVersion: useState<number>("layout-content-version", () => 0),
    sidebarOverride: useState<boolean | null>("layout-sidebar-override", () => null),
    showDanmaku: useState<boolean>("layout-show-danmaku", () => true),
    chapterBtnsConfig: useState<Record<string, boolean>>("layout-chapter-btns-config", () => ({})),
    courseBtnsConfig: useState<Record<string, boolean>>("layout-course-btns-config", () => ({})),
    courseNavVersion: useState<number>("layout-course-nav-version", () => 0),
    mobileTocOpen: useState<boolean>("layout-mobile-toc-open", () => false),
    showSidebar: computed(() => false),
    isChapterPage: computed(() => false),
    setLayout: vi.fn((patch: Record<string, any>) => {
      // 模拟 setLayout 对 sidebarOverride 的写入
      if ("sidebar" in patch) {
        const ov = useState<boolean | null>("layout-sidebar-override", () => null);
        ov.value = patch.sidebar;
      }
    }),
  };
}
Object.assign(globalThis, { useLayoutState });

/** mergeCourseLmsConfig — mock */
function mergeCourseLmsConfig(base: any, lms?: any) {
  return { ...base, ...(lms || {}) };
}
Object.assign(globalThis, { mergeCourseLmsConfig });

// ====================== 导出工具供测试使用 ======================
export { resetNuxtState, setMockRoute, setMockI18n, useState };
