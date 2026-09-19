// battle.js —— 回合制战斗纯逻辑(不依赖 Phaser / DOM)
// 设计原则:
//  - 客户端用本引擎做"展示用"模拟(血量变化、日志、胜负判定)，让 UI 实时反馈；
//  - 真正的结算(经验/掉落/对玩家造成的伤害)由服务端在收到 battleWin 时权威计算，
//    客户端只上报"怪物 key"与"玩家累计承受伤害 taken"，杜绝 sendKill/sendLoot 类作弊。
import { ITEMS } from "../shared/items.js";
import { t } from "../i18n.js";

// 玩家装备总攻击 / 总防御(口径必须与服务端 GameRoom.totalDef 完全一致)
export function playerTotalAtk(equipped = {}) {
  let a = 3; // 基础攻击
  for (const slot in equipped) {
    const it = ITEMS[equipped[slot]];
    if (it && it.atk) a += it.atk;
  }
  return a;
}
export function playerTotalDef(equipped = {}) {
  let d = 0;
  for (const slot in equipped) {
    const it = ITEMS[equipped[slot]];
    if (it && it.def) d += it.def;
  }
  return d;
}

// 玩家对怪物伤害(怪物无防御)
export function playerDamageToMonster(equipped, level) {
  return Math.max(1, playerTotalAtk(equipped) + Math.floor((level || 1) / 2));
}
// 怪物对玩家伤害(经玩家防御减免, 与服务端 applyDef 同口径)
export function monsterDamageToPlayer(monsterAtk, equipped) {
  return Math.max(1, (monsterAtk || 0) - playerTotalDef(equipped));
}

const FLEE_CHANCE = 0.55;

// engine 内持有的是"快照副本"，不会改动真实 selfP，避免客户端哈希/服务端的 hp 错位
export class BattleEngine {
  constructor({ monsterKey, monsterName, monsterHp, monsterAtk, player }) {
    this.monsterKey = monsterKey;
    this.monsterName = monsterName || monsterKey;
    this.m = { hp: monsterHp, maxHp: monsterHp, atk: monsterAtk };
    // 浅拷贝玩家战斗相关字段，本地模拟只改副本
    this.player = {
      hp: player.hp,
      maxHp: player.maxHp,
      level: player.level || 1,
      equipped: player.equipped || {},
      bag: { items: { ...(player.bag && player.bag.items || {}) } },
    };
    this.log = [];
    this.over = false;
    this.result = null; // 'win' | 'lose' | 'flee'
    this.taken = 0;     // 玩家累计承受伤害(上报服务端用)
  }

  _push(who, text) { this.log.push({ who, text }); }
  _monsterTurn() {
    const dmg = monsterDamageToPlayer(this.m.atk, this.player.equipped);
    this.player.hp = Math.max(0, this.player.hp - dmg);
    this.taken += dmg;
    this._push("monster", t("battle.monsterAttack", { name: this.monsterName, dmg }));
    if (this.player.hp <= 0) {
      this.over = true;
      this.result = "lose";
      this._push("system", t("battle.defeated"));
    }
  }

  attack() {
    if (this.over) return this.snapshot();
    const dmg = playerDamageToMonster(this.player.equipped, this.player.level);
    this.m.hp = Math.max(0, this.m.hp - dmg);
    this._push("player", t("battle.playerStrike", { name: this.monsterName, dmg }));
    if (this.m.hp <= 0) {
      this.over = true;
      this.result = "win";
      this._push("system", t("battle.defeatedMonster", { name: this.monsterName }));
      return this.snapshot();
    }
    this._monsterTurn();
    return this.snapshot();
  }

  // 使用消耗品回血/回饱食; 消耗玩家一回合 → 怪物反击
  useItem(itemId) {
    if (this.over) return this.snapshot();
    const inv = this.player.bag.items || {};
    const count = inv[itemId] || 0;
    const it = ITEMS[itemId];
    if (count <= 0 || !it || (it.heal === undefined && it.feed === undefined)) {
      this._push("system", t("battle.cannotUse"));
      return this.snapshot();
    }
    const healTxt = [];
    if (it.heal) { this.player.hp = Math.min(this.player.maxHp, this.player.hp + it.heal); healTxt.push(t("battle.restoreHp", { n: it.heal })); }
    if (it.feed) healTxt.push(t("battle.restoreFeed", { n: it.feed }));
    // 本地展示用消耗(真实消耗由服务端 sendUse 处理)
    inv[itemId] = count - 1;
    if (inv[itemId] <= 0) delete inv[itemId];
    this._push("player", t("battle.usedItem", { name: it.name, effects: healTxt.join(t("mmo.listSep")) }));
    this._monsterTurn();
    return this.snapshot();
  }

  flee() {
    if (this.over) return this.snapshot();
    if (Math.random() < FLEE_CHANCE) {
      this.over = true;
      this.result = "flee";
      this._push("system", t("battle.escaped"));
    } else {
      this._push("player", t("battle.fleeFailed"));
      this._monsterTurn();
    }
    return this.snapshot();
  }

  snapshot() {
    return {
      monster: { ...this.m, key: this.monsterKey, name: this.monsterName },
      player: { hp: this.player.hp, maxHp: this.player.maxHp, level: this.player.level, items: { ...this.player.bag.items } },
      log: this.log.slice(-6),
      over: this.over,
      result: this.result,
      taken: this.taken,
    };
  }
}

// 背包中可直接在战斗里使用的消耗品(回血/回饱食)
export function usableBattleItems(items = {}) {
  return Object.keys(items).filter((id) => {
    const it = ITEMS[id];
    return it && (it.heal !== undefined || it.feed !== undefined) && items[id] > 0;
  });
}
