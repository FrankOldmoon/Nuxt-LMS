/**
 * GameRoom.tick() 每秒结算单元测试（无头）
 *
 * 覆盖：倒地→复活、金币脏标记回写课程、周期持久化。
 * （体力/饱食度已移除：不再有衰减/饥饿掉血/高饱食回血）
 * 通过桩替换 colyseus 的 Room（同 gameRoom.test.ts），无需真实服务器。
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("colyseus", () => {
  class Room {}
  return { default: { Room }, Room };
});

import { GameRoom } from "../../server/colyseus/GameRoom";

function makeRoom(players: any[]) {
  const room: any = new GameRoom();
  room.state = { players };
  room.persistPlayer = vi.fn();
  return room;
}
function pl(over: any = {}) {
  return { sessionId: "s1", hp: 100, maxHp: 100, gold: 0, ...over };
}
const ticks = (room: any, n: number) => { for (let i = 0; i < n; i++) room.tick(); };

describe("tick - 倒地与复活", () => {
  it("生命归零首帧记录死亡时间，不立即复活", () => {
    const p = pl({ hp: 0 });
    const room = makeRoom([p]);
    ticks(room, 1);
    expect(p.hp).toBe(0);
    expect(p._deadAt).toBeTruthy();
  });

  it("死亡超过 DEAD_MS 后满血复活", () => {
    const p = pl({ hp: 0, _deadAt: Date.now() - 3000 }); // DEAD_MS = 2500
    const room = makeRoom([p]);
    ticks(room, 1);
    expect(p.hp).toBe(100);
    expect(p._deadAt).toBe(0);
  });

  it("存活玩家不随时间掉血（体力已移除，无衰减/无自动回血）", () => {
    const p = pl();
    const room = makeRoom([p]);
    ticks(room, 30);
    expect(p.hp).toBe(100);
    expect("hunger" in p).toBe(false);
  });
});

describe("tick - 金币回写课程", () => {
  it("有脏标记时调用 flushCoin（≈1 秒内回写课程 coin）", () => {
    const p = pl({ gold: 250, _goldDirty: true });
    const room = makeRoom([p]);
    const flush = vi.spyOn(room, "flushCoin").mockImplementation(() => {});
    ticks(room, 1);
    expect(flush).toHaveBeenCalledWith(p);
    flush.mockRestore();
  });

  it("无脏标记时不回写", () => {
    const p = pl();
    const room = makeRoom([p]);
    const flush = vi.spyOn(room, "flushCoin").mockImplementation(() => {});
    ticks(room, 1);
    expect(flush).not.toHaveBeenCalled();
    flush.mockRestore();
  });
});

describe("tick - 周期持久化", () => {
  it("每 5 秒对每个玩家调用一次 persistPlayer", () => {
    const p = pl();
    const room = makeRoom([p]);
    ticks(room, 4);
    expect(room.persistPlayer).not.toHaveBeenCalled();
    ticks(room, 1); // 第 5 次
    expect(room.persistPlayer).toHaveBeenCalledTimes(1);
    expect(room.persistPlayer).toHaveBeenCalledWith(p);
    ticks(room, 5);
    expect(room.persistPlayer).toHaveBeenCalledTimes(2);
  });
});
