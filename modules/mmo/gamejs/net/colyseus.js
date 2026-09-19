// colyseus.js —— Colyseus 多人客户端连接封装
import * as Colyseus from "colyseus.js";

export class NetClient {
  constructor(url = "ws://localhost:2567") {
    this.url = url;
    this.room = null;
    this.handlers = {}; // 当前场景绑定的玩家增删/错误回调（场景重建时可重新绑定）
  }

  get connected() { return !!this.room; }
  get sessionId() { return this.room ? this.room.sessionId : null; }

  // 加入房间；token 为 /api/mmo/join 签发的一次性认证令牌，classId 为班级房间号，
  // courseId 为本次游玩绑定的课程（存档/金币按课程隔离，服务端 onJoin 权威校验成员身份）
  // 玩家增删回调通过 setHandlers 动态绑定（进出室内重建场景后仍能正确增删远程角色）
  // 注: room 在返回后才由调用方赋值(this.room = room), 避免 net.connected 在 .then 之前变 true
  // 导致 update 的 sendMove 在 restoreSavedMap 之前发送出生点坐标覆盖存档
  async join(name, cfg, token, classId = 0, courseId = 0) {
    const client = new Colyseus.Client(this.url);
    const room = await client.joinOrCreate("game", { name, cfg, token, classId, courseId });

    room.state.players.onAdd((p) => { if (this.handlers.onPlayerAdd) this.handlers.onPlayerAdd(p, p.sessionId); });
    room.state.players.onRemove((p) => { if (this.handlers.onPlayerRemove) this.handlers.onPlayerRemove(p, p.sessionId); });
    room.onError((e) => { if (this.handlers.onError) this.handlers.onError(e); });
    // 断线(服务器热重启/网络抖动): 清空 room 并通知场景重连(评审 #9)
    room.onLeave((code) => {
      this.room = null;
      if (this.handlers.onDisconnect) this.handlers.onDisconnect(code);
    });

    return room;
  }

  // 场景创建时重新绑定玩家增删回调（替换旧场景的 handler，避免回调指向已销毁场景）
  setHandlers(h) { this.handlers = h || {}; }

  // 重新进入场景时，补齐房间内现有远程玩家（Colyseus onAdd 只对新增项触发）
  resyncPlayers() {
    if (!this.room || !this.room.state || !this.room.state.players) return;
    const h = this.handlers.onPlayerAdd;
    if (!h) return;
    for (const p of this.room.state.players) h(p, p.sessionId);
  }

  sendMove(x, y, facing, mode) {
    if (this.room) this.room.send("move", { x, y, facing, mode });
  }
  sendAppearance(cfg) {
    if (this.room) this.room.send("appearance", { cfg });
  }
  sendBuy(itemId, qty = 1) { if (this.room) this.room.send("buy", { itemId, qty }); }
  sendSell(itemId, qty = 1) { if (this.room) this.room.send("sell", { itemId, qty }); }
  sendPickup(id) { if (this.room) this.room.send("pickup", id); }
  sendDrop(itemId) { if (this.room) this.room.send("drop", { itemId }); }
  // 切换地图；可选携带目标出生像素坐标，让服务端把 mapId 与坐标一次性更新，
  // 避免"已在新地图但坐标还是旧地图"的中间态导致远端玩家瞬移
  sendMap(mapId, x, y) {
    if (!this.room) return;
    const msg = { mapId };
    if (typeof x === "number" && typeof y === "number") { msg.x = x; msg.y = y; }
    this.room.send("map", msg);
  }
  sendHit(dmg) { if (this.room) this.room.send("hit", { dmg }); }
  sendKill(key, xp) { if (this.room) this.room.send("kill", { key, xp }); }
  sendLoot(itemId, x, y) { if (this.room) this.room.send("loot", { itemId, x, y }); }
  sendTalk(key) { if (this.room) this.room.send("talk", { key }); }
  // 回合制战斗胜利: 仅上报怪物 key 与玩家承受伤害, 经验/掉落由服务端权威结算
  sendBattleWin(key, taken) { if (this.room) this.room.send("battleWin", { key, taken: Number(taken) || 0 }); }
  sendUse(itemId) { if (this.room) this.room.send("use", { itemId }); }
  sendEquip(itemId) { if (this.room) this.room.send("equip", { itemId }); }
  sendUnequip(slot) { if (this.room) this.room.send("unequip", { slot }); }

  leave() {
    if (this.room) this.room.leave();
    this.room = null;
  }
}
