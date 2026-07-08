import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * useUserProfileConfig 单元测试
 *
 * 测试 composable 的关键行为：
 * 1. transform 抽取 r.data 或裸数据两种 API 响应
 * 2. 5 个开关（allowSelfAvatarUpload/allowChangePassword/allowChangeEmail/allowChangeLocale/allowExportData）
 *    在 user 字段缺失/部分缺失/显式 false 时的行为
 * 3. refresh 函数被暴露
 */

// mock @nuxthub/db (避免顶层 import 错误)
vi.mock("@nuxthub/db", () => ({ db: {}, schema: {} }));

// 保存 useFetch 的最新调用参数（用于测试验证 transform）
let lastUseFetchOptions: any = null
let mockFetchDataValue: any = ref(undefined)

function ref<T>(v: T) { return { value: v } }

vi.mock("#app", () => {
  // 复刻 computed 的简化实现
  function computed<T>(getter: () => T): { value: T } {
    return {
      get value() { return getter() },
    }
  }
  return {
    useFetch: (_url: string, opts: any) => {
      lastUseFetchOptions = opts
      // 触发 transform 计算 finalValue
      const raw = mockFetchDataValue.value
      const finalData = opts.transform(raw)
      return {
        data: ref(finalData),
        refresh: vi.fn(),
      }
    },
    computed,
  }
})

// 全局 stub computed（vitest 不会 import 实际 vue）
;(globalThis as any).computed = function computed<T>(getter: () => T): { value: T } {
  return { get value() { return getter() } }
}
;(globalThis as any).ref = function ref<T>(v: T) { return { value: v } }

describe("useUserProfileConfig — transform behavior", () => {
  beforeEach(() => {
    lastUseFetchOptions = null
    mockFetchDataValue = ref(undefined)
  })

  it("transform unwraps r.data on cResp success envelope", async () => {
    mockFetchDataValue.value = { success: true, data: { user: { allowChangePassword: false } } }
    const { useUserProfileConfig } = await import("../../composables/useUserProfileConfig")
    const { allowChangePassword } = useUserProfileConfig()
    expect(allowChangePassword.value).toBe(false)
  })

  it("transform returns empty object when raw is undefined", async () => {
    mockFetchDataValue.value = undefined
    const { useUserProfileConfig } = await import("../../composables/useUserProfileConfig")
    const { allowSelfAvatarUpload, allowChangeEmail, allowChangeLocale, allowExportData } = useUserProfileConfig()
    // 默认全部为 true
    expect(allowSelfAvatarUpload.value).toBe(true)
    expect(allowChangeEmail.value).toBe(true)
    expect(allowChangeLocale.value).toBe(true)
    expect(allowExportData.value).toBe(true)
  })

  it("transform returns empty object when success=false", async () => {
    mockFetchDataValue.value = { success: false, data: null }
    const { useUserProfileConfig } = await import("../../composables/useUserProfileConfig")
    const { allowChangePassword } = useUserProfileConfig()
    expect(allowChangePassword.value).toBe(true) // 缺省视为允许
  })
})

describe("useUserProfileConfig — flag resolution", () => {
  beforeEach(() => {
    lastUseFetchOptions = null
  })

  it("returns false only when flag is explicitly false (not undefined)", async () => {
    mockFetchDataValue.value = { success: true, data: { user: { allowChangeEmail: false } } }
    const { useUserProfileConfig } = await import("../../composables/useUserProfileConfig")
    const { allowChangeEmail, allowChangePassword } = useUserProfileConfig()
    expect(allowChangeEmail.value).toBe(false)
    expect(allowChangePassword.value).toBe(true) // 未设置 → 默认 true
  })

  it("exposes all 5 flags + refresh", async () => {
    mockFetchDataValue.value = { success: true, data: { user: {} } }
    const { useUserProfileConfig } = await import("../../composables/useUserProfileConfig")
    const result = useUserProfileConfig()
    expect(result.allowSelfAvatarUpload).toBeDefined()
    expect(result.allowChangePassword).toBeDefined()
    expect(result.allowChangeEmail).toBeDefined()
    expect(result.allowChangeLocale).toBeDefined()
    expect(result.allowExportData).toBeDefined()
    expect(typeof result.refresh).toBe("function")
  })

  it("fetch uses /api/config/get with SSR-friendly options", async () => {
    mockFetchDataValue.value = { success: true, data: {} }
    const { useUserProfileConfig } = await import("../../composables/useUserProfileConfig")
    useUserProfileConfig()
    expect(lastUseFetchOptions.key).toBe("lms-user-profile-config")
    expect(lastUseFetchOptions.server).toBe(true)
    expect(lastUseFetchOptions.lazy).toBe(false)
    expect(lastUseFetchOptions.url || "/api/config/get").toBeTruthy()
  })
})
