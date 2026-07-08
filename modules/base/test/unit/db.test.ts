import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * db.ts 中 validateTable 为纯校验函数，依赖 Nitro 自动导入 createError。
 * 其他函数（listTable/showTable 等）依赖 @nuxthub/db，由集成测试覆盖。
 */
const mockCreateError = (opts: { statusCode: number; statusMessage: string }) => {
  const err = new Error(opts.statusMessage) as Error & {
    statusCode: number;
    statusMessage: string;
  };
  err.statusCode = opts.statusCode;
  err.statusMessage = opts.statusMessage;
  return err;
};

beforeEach(() => {
  vi.stubGlobal("createError", mockCreateError);
});

// mock @nuxthub/db with a schema containing known tables
// 注意：vi.mock 会被 hoisted 到文件顶部，factory 中不能引用同文件变量
vi.mock("@nuxthub/db", () => ({
  db: {},
  schema: {
    courses: { id: "courses.id" },
    chapters: { id: "chapters.id" },
    categories: { id: "categories.id" },
    users: { id: "users.id" },
    configs: { id: "configs.id" },
  },
}));

import { validateTable } from "../../server/utils/db";

describe("validateTable", () => {
  it("returns table name for valid table", () => {
    expect(validateTable("courses")).toBe("courses");
    expect(validateTable("chapters")).toBe("chapters");
    expect(validateTable("users")).toBe("users");
  });

  it("throws 400 for undefined table name", () => {
    expect(() => validateTable(undefined)).toThrow();
    try {
      validateTable(undefined);
    } catch (e: any) {
      expect(e.statusCode).toBe(400);
      expect(e.statusMessage).toContain("无效的表名");
    }
  });

  it("throws 400 for empty string table name", () => {
    expect(() => validateTable("")).toThrow();
    try {
      validateTable("");
    } catch (e: any) {
      expect(e.statusCode).toBe(400);
    }
  });

  it("throws 400 for non-existent table name", () => {
    expect(() => validateTable("nonexistent_table")).toThrow();
    try {
      validateTable("nonexistent_table");
    } catch (e: any) {
      expect(e.statusCode).toBe(400);
      expect(e.statusMessage).toContain("nonexistent_table");
    }
  });

  it("throws 400 for SQL injection attempt", () => {
    expect(() => validateTable("users; DROP TABLE users--")).toThrow();
    try {
      validateTable("users; DROP TABLE users--");
    } catch (e: any) {
      expect(e.statusCode).toBe(400);
    }
  });

  it("is case-sensitive (lowercase schema keys)", () => {
    expect(() => validateTable("Courses")).toThrow();
    expect(() => validateTable("USERS")).toThrow();
  });
});
