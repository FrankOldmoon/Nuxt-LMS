/**
 * GameRoom 客户端消息处理器 + onJoin 单元测试（无头）
 *
 * 覆盖 gameRoom.test.ts 未涉及的运行时消息：sell / drop / pickup / use / equip / unequip /
 * hit / talk / loot(no-op)、onCreate 地面物品初始化，以及 onJoin 的鉴权、班级校验、单会话踢人。
 *
 * 手法：桩替换 colyseus 的 Room，捕获 onCreate 里通过 onMessage 注册的处理器后直接调用。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { handlers } = vi.hoisted(() => ({ handlers: new Map<string, Function>() }));

vi.mock("colyseus", () => {
  class Room {
    state: any;
    clients: any[] = [];
    onMessage(type: string, cb: Function) { handlers.set(type, cb); }
    setState(s: any) { this.state = s; }
    setSimulationInterval() { /* noop */ }
  }
  return { default: { Room }, Room };
});

import { GameRoom } from "../../server/colyseus/GameRoom";
import { Player, GroundItem } from "../../server/colyseus/schema";

const MALE_CFG = JSON.stringify({ gender: "Male", layers: { Body: 1 } });
const BASE = {
  sessionId: "s1", x: 10, y: 20, facing: 2, mode: "idle", name: "t", cfgJSON: MALE_CFG,
  gold: 100, inventoryJSON: "{}", equippedJSON: "{}", tasksJSON: "{}", mapId: "world",
  hp: 100, maxHp: 100, xp: 0, level: 1,
};

async function bootRoom(classId = 0) {
  handlers.clear();
  const room: any = new GameRoom();
  room.reloadInstanceTasks = async () => {};
  await room.onCreate({ classId });
  return room;
}
function addPlayer(room: any, over: any = {}) {
  const p = new Player().assign({ ...BASE, ...over });
  room.state.players.push(p);
  return p;
}
const S1 = { sessionId: "s1" };
function call(type: string, client: any, msg?: any) {
  const h = handlers.get(type);
  if (!h) throw new Error(`未注册的消息处理器: ${type}`);
  return h(client, msg);
}
const inv = (p: any) => JSON.parse(p.inventoryJSON);
const eq = (p: any) => JSON.parse(p.equippedJSON);

let room: any;
beforeEach(async () => { room = await bootRoom(); });

describe("onCreate - 地面物品", () => {
  it("主地图不再预置/随机生成任何地面物品", () => {
    expect(room.state.groundItems.length).toBe(0);
  });
});

describe("经济 - sell / buy", () => {
  it("出售扣物品加金币", () => {
    const p = addPlayer(room, { inventoryJSON: JSON.stringify({ bread: 2 }) });
    call("sell", S1, { itemId: "bread", qty: 1 });
    expect(p.gold).toBe(108); // bread.sell = 8
    expect(inv(p).bread).toBe(1);
  });

  it("数量不足时不出售", () => {
    const p = addPlayer(room);
    call("sell", S1, { itemId: "bread", qty: 1 });
    expect(p.gold).toBe(100);
    expect(inv(p).bread).toBeUndefined();
  });

  it("未知物品忽略", () => {
    const p = addPlayer(room);
    call("sell", S1, { itemId: "no_such_item", qty: 1 });
    expect(p.gold).toBe(100);
  });

  it("金币不足购买失败并标记 noGold", () => {
    const p = addPlayer(room, { gold: 5 });
    call("buy", S1, { itemId: "bread", qty: 1 });
    expect(p.gold).toBe(5);
    expect(p._lastErr).toBe("noGold");
    expect(inv(p).bread).toBeUndefined();
  });

  it("购买成功扣金币加物品", () => {
    const p = addPlayer(room);
    call("buy", S1, { itemId: "bread", qty: 1 }); // 15
    expect(p.gold).toBe(85);
    expect(inv(p).bread).toBe(1);
  });
});

