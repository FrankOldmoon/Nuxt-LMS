import { describe, it, expect } from "vitest";

/**
 * cRequest.ts 中 injectToUrl / injectToBody 为纯函数，无外部依赖。
 */
import { injectToUrl, injectToBody } from "../../utils/cRequest";

describe("injectToUrl", () => {
  it("appends course_id and chapter_id to URL without query string", () => {
    expect(injectToUrl("/api/test", 1, 2)).toBe("/api/test?course_id=1&chapter_id=2");
  });

  it("appends with & when URL already has query string", () => {
    expect(injectToUrl("/api/test?foo=bar", 1, 2)).toBe("/api/test?foo=bar&course_id=1&chapter_id=2");
  });

  it("skips course_id when courseId is 0", () => {
    expect(injectToUrl("/api/test", 0, 5)).toBe("/api/test?chapter_id=5");
  });

  it("skips chapter_id when chapterId is 0", () => {
    expect(injectToUrl("/api/test", 3, 0)).toBe("/api/test?course_id=3");
  });

  it("skips both when both are 0", () => {
    expect(injectToUrl("/api/test", 0, 0)).toBe("/api/test");
  });

  it("does not overwrite existing course_id in URL", () => {
    expect(injectToUrl("/api/test?course_id=99", 1, 2)).toBe("/api/test?course_id=99&chapter_id=2");
  });

  it("does not overwrite existing chapter_id in URL", () => {
    expect(injectToUrl("/api/test?chapter_id=88", 1, 2)).toBe("/api/test?chapter_id=88&course_id=1");
  });

  it("does not overwrite either when both already present", () => {
    expect(injectToUrl("/api/test?course_id=99&chapter_id=88", 1, 2)).toBe("/api/test?course_id=99&chapter_id=88");
  });

  it("handles &course_id= in URL (not just ?course_id=)", () => {
    expect(injectToUrl("/api/test?foo=1&course_id=5", 10, 0)).toBe("/api/test?foo=1&course_id=5");
  });
});

describe("injectToBody", () => {
  it("injects course_id and chapter_id into body object", () => {
    const body = { name: "test" };
    const result = injectToBody(body, 1, 2);
    expect(result).toEqual({ name: "test", course_id: 1, chapter_id: 2 });
  });

  it("does not mutate original body", () => {
    const body = { name: "test" };
    injectToBody(body, 1, 2);
    expect(body).toEqual({ name: "test" }); // original unchanged
  });

  it("skips course_id when courseId is 0", () => {
    const result = injectToBody({}, 0, 5);
    expect(result).toEqual({ chapter_id: 5 });
  });

  it("skips chapter_id when chapterId is 0", () => {
    const result = injectToBody({}, 3, 0);
    expect(result).toEqual({ course_id: 3 });
  });

  it("skips both when both are 0", () => {
    const result = injectToBody({ x: 1 }, 0, 0);
    expect(result).toEqual({ x: 1 });
  });

  it("does not overwrite existing course_id in body", () => {
    const result = injectToBody({ course_id: 99 }, 1, 2);
    expect(result.course_id).toBe(99);
    expect(result.chapter_id).toBe(2);
  });

  it("does not overwrite existing chapter_id in body", () => {
    const result = injectToBody({ chapter_id: 88 }, 1, 2);
    expect(result.chapter_id).toBe(88);
    expect(result.course_id).toBe(1);
  });

  it("returns body as-is when body is null", () => {
    expect(injectToBody(null, 1, 2)).toBe(null);
  });

  it("returns body as-is when body is undefined", () => {
    expect(injectToBody(undefined, 1, 2)).toBe(undefined);
  });

  it("returns body as-is when body is a string", () => {
    expect(injectToBody("raw string", 1, 2)).toBe("raw string");
  });
});
