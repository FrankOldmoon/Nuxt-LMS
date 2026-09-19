/**
 * MMO 集成流程测试（无头，真实 Colyseus 服务 + 多客户端）
 *
 * 覆盖同步之外的流程：切图(mapId)同步、地面物品拾取(跨客户端)、
 * 出售/卸装同步、断线重连恢复存档、班级不匹配被服务端踢出。
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import {
  bootServer, shutdownServer, resetStore, leaveAll, leaveRoom,
  join, rejoin, connectExpectingReject,
  mirror, waitFor, waitPlayers, sleep,
  MOVE_GUARD_MS, nextUserId, nextClassId, saveOf, users, tokens,
} from "./harness";

const grounds = (room: any) => Array.from(room.state.groundItems as any) as any[];

beforeAll(bootServer);
afterAll(shutdownServer);
beforeEach(resetStore);
afterEach(leaveAll);

describe("切图同步", () => {
  it("A 切换地图后，B 看到 A 的 mapId 更新", async () => {
    const c = nextClassId();
    const A = await join(nextUserId(), c);
    const B = await join(nextUserId(), c);
    await waitPlayers(B, 2);

    A.send("map", { mapId: "indoor" });

    expect(await waitFor(() => mirror(B, A.sessionId)?.mapId === "indoor")).toBe(true);
  });
});

describe("地面物品拾取（跨客户端）", () => {
  it("A 丢弃后拾取，物品从 A/B 状态移除并进入 A 背包", async () => {
    const c = nextClassId();
    const A = await join(nextUserId(), c, { inventory: { bread: 1 } });
    const B = await join(nextUserId(), c);
    await waitPlayers(B, 2);

    // 主地图已不再预置地面物：由 A 丢弃一件物品产生
    await sleep(MOVE_GUARD_MS);
    A.send("move", { x: 500, y: 500, facing: 2, mode: "idle" });
    expect(await waitFor(() => mirror(A, A.sessionId)?.x === 500)).toBe(true);
    A.send("drop", { itemId: "bread" });

    expect(await waitFor(() => grounds(A).length > 0), "丢弃后应产生地面物品").toBe(true);
    const g = grounds(A)[0];
    const gid = g.id;
    const gitem = g.itemId;

    A.send("pickup", gid);

    // A 侧：物品消失 + 进背包
    expect(await waitFor(() => !grounds(A).some((x: any) => x.id === gid))).toBe(true);
    expect(JSON.parse(mirror(A, A.sessionId).inventoryJSON)[gitem]).toBeGreaterThanOrEqual(1);
    // B 侧：同样看到物品消失（同步）
    expect(await waitFor(() => !grounds(B).some((x: any) => x.id === gid))).toBe(true);
  });
});

describe("经济 / 装备同步", () => {
  it("A 出售物品后金币增加，B 看到同步", async () => {
    const c = nextClassId();
    const A = await join(nextUserId(), c, { gold: 100, inventory: { bread: 2 } });
    const B = await join(nextUserId(), c);
    await waitPlayers(B, 2);

    A.send("sell", { itemId: "bread", qty: 1 }); // bread.sell = 8

    expect(await waitFor(() => mirror(B, A.sessionId)?.gold === 108)).toBe(true);
    expect(JSON.parse(mirror(B, A.sessionId).inventoryJSON).bread).toBe(1);
  });

  it("A 卸下装备后，B 看到 equippedJSON 清空且装备回背包", async () => {
    const c = nextClassId();
    const A = await join(nextUserId(), c, { equipped: { outer: "coat_m_1" } });
    const B = await join(nextUserId(), c);
    await waitPlayers(B, 2);

    A.send("unequip", { slot: "outer" });

    const ok = await waitFor(() => {
      const m = mirror(B, A.sessionId);
      if (!m) return false;
      try {
        const eq = JSON.parse(m.equippedJSON);
        return !eq.outer && JSON.parse(m.inventoryJSON).coat_m_1 === 1;
      } catch { return false; }
    });
    expect(ok).toBe(true);
  });
});

describe("断线重连恢复存档", () => {
  it("A 移动后离开，重连后从存档位置恢复", async () => {
    const c = nextClassId();
    const uid = nextUserId();
    const A = await join(uid, c);
    await waitPlayers(A, 1);
    await sleep(MOVE_GUARD_MS);

    A.send("move", { x: 4321, y: 1234, facing: 1, mode: "idle" });
    expect(await waitFor(() => mirror(A, A.sessionId)?.x === 4321)).toBe(true);

    await leaveRoom(A);
    expect(await waitFor(() => saveOf(uid)?.x === 4321)).toBe(true);

    const A2 = await rejoin(uid, c);
    await waitPlayers(A2, 1);
    expect(mirror(A2, A2.sessionId).x).toBe(4321);
    expect(mirror(A2, A2.sessionId).y).toBe(1234);
  });
});

describe("班级校验（服务端权威）", () => {
  it("用户真实班级与所进房间不一致时被踢出", async () => {
    const uid = nextUserId();
    users.set(uid, { id: uid, name: "x", classId: 2 });
    const token = `tok_mismatch_${uid}`;
    tokens.set(token, uid);

    // join 选项声明 classId=1（匹配到 1 班房间），但用户真实属于 2 班 → onJoin 拒绝
    await expect(connectExpectingReject(1, { name: "x", token })).rejects.toBeTruthy();
  });
});
