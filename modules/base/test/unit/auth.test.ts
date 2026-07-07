import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * auth.ts 依赖：
 * 1. @nuxthub/db（虚拟模块，需 vi.mock）
 * 2. Nitro 自动导入：getCookie / createError
 *
 * 本测试聚焦纯加密函数（hashPassword / verifyPassword / generateToken）
 * 与鉴权守卫的错误路径（未登录抛 401）。数据库相关分支由集成测试覆盖。
 */

// mock @nuxthub/db —— 提供空 db/schema，仅满足模块加载
vi.mock("@nuxthub/db", () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(() => []) })) })) })),
  },
  schema: {},
}));

// mock Nitro 自动导入
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

import {
  hashPassword,
  verifyPassword,
  generateToken,
  requireAuth,
  requireRole,
  requirePermission,
  requireAdmin,
} from "../../server/utils/auth";

describe("hashPassword / verifyPassword", () => {
  it("hashes a password and verifies it round-trips", async () => {
    const hash = await hashPassword("mySecret123");
    expect(hash).not.toBe("mySecret123");
    expect(hash).toContain(":");
    const [salt, key] = hash.split(":");
    expect(salt.length).toBe(32); // 16 bytes hex
    expect(key.length).toBe(128); // 64 bytes hex
    expect(await verifyPassword("mySecret123", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("rejects malformed hash (no colon)", async () => {
    expect(await verifyPassword("x", "nocolon")).toBe(false);
  });

  it("rejects malformed hash (empty parts)", async () => {
    expect(await verifyPassword("x", ":")).toBe(false);
    expect(await verifyPassword("x", "abc:")).toBe(false);
    expect(await verifyPassword("x", ":def")).toBe(false);
  });

  it("produces different hashes for same password (random salt)", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
    expect(await verifyPassword("same", h1)).toBe(true);
    expect(await verifyPassword("same", h2)).toBe(true);
  });

  it("handles empty password", async () => {
    const hash = await hashPassword("");
    expect(await verifyPassword("", hash)).toBe(true);
    expect(await verifyPassword("nonempty", hash)).toBe(false);
  });
});

describe("generateToken", () => {
  it("returns a hex string", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it("produces 64 hex chars (32 bytes)", () => {
    const token = generateToken();
    expect(token.length).toBe(64);
  });

  it("produces unique tokens", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 50; i++) tokens.add(generateToken());
    expect(tokens.size).toBe(50);
  });
});

describe("requireAuth (unauthenticated path)", () => {
  beforeEach(() => {
    // getCookie 返回 undefined → getCurrentUser 直接返回 null，不触达 DB
    vi.stubGlobal("getCookie", () => undefined);
  });

  it("throws 401 when no auth_token cookie", async () => {
    await expect(requireAuth({})).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: "请先登录",
    });
  });

  it("throws 401 when auth_token cookie is empty string", async () => {
    vi.stubGlobal("getCookie", () => "");
    await expect(requireAuth({})).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe("requireRole / requirePermission / requireAdmin (unauthenticated)", () => {
  beforeEach(() => {
    vi.stubGlobal("getCookie", () => undefined);
  });

  it("requireRole throws 401 when not logged in", async () => {
    await expect(requireRole({}, ["teacher"])).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("requirePermission throws 401 when not logged in", async () => {
    await expect(requirePermission({}, ["course:edit"])).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("requireAdmin throws 401 when not logged in", async () => {
    await expect(requireAdmin({})).rejects.toMatchObject({ statusCode: 401 });
  });
});