describe("背包 - drop / pickup", () => {
  it("丢弃：背包 -1，并在脚下生成地面物品", () => {
    const p = addPlayer(room, { inventoryJSON: JSON.stringify({ bread: 1 }), mapId: "world" });
    const before = room.state.groundItems.length;
    call("drop", S1, { itemId: "bread" });
    expect(inv(p).bread).toBeUndefined();
    expect(room.state.groundItems.length).toBe(before + 1);
    const g = room.state.groundItems[room.state.groundItems.length - 1];
    expect(g.itemId).toBe("bread");
    expect(g.x).toBe(10);
    expect(g.y).toBe(20);
    expect(g.mapId).toBe("world");
  });

  it("未持有物品无法丢弃", () => {
    addPlayer(room);
    const before = room.state.groundItems.length;
    call("drop", S1, { itemId: "bread" });
    expect(room.state.groundItems.length).toBe(before);
  });

  it("拾取：距离内移除地面物品并进背包", () => {
    const p = addPlayer(room, { x: 10, y: 20 });
    room.state.groundItems.push(new GroundItem().assign({ id: "gx", itemId: "gem", x: 10, y: 20, mapId: "world" }));
    call("pickup", S1, "gx");
    expect(room.state.groundItems.find((g: any) => g.id === "gx")).toBeUndefined();
    expect(inv(p).gem).toBe(1);
  });

  it("距离过远无法拾取", () => {
    const p = addPlayer(room, { x: 10, y: 20 });
    room.state.groundItems.push(new GroundItem().assign({ id: "far", itemId: "gem", x: 9999, y: 9999, mapId: "world" }));
    call("pickup", S1, "far");
    expect(room.state.groundItems.find((g: any) => g.id === "far")).toBeTruthy();
    expect(inv(p).gem).toBeUndefined();
  });

  it("拾取不存在的物品无副作用", () => {
    addPlayer(room);
    expect(() => call("pickup", S1, "nope")).not.toThrow();
  });

  it("跨地图无法拾取（村庄二的掉落不能在世界地图拾取）", () => {
    const p = addPlayer(room, { x: 10, y: 20, mapId: "world" });
    room.state.groundItems.push(new GroundItem().assign({ id: "g2", itemId: "gem", x: 10, y: 20, mapId: "village2" }));
    call("pickup", S1, "g2");
    expect(room.state.groundItems.find((g: any) => g.id === "g2")).toBeTruthy();
    expect(inv(p).gem).toBeUndefined();
  });

  it("同地图可拾取（村庄二内的掉落）", () => {
    const p = addPlayer(room, { x: 10, y: 20, mapId: "village2" });
    room.state.groundItems.push(new GroundItem().assign({ id: "g3", itemId: "gem", x: 10, y: 20, mapId: "village2" }));
    call("pickup", S1, "g3");
    expect(inv(p).gem).toBe(1);
  });

  it("掉落一次性：拾取后不会重生", () => {
    vi.useFakeTimers();
    try {
      const p = addPlayer(room, { x: 10, y: 20, mapId: "dungeon" });
      room.state.groundItems.push(new GroundItem().assign({ id: "g4", itemId: "gem", x: 10, y: 20, mapId: "dungeon" }));
      call("pickup", S1, "g4");
      expect(inv(p).gem).toBe(1);
      vi.advanceTimersByTime(120000);
      expect(room.state.groundItems.some((g: any) => g.id === "g4")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("使用 / 装备", () => {
  it("使用药水回血并消耗", () => {
    const p = addPlayer(room, { hp: 40, inventoryJSON: JSON.stringify({ potion: 1 }) });
    call("use", S1, { itemId: "potion" });
    expect(p.hp).toBe(90); // +50
    expect(inv(p).potion).toBeUndefined();
  });

  it("未持有则无法使用", () => {
    const p = addPlayer(room, { hp: 40 });
    call("use", S1, { itemId: "potion" });
    expect(p.hp).toBe(40);
  });

  it("装备：移出背包并写入 equippedJSON", () => {
    const p = addPlayer(room, { inventoryJSON: JSON.stringify({ coat_m_1: 1 }) });
    call("equip", S1, { itemId: "coat_m_1" });
    expect(eq(p).outer).toBe("coat_m_1");
    expect(inv(p).coat_m_1).toBeUndefined();
  });

  it("性别锁：男性角色无法装备女性服饰", () => {
    const p = addPlayer(room, { inventoryJSON: JSON.stringify({ ears_f_3: 1 }) });
    call("equip", S1, { itemId: "ears_f_3" });
    expect(eq(p).ears).toBeUndefined();
    expect(inv(p).ears_f_3).toBe(1);
  });

  it("替换同槽位装备时旧的回到背包", () => {
    const p = addPlayer(room, {
      inventoryJSON: JSON.stringify({ coat_m_2: 1 }),
      equippedJSON: JSON.stringify({ outer: "coat_m_1" }),
    });
    call("equip", S1, { itemId: "coat_m_2" });
    expect(eq(p).outer).toBe("coat_m_2");
    expect(inv(p).coat_m_1).toBe(1);
  });

  it("卸下装备回到背包", () => {
    const p = addPlayer(room, { equippedJSON: JSON.stringify({ outer: "coat_m_1" }) });
    call("unequip", S1, { slot: "outer" });
    expect(eq(p).outer).toBeUndefined();
    expect(inv(p).coat_m_1).toBe(1);
  });
});

describe("受击 / 任务", () => {
  it("受击按防御减免，伤害上限 60", () => {
    const p = addPlayer(room);
    call("hit", S1, { dmg: 30 });
    expect(p.hp).toBe(70);

    const p2 = addPlayer(room, { sessionId: "s2", equippedJSON: JSON.stringify({ armor: "leather_armor" }) });
    call("hit", { sessionId: "s2" }, { dmg: 30 });
    expect(p2.hp).toBe(75); // 30 - def5

    const p3 = addPlayer(room, { sessionId: "s3" });
    call("hit", { sessionId: "s3" }, { dmg: 999 }); // 钳制到 60
    expect(p3.hp).toBe(40);
  });

  it("已死亡玩家不再受击", () => {
    const p = addPlayer(room, { hp: 0 });
    call("hit", S1, { dmg: 30 });
    expect(p.hp).toBe(0);
  });

  it("对话接取任务（gem_hunter 由长老给出，接取不发奖）", () => {
    const p = addPlayer(room);
    call("talk", S1, { key: "elder" });
    const tasks = JSON.parse(p.tasksJSON);
    expect(tasks.gem_hunter.accepted).toBe(true);
    expect(tasks.gem_hunter.done).toBe(false);
    expect(p.gold).toBe(100); // 接取不结算奖励
  });

  it("loot 消息为 no-op（掉落仅由 battleWin 权威产生）", () => {
    const p = addPlayer(room);
    const beforeGold = p.gold;
    const beforeItems = room.state.groundItems.length;
    call("loot", S1, { itemId: "gem", x: 0, y: 0 });
    expect(p.gold).toBe(beforeGold);
    expect(inv(p).gem).toBeUndefined();
    expect(room.state.groundItems.length).toBe(beforeItems);
  });
});

describe("怪物战斗锁", () => {
  it("同一只怪只能被一个玩家锁住（别人抢不到）", () => {
    addPlayer(room, { sessionId: "s1" });
    addPlayer(room, { sessionId: "s2" });
    call("lockMonster", S1, { id: "dungeon:ghost:7:23" });
    expect(room.state.monsterLocks.get("dungeon:ghost:7:23")).toBe("s1");
    call("lockMonster", { sessionId: "s2" }, { id: "dungeon:ghost:7:23" });
    expect(room.state.monsterLocks.get("dungeon:ghost:7:23")).toBe("s1"); // 抢不到
  });

  it("解锁 / 离房会释放锁", async () => {
    addPlayer(room, { sessionId: "s1" });
    call("lockMonster", S1, { id: "m1" });
    call("unlockMonster", S1, { id: "m1" });
    expect(room.state.monsterLocks.get("m1")).toBeUndefined();
    call("lockMonster", S1, { id: "m2" });
    room.persistPlayer = async () => {};
    await room.onLeave({ sessionId: "s1" });
    expect(room.state.monsterLocks.get("m2")).toBeUndefined();
  });

  it("非持有者无法解锁别人的锁", () => {
    addPlayer(room, { sessionId: "s1" });
    addPlayer(room, { sessionId: "s2" });
    call("lockMonster", S1, { id: "m3" });
    call("unlockMonster", { sessionId: "s2" }, { id: "m3" });
    expect(room.state.monsterLocks.get("m3")).toBe("s1");
  });
});

describe("onJoin - 鉴权 / 班级 / 课程 / 单会话", () => {
  const COURSE = 7;
  function stubAuth(userClassId: number, name = "u1") {
    room.authenticate = async (t: string) => (t === "good" ? 1 : null);
    room.userBaseInfo = async () => ({ classId: userClassId, name });
    // 课程成员 + 金币：返回 null 代表不是该课程成员（会被拒绝）
    room.courseInfo = async () => 100;
    room.loadSave = async () => ({
      name: "u1", cfg: {}, gold: 100, inventory: {}, equipped: {}, tasks: {},
      x: 1, y: 2, facing: 2, mode: "idle", mapId: "world",
      hp: 100, maxHp: 100, xp: 0, level: 1,
    });
    room.persistPlayer = async () => {};
  }
  const joinOpts = (token = "good") => ({ token, courseId: COURSE });

  it("token 无效 → 踢出，不生成角色", async () => {
    room = await bootRoom(5);
    stubAuth(5);
    const c = { sessionId: "a", leave: vi.fn() };
    room.clients.push(c);
    await room.onJoin(c, { token: "bad", courseId: COURSE });
    expect(c.leave).toHaveBeenCalled();
    expect(room.state.players.length).toBe(0);
  });

  it("班级不匹配 → 踢出", async () => {
    room = await bootRoom(5);
    stubAuth(6); // 用户属于 6 班，却进了 5 班房间
    const c = { sessionId: "a", leave: vi.fn() };
    room.clients.push(c);
    await room.onJoin(c, joinOpts());
    expect(c.leave).toHaveBeenCalled();
    expect(room.state.players.length).toBe(0);
  });

  it("缺少 courseId → 踢出（游戏数据必须绑定课程）", async () => {
    room = await bootRoom(5);
    stubAuth(5);
    const c = { sessionId: "a", leave: vi.fn() };
    room.clients.push(c);
    await room.onJoin(c, { token: "good" });
    expect(c.leave).toHaveBeenCalled();
    expect(room.state.players.length).toBe(0);
  });

  it("不是该课程成员 → 踢出", async () => {
    room = await bootRoom(5);
    stubAuth(5);
    room.courseInfo = async () => null;
    const c = { sessionId: "a", leave: vi.fn() };
    room.clients.push(c);
    await room.onJoin(c, joinOpts());
    expect(c.leave).toHaveBeenCalled();
    expect(room.state.players.length).toBe(0);
  });

  it("正常加入 → 生成角色、昵称取账号名、金币取课程余额", async () => {
    room = await bootRoom(5);
    stubAuth(5, "alice");
    room.courseInfo = async () => 456;
    const c = { sessionId: "a", leave: vi.fn() };
    room.clients.push(c);
    await room.onJoin(c, joinOpts());
    expect(room.state.players.length).toBe(1);
    expect(room.state.players[0].name).toBe("alice");
    expect(room.state.players[0].sessionId).toBe("a");
    expect(room.state.players[0].gold).toBe(456); // 金币来源于课程 coin
  });

  it("同账号重复加入 → 踢掉旧会话，只保留一个角色", async () => {
    room = await bootRoom(5);
    stubAuth(5);
    const c1 = { sessionId: "a", leave: vi.fn() };
    const c2 = { sessionId: "b", leave: vi.fn() };
    room.clients.push(c1, c2);
    await room.onJoin(c1, joinOpts());
    await room.onJoin(c2, joinOpts());
    expect(c1.leave).toHaveBeenCalled();
    expect(c2.leave).not.toHaveBeenCalled();
    expect(room.state.players.length).toBe(1);
    expect(room.state.players[0].sessionId).toBe("b");
  });
});

describe("切换地图 (map)", () => {
  it("接受长 mapId（inst_ + 副本 id）并同步坐标", () => {
    const p = addPlayer(room, { mapId: "world", x: 1, y: 2 });
    const id = "inst_" + "a".repeat(40); // 45 字符
    call("map", S1, { mapId: id, x: 100, y: 200 });
    expect(p.mapId).toBe(id);
    expect(p.x).toBe(100);
    expect(p.y).toBe(200);
  });

  it("超过 64 字符的 mapId 被忽略", () => {
    const p = addPlayer(room, { mapId: "world" });
    call("map", S1, { mapId: "x".repeat(65) });
    expect(p.mapId).toBe("world");
  });

  it("不带坐标时只更新 mapId", () => {
    const p = addPlayer(room, { mapId: "world", x: 5, y: 6 });
    call("map", S1, { mapId: "indoor" });
    expect(p.mapId).toBe("indoor");
    expect(p.x).toBe(5);
    expect(p.y).toBe(6);
  });
});
