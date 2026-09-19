/**
 * MMO 实时同步集成测试（无头，真实 Colyseus 服务 + 多客户端）
 *
 * 覆盖：位置/朝向/动作、外观/装备(衣服)、属性、跨房间(classId)隔离、存档持久化。
 * 脚手架见 ./harness.ts；渲染/动画播放不在本层覆盖（需浏览器）。
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import {
  bootServer, shutdownServer, resetStore, leaveAll, leaveRoom,
  join, mirror, count, waitFor, waitPlayers, sleep,
  MOVE_GUARD_MS, nextUserId, nextClassId, saveOf,
} from "./harness";

beforeAll(bootServer);
afterAll(shutdownServer);
beforeEach(resetStore);
afterEach(leaveAll);

describe("位置 / 朝向 / 动作同步（同房间）", () => {
  it("A 移动后，B 的镜像状态同步到 A 的坐标/朝向/动作", async () => {
    const c = nextClassId();
    const A = await join(nextUserId(), c);
    const B = await join(nextUserId(), c);
    await waitPlayers(A, 2);
    await waitPlayers(B, 2);
    await sleep(MOVE_GUARD_MS);

    A.send("move", { x: 1234, y: 567, facing: 1, mode: "walk" });

    const synced = await waitFor(() => {
      const m = mirror(B, A.sessionId);
      return !!m && m.x === 1234 && m.y === 567 && m.facing === 1 && m.mode === "walk";
    });
    const m = mirror(B, A.sessionId);
    expect(synced, `B 未同步到 A：${JSON.stringify(m && { x: m.x, y: m.y, facing: m.facing, mode: m.mode })}`).toBe(true);
    expect(m.facing).toBe(1);
    expect(m.mode).toBe("walk");
  });
});

describe("外观 / 衣服(装备) 同步", () => {
  it("A 修改外观后，B 看到 cfgJSON 更新", async () => {
    const c = nextClassId();
    const A = await join(nextUserId(), c);
    const B = await join(nextUserId(), c);
    await waitPlayers(B, 2);

    A.send("appearance", { cfg: { gender: "Female", layers: { Body: 1, Clothing1: 8 } } });

    const ok = await waitFor(() => {
      const m = mirror(B, A.sessionId);
      if (!m) return false;
      try { return JSON.parse(m.cfgJSON).gender === "Female"; } catch { return false; }
    });
    expect(ok).toBe(true);
    expect(JSON.parse(mirror(B, A.sessionId).cfgJSON).layers.Clothing1).toBe(8);
  });

  it("A 装备外套后，B 看到 equippedJSON 更新（衣服同步）", async () => {
    const c = nextClassId();
    const A = await join(nextUserId(), c, { cfg: { gender: "Male", layers: { Body: 1 } }, inventory: { coat_m_1: 1 } });
    const B = await join(nextUserId(), c);
    await waitPlayers(B, 2);

    A.send("equip", { itemId: "coat_m_1" });

    const ok = await waitFor(() => {
      const m = mirror(B, A.sessionId);
      if (!m) return false;
      try { return Object.values(JSON.parse(m.equippedJSON)).includes("coat_m_1"); } catch { return false; }
    });
    expect(ok).toBe(true);
  });
});

describe("属性同步（服务端权威）", () => {
  it("A 使用药水回血后，A 自身与 B 镜像的 hp 均更新，背包被扣除", async () => {
    const c = nextClassId();
    const A = await join(nextUserId(), c, { hp: 40, inventory: { potion: 2 } });
    const B = await join(nextUserId(), c);
    await waitPlayers(A, 2);
    await waitPlayers(B, 2);

    const selfA = () => mirror(A, A.sessionId);
    expect(await waitFor(() => selfA()?.hp === 40)).toBe(true);

    A.send("use", { itemId: "potion" }); // potion heal 50 → 40 + 50 = 90

    expect(await waitFor(() => selfA()?.hp === 90)).toBe(true);
    expect(await waitFor(() => mirror(B, A.sessionId)?.hp === 90)).toBe(true);
    expect(JSON.parse(selfA().inventoryJSON).potion).toBe(1);
  });

  it("A 购买后金币/背包权威更新并广播", async () => {
    const c = nextClassId();
    const A = await join(nextUserId(), c, { gold: 100 });
    await waitPlayers(A, 1);
    const selfA = () => mirror(A, A.sessionId);

    A.send("buy", { itemId: "bread", qty: 1 }); // bread buy 15

    expect(await waitFor(() => selfA()?.gold === 85)).toBe(true);
    expect(JSON.parse(selfA().inventoryJSON).bread).toBe(1);
  });
});

describe("房间隔离（classId）", () => {
  it("不同班级的玩家互相不可见", async () => {
    const c1 = nextClassId();
    const c2 = nextClassId();
    const A = await join(nextUserId(), c1);
    const B = await join(nextUserId(), c1);
    const C = await join(nextUserId(), c2);
    await waitPlayers(A, 2);
    await waitPlayers(B, 2);
    await waitPlayers(C, 1);
    await sleep(300); // 留出跨房间误广播的窗口

    expect(count(A)).toBe(2);
    expect(count(B)).toBe(2);
    expect(count(C)).toBe(1);
    expect(mirror(C, A.sessionId)).toBeUndefined();
    expect(mirror(C, B.sessionId)).toBeUndefined();
    expect(mirror(A, C.sessionId)).toBeUndefined();
  });
});

describe("存档持久化（离房写入）", () => {
  it("A 移动后离开，位置被写入存档", async () => {
    const c = nextClassId();
    const uid = nextUserId();
    const A = await join(uid, c);
    await waitPlayers(A, 1);
    await sleep(MOVE_GUARD_MS);

    A.send("move", { x: 777, y: 888, facing: 3, mode: "walk" });
    expect(await waitFor(() => mirror(A, A.sessionId)?.x === 777)).toBe(true);

    await leaveRoom(A);
    expect(await waitFor(() => saveOf(uid)?.x === 777)).toBe(true);
    expect(saveOf(uid)!.y).toBe(888);
  });
});
