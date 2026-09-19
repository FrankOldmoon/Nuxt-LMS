/**
 * battle.js 回合制战斗纯引擎单元测试
 *
 * battle.js 不依赖 Phaser/DOM（只读 items 配置 + i18n 文案），因此可完全无头覆盖：
 * 攻防口径、回合推进（玩家攻击/怪物反击）、用药、逃跑、胜负判定、日志截断、可用道具筛选。
 */
import { describe, it, expect, vi } from "vitest";
import {
  playerTotalAtk,
  playerTotalDef,
  playerDamageToMonster,
  monsterDamageToPlayer,
  usableBattleItems,
  BattleEngine,
} from "../../gamejs/game/battle.js";

// 基础数值（来自 items.json）：sword atk+10；leather_armor def+5；potion heal50；bread feed30
const noEquip = () => ({});
const withSword = () => ({ weapon: "sword" });
const withArmor = () => ({ armor: "leather_armor" });

const makePlayer = (over: any = {}) => ({
  hp: 100, maxHp: 100, level: 1, equipped: {}, bag: { items: {} }, ...over,
});

const makeEngine = (over: any = {}) =>
  new BattleEngine({
    monsterKey: "bat",
    monsterName: "bat",
    monsterHp: 100,
    monsterAtk: 6,
    player: makePlayer(over.player),
    ...over.engine,
  });

describe("battle - 攻防口径", () => {
  it("基础攻击为 3，装备攻击力叠加", () => {
    expect(playerTotalAtk(noEquip())).toBe(3);
    expect(playerTotalAtk(withSword())).toBe(13); // 3 + sword.atk(10)
    expect(playerTotalAtk({ weapon: "no_such_item" })).toBe(3); // 未知 id 忽略
  });

  it("防御力为装备 def 之和", () => {
    expect(playerTotalDef(noEquip())).toBe(0);
    expect(playerTotalDef(withArmor())).toBe(5); // leather_armor.def
  });

  it("玩家伤害 = 总攻击 + floor(level/2)，下限 1", () => {
    expect(playerDamageToMonster(noEquip(), 1)).toBe(3); // 3 + 0
    expect(playerDamageToMonster(noEquip(), 4)).toBe(5); // 3 + 2
    expect(playerDamageToMonster(withSword(), 1)).toBe(13);
  });

  it("怪物伤害经防御减免，下限 1", () => {
    expect(monsterDamageToPlayer(6, noEquip())).toBe(6);
    expect(monsterDamageToPlayer(6, withArmor())).toBe(1); // 6 - 5
    expect(monsterDamageToPlayer(4, { armor: "chainmail" })).toBe(1); // 4 - 9 → 1
  });
});

describe("battle - 回合推进 / 胜负", () => {
  it("击倒怪物 → win，且不再受反击", () => {
    const e = new BattleEngine({ monsterKey: "bat", monsterHp: 10, monsterAtk: 6, player: makePlayer({ equipped: withSword() }) });
    const s = e.attack();
    expect(s.result).toBe("win");
    expect(s.over).toBe(true);
    expect(s.monster.hp).toBe(0);
    expect(s.taken).toBe(0); // 怪物已死，无反击
  });

  it("未击倒 → 怪物反击，累计 taken", () => {
    const e = makeEngine({ player: { hp: 50 } }); // 怪物 atk 6，玩家无防御
    const s = e.attack();
    expect(s.over).toBe(false);
    expect(s.player.hp).toBe(44); // 50 - 6
    expect(s.taken).toBe(6);
  });

  it("玩家被反击致死 → lose", () => {
    const e = makeEngine({ player: { hp: 5 } });
    const s = e.attack();
    expect(s.result).toBe("lose");
    expect(s.over).toBe(true);
    expect(s.player.hp).toBe(0);
  });

  it("战斗结束后再操作不改变状态", () => {
    const e = new BattleEngine({ monsterKey: "bat", monsterHp: 10, monsterAtk: 6, player: makePlayer({ equipped: withSword() }) });
    e.attack(); // win
    const before = e.snapshot();
    const after = e.attack();
    expect(after.result).toBe(before.result);
    expect(after.player.hp).toBe(before.player.hp);
    expect(after.taken).toBe(before.taken);
    expect(after.log.length).toBe(before.log.length);
  });
});

describe("battle - 使用道具", () => {
  it("用药回血并消耗 1 个，随后怪物反击", () => {
    const e = makeEngine({ player: { hp: 40, bag: { items: { potion: 2 } } } });
    const s = e.useItem("potion");
    expect(s.player.hp).toBe(84); // 40 + 50(heal) - 6(反击)
    expect(s.player.items.potion).toBe(1);
    expect(s.taken).toBe(6);
  });

  it("回血不超过 maxHp", () => {
    const e = makeEngine({ player: { hp: 90, maxHp: 100, bag: { items: { potion: 1 } } } });
    const s = e.useItem("potion");
    expect(s.player.hp).toBe(94); // min(100, 90+50)=100 → 100-6
  });

  it("非消耗品 / 数量为 0 → 提示不可用且不消耗回合", () => {
    const e1 = makeEngine({ player: { bag: { items: { sword: 1 } } } });
    const s1 = e1.useItem("sword");
    expect(s1.taken).toBe(0);
    expect(s1.player.items.sword).toBe(1);

    const e2 = makeEngine({ player: { bag: { items: {} } } });
    const s2 = e2.useItem("potion");
    expect(s2.taken).toBe(0);
  });
});

describe("battle - 逃跑", () => {
  it("随机值 < 0.55 → 逃跑成功", () => {
    const r = vi.spyOn(Math, "random").mockReturnValue(0.1);
    const e = makeEngine();
    const s = e.flee();
    expect(s.result).toBe("flee");
    expect(s.over).toBe(true);
    expect(s.taken).toBe(0);
    r.mockRestore();
  });

  it("随机值 >= 0.55 → 逃跑失败并承受反击", () => {
    const r = vi.spyOn(Math, "random").mockReturnValue(0.9);
    const e = makeEngine({ player: { hp: 50 } });
    const s = e.flee();
    expect(s.result).toBe(null);
    expect(s.over).toBe(false);
    expect(s.player.hp).toBe(44);
    expect(s.taken).toBe(6);
    r.mockRestore();
  });
});

describe("battle - 快照与可用道具", () => {
  it("快照包含怪物/玩家/结果字段，日志最多保留 6 条", () => {
    const e = makeEngine();
    for (let i = 0; i < 10 && !e.over; i++) e.attack();
    const s = e.snapshot();
    expect(Object.keys(s.monster).sort()).toEqual(["atk", "hp", "key", "maxHp", "name"].sort());
    expect(s.log.length).toBeLessThanOrEqual(6);
    expect(typeof s.taken).toBe("number");
  });

  it("usableBattleItems 只保留有 heal/feed 且数量 > 0 的物品", () => {
    const ids = usableBattleItems({ potion: 1, sword: 1, bread: 2, gem: 1, herb: 0 });
    expect(ids).toEqual(["potion", "bread"]);
  });
});
