/**
 * MMO 课程绑定集成测试（无头，真实 Colyseus 服务）
 *
 * 验证三件事：
 *  1. 金币来源于该课程的 coin（= LMS 课程商店同一份），游戏内变化会回写课程
 *  2. 同一用户在不同课程各有独立存档（位置/进度互不串）
 *  3. 缺少 courseId 或不是该课程成员 → 服务端拒绝进入
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import {
  bootServer, shutdownServer, resetStore, leaveAll, leaveRoom,
  join, rejoin, connectExpectingReject, seedSave, grantCourse,
  mirror, waitFor, sleep, MOVE_GUARD_MS,
  nextUserId, nextClassId, saveOf, courseCoins, users, tokens, DEFAULT_COURSE,
} from "./harness";

beforeAll(bootServer);
afterAll(shutdownServer);
beforeEach(resetStore);
afterEach(leaveAll);

const self = (room: any) => mirror(room, room.sessionId);
const coinOf = (userId: number, courseId = DEFAULT_COURSE) => courseCoins.get(`${userId}:${courseId}`);

describe("课程绑定 - 金币", () => {
  it("进入房间时金币 = 该课程的 coin", async () => {
    const c = nextClassId();
    const uid = nextUserId();
    const A = await join(uid, c, { coin: 777 });
    expect(await waitFor(() => self(A)?.gold === 777)).toBe(true);
  });

  it("游戏内卖出获得的金币会回写到课程 coin", async () => {
    const c = nextClassId();
    const uid = nextUserId();
    const A = await join(uid, c, { coin: 100, inventory: { bread: 2 } });
    expect(await waitFor(() => self(A)?.gold === 100)).toBe(true);
    await sleep(MOVE_GUARD_MS);

    A.send("sell", { itemId: "bread", qty: 1 }); // bread.sell = 8
    expect(await waitFor(() => self(A)?.gold === 108)).toBe(true);
    // tick 内 ≈1 秒回写课程 coin（与 LMS 课程商店共用同一份余额）
    expect(await waitFor(() => coinOf(uid) === 108)).toBe(true);
  });

  it("游戏内买入扣除的金币同样回写到课程 coin", async () => {
    const c = nextClassId();
    const uid = nextUserId();
    const A = await join(uid, c, { coin: 100 });
    expect(await waitFor(() => self(A)?.gold === 100)).toBe(true);
    await sleep(MOVE_GUARD_MS);

    A.send("buy", { itemId: "bread", qty: 2 }); // 15 × 2 = 30
    expect(await waitFor(() => self(A)?.gold === 70)).toBe(true);
    expect(await waitFor(() => coinOf(uid) === 70)).toBe(true);
  });
});

describe("课程绑定 - 存档隔离", () => {
  it("同一用户在两门课各有独立存档与金币（互不串）", async () => {
    const c = nextClassId();
    const uid = nextUserId();

    // 课程 11：移动后离房 → 写入课程 11 的存档
    const A = await join(uid, c, { courseId: 11 });
    await sleep(MOVE_GUARD_MS);
    A.send("move", { x: 500, y: 600, facing: 2, mode: "idle" });
    expect(await waitFor(() => self(A)?.x === 500)).toBe(true);
    await leaveRoom(A);
    expect(await waitFor(() => saveOf(uid, 11)?.x === 500)).toBe(true);

    // 课程 22：另一份存档 / 另一个金币余额
    grantCourse(uid, 22, 55);
    seedSave(uid, 22, { x: 900, y: 950 });
    const B = await rejoin(uid, c, 22);
    expect(await waitFor(() => self(B)?.x === 900)).toBe(true);
    expect(self(B)?.gold).toBe(55);
    expect(saveOf(uid, 11)?.x).toBe(500); // 课程 11 的存档未被改动
  });
});

describe("课程绑定 - 进入校验（服务端权威）", () => {
  it("缺少 courseId → 拒绝进入", async () => {
    const c = nextClassId();
    const uid = nextUserId();
    users.set(uid, { id: uid, name: "u" + uid, classId: c });
    const token = `tok_nocourse_${uid}`;
    tokens.set(token, uid);
    await expect(connectExpectingReject(c, { token, courseId: 0 })).rejects.toThrow();
  });

  it("不是该课程成员 → 拒绝进入", async () => {
    const c = nextClassId();
    const uid = nextUserId();
    users.set(uid, { id: uid, name: "u" + uid, classId: c });
    const token = `tok_nonmember_${uid}`;
    tokens.set(token, uid);
    await expect(connectExpectingReject(c, { token, courseId: 999 })).rejects.toThrow();
  });
});
