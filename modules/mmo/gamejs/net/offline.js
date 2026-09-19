// offline.js —— 虚拟账号的本地 NetClient（纯前端模拟，不连 Colyseus）
// 为 MultiScene 等对真实 NetClient 的调用提供同接口实现，状态仅保存在传入的虚拟玩家对象上，
// 使「多人游戏界面」能在本地真实渲染（地图/角色/背包/商店），而不依赖后端与真实多人在线。
import { ITEMS } from "../shared/items.js";
import monstersData from "../config/monsters.json";

const MONSTER_DEFS = monstersData.monsters;
const read = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };
const write = (o) => JSON.stringify(o);

export class OfflineNetClient {
  constructor(player) {
    this.player = player;
    this.room = null;
    this.handlers = {};
    this._selfBound = false;
    this.players = [player];
  }
  get connected() { return !!this.room; }
  get sessionId() { return this.player.sessionId; }

  // 与真实 NetClient.join 对齐：返回一个可被 MapScene 读取的假房间
  async join(name, cfg) {
    this.player.name = name;
    this.player.cfgJSON = write(cfg);
    // 为兼容 MapScene 对 Colyseus room.state 的调用：players 为数组；
    // groundItems 空数组且补 onAdd/onRemove 桩(本地模拟无地面物品增删回调)
    const emptyItems = [];
    emptyItems.onAdd = () => {};
    emptyItems.onRemove = () => {};
    this.room = {
      sessionId: this.player.sessionId,
      send() {},
      leave() {},
      state: { players: this.players, groundItems: emptyItems },
    };
    if (this.handlers.onPlayerAdd) this.handlers.onPlayerAdd(this.player, this.player.sessionId);
    return this.room;
  }
  setHandlers(h) { this.handlers = h || {}; }
  resyncPlayers() {}

  // 改动本地玩家状态后触发场景的背包/属性刷新（MultiScene 通过 onChange 订阅）
  _touch() { if (typeof this.player.onChange === "function") this.player.onChange(); }

  sendMove(x, y, facing, mode) {
    this.player.x = x; this.player.y = y;
    if (typeof facing === "number") this.player.facing = facing;
    if (typeof mode === "string") this.player.mode = mode;
  }
  sendAppearance(cfg) { this.player.cfgJSON = write(cfg); }
  sendMap(m) { this.player.mapId = m; }
  sendPickup() {} // 本地模拟不维护地面物品,拾取为空操作
  sendTalk() {}
  sendHit() {}
  // 本地模拟: 扣血 + 加经验 + 按概率掉落(与服务端口径一致, 仅离线演示用)
  sendBattleWin(key, taken) {
    const def = MONSTER_DEFS.find((d) => d.key === key);
    if (!def) return;
    if (taken) this.player.hp = Math.max(0, (this.player.hp || 100) - taken);
    if (def.xp) this.player.xp = (this.player.xp || 0) + def.xp;
    if (def.drops && def.drops.length && Math.random() < (def.dropChance ?? 0.6)) {
      const itemId = def.drops[(Math.random() * def.drops.length) | 0];
      const inv = read(this.player.inventoryJSON);
      inv[itemId] = (inv[itemId] || 0) + 1;
      this.player.inventoryJSON = write(inv);
    }
    this._touch();
  }
  sendKill() {}
  sendLoot() {}
  pickGround() {}

  // 购买：本地扣金币 + 加物品（模拟服务器结算）
  sendBuy(itemId, qty = 1) {
    const item = ITEMS[itemId];
    if (!item || item.buy == null) return;
    qty = Math.max(1, Math.floor(qty || 1));
    const cost = item.buy * qty;
    if (this.player.gold < cost) return;
    this.player.gold -= cost;
    const inv = read(this.player.inventoryJSON);
    inv[itemId] = (inv[itemId] || 0) + qty;
    this.player.inventoryJSON = write(inv);
    this._touch();
  }
  // 出售：本地加金币 - 减物品
  sendSell(itemId, qty = 1) {
    const item = ITEMS[itemId];
    if (!item || item.sell == null) return;
    const inv = read(this.player.inventoryJSON);
    qty = Math.min(Math.floor(qty || 1), inv[itemId] || 0);
    if (qty <= 0) return;
    inv[itemId] -= qty;
    if (inv[itemId] <= 0) delete inv[itemId];
    this.player.inventoryJSON = write(inv);
    this.player.gold = (this.player.gold || 0) + item.sell * qty;
    this._touch();
  }
  // 丢弃：仅减背包，不加金币
  sendDrop(itemId) {
    const inv = read(this.player.inventoryJSON);
    if ((inv[itemId] || 0) <= 0) return;
    inv[itemId] -= 1;
    if (inv[itemId] <= 0) delete inv[itemId];
    this.player.inventoryJSON = write(inv);
    this._touch();
  }
  // 使用：消耗 1 个，恢复生命（体力/饱食度已移除）
  sendUse(itemId) {
    const item = ITEMS[itemId];
    if (!item) return;
    const inv = read(this.player.inventoryJSON);
    if ((inv[itemId] || 0) <= 0) return;
    inv[itemId] -= 1;
    if (inv[itemId] <= 0) delete inv[itemId];
    this.player.inventoryJSON = write(inv);
    if (item.heal) this.player.hp = Math.min(100, (this.player.hp || 100) + item.heal);
    this._touch();
  }
  // 穿戴：背包扣 1，装备到槽位（同槽旧装备退回背包）
  sendEquip(itemId) {
    const item = ITEMS[itemId];
    if (!item || !item.slot) return;
    const inv = read(this.player.inventoryJSON);
    if ((inv[itemId] || 0) <= 0) return;
    const eq = read(this.player.equippedJSON);
    if (eq[item.slot]) inv[eq[item.slot]] = (inv[eq[item.slot]] || 0) + 1;
    eq[item.slot] = itemId;
    inv[itemId] -= 1;
    if (inv[itemId] <= 0) delete inv[itemId];
    this.player.inventoryJSON = write(inv);
    this.player.equippedJSON = write(eq);
    this._touch();
  }
  // 卸下：装备退回背包
  sendUnequip(slot) {
    const eq = read(this.player.equippedJSON);
    if (!eq[slot]) return;
    const inv = read(this.player.inventoryJSON);
    inv[eq[slot]] = (inv[eq[slot]] || 0) + 1;
    delete eq[slot];
    this.player.inventoryJSON = write(inv);
    this.player.equippedJSON = write(eq);
    this._touch();
  }

  leave() { this.room = null; }
}