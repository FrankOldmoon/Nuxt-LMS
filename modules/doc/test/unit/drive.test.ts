import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * doc/server/utils/drive.ts 中 getDriveQuota 和 checkDriveSpace 为纯逻辑函数。
 * 依赖：
 * 1. getLmsConfig() — Nitro 自动导入，需 vi.stubGlobal
 * 2. db/schema — @nuxthub/db，需 vi.mock
 */

vi.mock("@nuxthub/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => [{ total: 500 }]),
      })),
    })),
  },
  schema: {
    files: { userId: "userId", deletedAt: "deletedAt", size: "size" },
  },
}));

import { getDriveQuota, checkDriveSpace } from "../../server/utils/drive";

describe("getDriveQuota", () => {
  beforeEach(() => {
    vi.stubGlobal("getLmsConfig", async () => ({
      storage: { driveSize: 1073741824, teacherMultiplier: 2 },
    }));
  });

  it("returns Infinity for admin", async () => {
    const quota = await getDriveQuota({ id: 1, roles: ["admin"] });
    expect(quota).toBe(Infinity);
  });

  it("returns driveSize * teacherMultiplier for teacher", async () => {
    const quota = await getDriveQuota({ id: 2, roles: ["teacher"] });
    expect(quota).toBe(1073741824 * 2);
  });

  it("returns driveSize for regular user", async () => {
    const quota = await getDriveQuota({ id: 3, roles: ["student"] });
    expect(quota).toBe(1073741824);
  });

  it("returns default 1GB when config has no storage section", async () => {
    vi.stubGlobal("getLmsConfig", async () => ({}));
    const quota = await getDriveQuota({ id: 4, roles: ["student"] });
    expect(quota).toBe(1073741824);
  });

  it("admin with multiple roles still gets Infinity", async () => {
    const quota = await getDriveQuota({ id: 5, roles: ["admin", "teacher"] });
    expect(quota).toBe(Infinity);
  });
});

describe("checkDriveSpace", () => {
  beforeEach(() => {
    vi.stubGlobal("getLmsConfig", async () => ({
      storage: { driveSize: 1000, teacherMultiplier: 1 },
    }));
  });

  it("returns ok=true for admin (always allowed)", async () => {
    const result = await checkDriveSpace({ id: 1, roles: ["admin"] }, 99999);
    expect(result.ok).toBe(true);
    expect(result.quota).toBe(Infinity);
  });

  it("returns ok=true when within quota", async () => {
    // driveSize=1000, getDriveUsed returns 500 (from mock), addSize=200
    // 500 + 200 = 700 <= 1000 → ok
    const result = await checkDriveSpace({ id: 2, roles: ["student"] }, 200);
    expect(result.ok).toBe(true);
    expect(result.used).toBe(500);
    expect(result.after).toBe(700);
  });

  it("returns ok=false when exceeding quota", async () => {
    // driveSize=1000, used=500, addSize=600 → 1100 > 1000
    const result = await checkDriveSpace({ id: 2, roles: ["student"] }, 600);
    expect(result.ok).toBe(false);
    expect(result.after).toBe(1100);
  });

  it("returns ok=true when exactly at quota", async () => {
    // used=500, addSize=500 → 1000 = 1000
    const result = await checkDriveSpace({ id: 2, roles: ["student"] }, 500);
    expect(result.ok).toBe(true);
    expect(result.after).toBe(1000);
  });

  it("returns quota info correctly", async () => {
    const result = await checkDriveSpace({ id: 2, roles: ["student"] }, 100);
    expect(result.quota).toBe(1000);
    expect(result.used).toBe(500);
  });
});
