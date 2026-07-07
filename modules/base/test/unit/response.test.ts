import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * response.ts 依赖 Nitro 自动导入的 getQuery。这里通过 vi.stubGlobal 注入 mock。
 * cResp 为纯函数，无需 mock。
 */
beforeEach(() => {
  vi.stubGlobal("getQuery", (event: any) => ({ id: event?.query?.id }));
});

import { cResp, getQueryId, requireQueryId } from "../../server/utils/response";

describe("cResp", () => {
  it("wraps data with default success=true and empty msg", () => {
    expect(cResp({ a: 1 })).toEqual({ data: { a: 1 }, msg: "", success: true });
  });

  it("accepts custom msg and success", () => {
    expect(cResp(null, "created", false)).toEqual({
      data: null,
      msg: "created",
      success: false,
    });
  });

  it("handles primitive data values", () => {
    expect(cResp(42, "ok")).toEqual({ data: 42, msg: "ok", success: true });
    expect(cResp("hello")).toEqual({
      data: "hello",
      msg: "",
      success: true,
    });
  });

  it("handles array data", () => {
    expect(cResp([1, 2, 3])).toEqual({
      data: [1, 2, 3],
      msg: "",
      success: true,
    });
  });
});

describe("getQueryId", () => {
  it("returns numeric id from event query", () => {
    expect(getQueryId({ query: { id: "123" } })).toBe(123);
  });

  it("returns NaN for missing id", () => {
    expect(getQueryId({ query: {} })).toBeNaN();
  });

  it("returns NaN for non-numeric id", () => {
    expect(getQueryId({ query: { id: "abc" } })).toBeNaN();
  });

  it("returns 0 for id=0", () => {
    expect(getQueryId({ query: { id: "0" } })).toBe(0);
  });
});

describe("requireQueryId", () => {
  it("returns numeric id for valid id", () => {
    expect(requireQueryId({ query: { id: "456" } })).toBe(456);
  });

  it("returns null for missing id", () => {
    expect(requireQueryId({ query: {} })).toBeNull();
  });

  it("returns null for id=0 (falsy)", () => {
    // Number('0') === 0 → 0 || null → null
    expect(requireQueryId({ query: { id: "0" } })).toBeNull();
  });

  it("returns null for non-numeric id", () => {
    expect(requireQueryId({ query: { id: "abc" } })).toBeNull();
  });

  it("returns the id for a positive integer string", () => {
    expect(requireQueryId({ query: { id: "9999" } })).toBe(9999);
  });
});
