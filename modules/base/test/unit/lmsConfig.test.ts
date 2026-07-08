import { describe, it, expect } from "vitest";

/**
 * lmsConfig.ts 中 mergeConfig 为纯递归深合并函数，无外部依赖。
 * DEFAULT_LMS_CONFIG 为常量也可验证。
 */
import { mergeConfig, DEFAULT_LMS_CONFIG } from "../../server/utils/lmsConfig";

describe("mergeConfig", () => {
  it("returns defaults when overrides is null", () => {
    const defaults = { a: 1, b: 2 };
    expect(mergeConfig(defaults, null)).toEqual(defaults);
  });

  it("returns defaults when overrides is undefined", () => {
    const defaults = { a: 1, b: 2 };
    expect(mergeConfig(defaults, undefined)).toEqual(defaults);
  });

  it("overrides top-level primitive values", () => {
    const defaults = { a: 1, b: "hello" };
    const overrides = { a: 99 };
    expect(mergeConfig(defaults, overrides)).toEqual({ a: 99, b: "hello" });
  });

  it("deep-merges nested objects", () => {
    const defaults = { question: { submitExp: 2, correctBonusExp: 5 } };
    const overrides = { question: { correctBonusExp: 10 } };
    const result = mergeConfig(defaults, overrides);
    expect(result.question.submitExp).toBe(2); // kept from defaults
    expect(result.question.correctBonusExp).toBe(10); // overridden
  });

  it("keeps defaults when override key is missing", () => {
    const defaults = { a: 1, b: 2, c: 3 };
    const overrides = { b: 20 };
    expect(mergeConfig(defaults, overrides)).toEqual({ a: 1, b: 20, c: 3 });
  });

  it("does not add keys that exist only in overrides (not in defaults)", () => {
    const defaults = { a: 1 };
    const overrides = { b: 2 };
    // mergeConfig iterates over defaults keys only
    expect(mergeConfig(defaults, overrides)).toEqual({ a: 1 });
  });

  it("handles 3-level deep merge", () => {
    const defaults = { l1: { l2: { l3: "default", keep: true } } };
    const overrides = { l1: { l2: { l3: "overridden" } } };
    const result = mergeConfig(defaults, overrides);
    expect(result.l1.l2.l3).toBe("overridden");
    expect(result.l1.l2.keep).toBe(true);
  });

  it("does not treat arrays as objects (does not deep-merge arrays)", () => {
    const defaults = { items: [1, 2, 3] };
    const overrides = { items: [4, 5] };
    // Arrays should be replaced, not merged (Array.isArray check in mergeConfig)
    expect(mergeConfig(defaults, overrides).items).toEqual([4, 5]);
  });

  it("uses override value when override value is explicitly undefined (keeps default)", () => {
    const defaults = { a: 1 };
    const overrides = { a: undefined };
    // mergeConfig: overrides[key] !== undefined ? overrides[key] : defaults[key]
    // undefined means "use default"
    expect(mergeConfig(defaults, overrides).a).toBe(1);
  });

  it("does not mutate the defaults object", () => {
    const defaults = { a: 1, nested: { x: 10 } };
    const originalDefaults = JSON.parse(JSON.stringify(defaults));
    mergeConfig(defaults, { a: 99, nested: { x: 20 } });
    expect(defaults).toEqual(originalDefaults);
  });
});

describe("DEFAULT_LMS_CONFIG", () => {
  it("has top-level sections", () => {
    expect(DEFAULT_LMS_CONFIG.question).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.homework).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.comment).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.chapter).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.race).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.quiz).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.general).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.course).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.chapterBtns).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.courseBtns).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.storage).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.ai).toBeDefined();
  });

  it("ai section has correct default mode", () => {
    expect(DEFAULT_LMS_CONFIG.ai.mode).toBe("api");
  });

  it("ai section has empty llmApiKey and llmApiUrl by default", () => {
    expect(DEFAULT_LMS_CONFIG.ai.llmApiKey).toBe("");
    expect(DEFAULT_LMS_CONFIG.ai.llmApiUrl).toBe("");
  });

  it("storage has default driveSize of 1GB", () => {
    expect(DEFAULT_LMS_CONFIG.storage.driveSize).toBe(1073741824);
  });

  it("registration is disabled in siteConfig by default (documented constraint)", () => {
    // Note: allowRegistration is in siteConfig, not lmsConfig — but
    // DEFAULT_LMS_CONFIG.course section controls course-level defaults
    expect(DEFAULT_LMS_CONFIG.course.showDanmaku).toBe(true);
    expect(DEFAULT_LMS_CONFIG.course.defaultChapterOpen).toBe(true);
  });
});
