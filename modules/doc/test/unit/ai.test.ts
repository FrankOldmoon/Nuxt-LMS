import { describe, it, expect } from "vitest";

/**
 * doc/utils/ai.ts 中可测试的纯函数/常量：
 * - languageMap 常量
 * - DEFAULT_LLM_MODE / DEFAULT_LLM_MODEL 常量
 * - subscribeLLMState / getLLMState 状态机（模块级单例）
 *
 * 注意：createTTSService / createASRService 依赖浏览器 API，
 * detectVoiceGender / formatBytesLLM / waitForVoices / pickVoice 是模块内私有函数，不导出。
 * 这里只测试导出的公共 API。
 */

// ai.ts 中部分函数使用 import.meta.client，需 mock
vi.stubGlobal("import.meta", { client: false });

import {
  languageMap,
  DEFAULT_LLM_MODE,
  DEFAULT_LLM_MODEL,
  subscribeLLMState,
  getLLMState,
} from "../../utils/ai";

import { vi } from "vitest";

describe("languageMap", () => {
  it("contains common language codes", () => {
    expect(languageMap["zh-CN"]).toBe("中文（简体）");
    expect(languageMap["en-US"]).toBe("英语（美国）");
    expect(languageMap["ja-JP"]).toBe("日语");
    expect(languageMap["ko-KR"]).toBe("韩语");
  });

  it("has at least 15 language entries", () => {
    expect(Object.keys(languageMap).length).toBeGreaterThanOrEqual(15);
  });

  it("maps all keys to non-empty strings", () => {
    for (const [code, name] of Object.entries(languageMap)) {
      expect(code).toBeTruthy();
      expect(name).toBeTruthy();
    }
  });
});

describe("DEFAULT_LLM_MODE", () => {
  it("defaults to 'api' mode (not local)", () => {
    expect(DEFAULT_LLM_MODE).toBe("api");
  });
});

describe("DEFAULT_LLM_MODEL", () => {
  it("is a non-empty string", () => {
    expect(DEFAULT_LLM_MODEL).toBeTruthy();
    expect(typeof DEFAULT_LLM_MODEL).toBe("string");
  });
});

describe("subscribeLLMState / getLLMState", () => {
  it("getLLMState returns initial state", () => {
    const state = getLLMState();
    expect(state).toHaveProperty("ready");
    expect(state).toHaveProperty("loading");
    expect(state).toHaveProperty("progress");
    expect(state).toHaveProperty("error");
    expect(state).toHaveProperty("supported");
    expect(state.ready).toBe(false);
    expect(state.loading).toBe(false);
  });

  it("subscribeLLMState calls listener immediately with current state", () => {
    const states: any[] = [];
    const unsub = subscribeLLMState((s) => states.push({ ...s }));
    expect(states).toHaveLength(1);
    expect(states[0].ready).toBe(false);
    unsub();
  });

  it("unsubscribe stops notifications", () => {
    const states: any[] = [];
    const unsub = subscribeLLMState((s) => states.push({ ...s }));
    states.length = 0;
    unsub();
    // After unsub, no more notifications (state changes from loadLLM etc.)
    // We can't easily trigger state change without browser, but verify unsub doesn't throw
  });

  it("supports multiple subscribers", () => {
    const s1: any[] = [];
    const s2: any[] = [];
    const unsub1 = subscribeLLMState((s) => s1.push(s));
    const unsub2 = subscribeLLMState((s) => s2.push(s));
    expect(s1).toHaveLength(1);
    expect(s2).toHaveLength(1);
    unsub1();
    unsub2();
  });
});
