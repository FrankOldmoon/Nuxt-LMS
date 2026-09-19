// MapScene.js —— 统一地图场景(路线A: 一份代码管所有地图)
// 场景 key 即 mapId(world/indoor/indoor2…), 从 config/maps.json 读取配置:
//   - file/tex   : 加载哪张 RPG Maker MV 地图
//   - spawn      : 本图默认出生瓦片(可从跨图 door 的 spawn 覆盖)
//   - features   : 是否显示 NPC / 怪物(仅室外地图开启)
//   - doors      : 跨图出入口, 玩家靠近门按 E 进入目标地图
// 远程玩家/地面物品均以 mapId 过滤, 与服务器持久化的 map_id 字段对应。
import { W, H } from "../constants.js";
import { AnimatedCharacter } from "../animatedCharacter.js";
import { appStore } from "../appStore.js";
import { buildMvCharacter } from "../../rpg/buildMvCharacter.js";
import { DEFAULT_CFG } from "../../config/characterConfig.js";
import { RpgMap } from "../../rpg/rpgMap.js";
import { fetchBitmap, BASE } from "../../lpc/imageLoader.js";
import { NPCS } from "../npc.js";
import { Overlay } from "../overlay.js";
import { sfx } from "../sfx.js";
import { registerMonsterTextures, Monster, MONSTER_DEFS } from "../monster.js";
import { ITEMS, applyEquippedAppearance } from "../../shared/items.js";
import { StatsHud } from "../statsHud.js";
import { NetClient } from "../../net/colyseus.js";
import { renderTaskPanel, detectTaskCompletions } from "../tasks.js";
import { currentTask } from "../../shared/tasks.js";
import { mapCfg, MAPS } from "../../shared/maps.js";
import { instanceStore } from "../../shared/instanceStore.js";
import { BattleEngine } from "../battle.js";
import { BattleUI } from "../battleUI.js";
import { t, isZh } from "../../i18n.js";
import { DEV, coordText } from "../debugOverlay.js";

const MOVE_INTERVAL = 50;
const MOVE_SPEED = 260;
const SLASH_DMG = 30;
const XP_PER_LV = 100;
const MONSTER_RESPAWN_MS = 20000;
const COLLIDE_R = 14;
const MONSTER_TILES = [[2, 3], [36, 4], [33, 8], [30, 30], [14, 12], [2, 20], [35, 20], [14, 35]];

// 玩家名字
function playerName() {
  const st = appStore.playerState;
  if (st && st.name && String(st.name).trim()) return String(st.name).trim().slice(0, 12);
  const saved = (() => { try { return localStorage.getItem("mmo_player_name"); } catch { return null; } })();
  if (saved && saved.trim()) return saved.trim().slice(0, 12);
  const pool = t("mmo.names").split("|");
  return pool[Math.floor(Math.random() * pool.length)];
}
const NAME = playerName();

// 归一化 MV 外观配置
function mvCfg(cfg = {}) {
  // 以默认外观为基底逐键合并玩家配置: 玩家 layers 缺五官时自动补默认编号
  // (浅合并 {...DEFAULT_CFG, ...cfg} 会让 cfg.layers 整体覆盖默认 layers, 导致眼睛/鼻子等丢失)
  const layers = { ...(DEFAULT_CFG.layers || {}), ...(cfg.layers || {}) };
  if (!layers.Body) layers.Body = 1;
  return { gender: cfg.gender || "Male", layers, colors: { ...(cfg.colors || {}) }, skin: cfg.skin || null };
}

export default class MapScene extends Phaser.Scene {
  constructor(config = {}) {
    super({ key: (config && config.key) || "world", active: (config && config.active) || false });
  }

  // 本机角色纹理前缀: 用 mapId 区分, 避免跨地图场景复用同一纹理键时冲突
  localNs() { return "map_" + this.scene.key.replace(/[^a-zA-Z0-9]/g, "_"); }

  async create() {
    const mcfg = instanceStore.getMap(this.scene.key) || mapCfg(this.scene.key) || mapCfg("world");
    this.mcfg = mcfg;
    this.cameras.main.setBackgroundColor("#10141c");
    this.net = appStore.sharedNet || (appStore.sharedNet = new NetClient(appStore.netURL));
    appStore.activeScene = this;
    appStore.groundTarget = this;
    appStore.bagTarget = this;
    this.remoteChars = new Map();
    this._changeBound = new Set(); // 每场景实例记录已绑定 onChange 的远端玩家, 防跨图重复绑定

    this.events.on("shutdown", () => {
      if (appStore.groundTarget === this) appStore.groundTarget = null;
      if (appStore.bagTarget === this) appStore.bagTarget = null;
      if (appStore.activeScene === this) appStore.activeScene = null;
      // 标记已销毁: onChange 可能在场景切换间隙触发, 防止 setText 崩溃
      this._dead = true;
      if (this.statsHud) this.statsHud.destroy();
      this.statsHud = null;
    });

    // 渲染地图(配置驱动)
    const mkMap = async (file, tex) => {
      const m = new RpgMap(this, file, { texKey: tex });
      await m.load();
      return m;
    };
    try {
      this.rpgMap = await mkMap(mcfg.file, mcfg.tex)
        .catch((e) => { console.error("[MapScene] map load fail, fallback world", e); return mkMap(MAPS.world.file, mcfg.tex); }); // 失败回退世界地图,避免黑屏
    } catch (e) {
      console.error("[map load]", e);
      this._status = this.add.text(14, 14, t("game.mapLoadFailed"), { color: "#f88" }).setScrollFactor(0, 0).setDepth(20);
      return;
    }
    this._worldW = this.rpgMap.width;
    this._worldH = this.rpgMap.height;
    this.cameras.main.setBounds(0, 0, this._worldW, this._worldH);

    // 出生点: 优先跨图 door 下发的瓦片 → 存档恢复的像素坐标 → 本图配置 → 地图中心
    const clampTile = (t, max) => Math.max(0, Math.min(max - 1, t));
    const centerTile = () => ({
      x: clampTile(Math.floor(this._worldW / 48 / 2), this.rpgMap.MAP_W),
      y: clampTile(Math.floor(this._worldH / 48 / 2), this.rpgMap.MAP_H),
    });
    const nav = appStore.nav;
    // 标记是否经 door 进入(走门): 走门时 door spawn 已正确, restoreSavedMap 不应再覆盖
    this._fromNav = !!(nav && nav.to === this.scene.key);
    if (nav && nav.to === this.scene.key) {
      appStore.nav = null;
      if (nav.pos && Number.isFinite(nav.pos.x) && Number.isFinite(nav.pos.y)) {
        // 刷新恢复: 用存档的精确像素坐标(夹在地图内并就近找可行走点)
        const px = Phaser.Math.Clamp(nav.pos.x, 0, this._worldW);
        const py = Phaser.Math.Clamp(nav.pos.y, 0, this._worldH);
        this.spawn = this.rpgMap.findWalkable(Math.floor(px / 48), Math.floor(py / 48));
      } else if (nav.tile) {
        this.spawn = this.rpgMap.findWalkable(clampTile(nav.tile[0], this.rpgMap.MAP_W), clampTile(nav.tile[1], this.rpgMap.MAP_H));
      }
    }
    // 刷新恢复: 若存档 mapId 匹配当前场景, 用存档坐标设置 spawn(避免先出生点再跳转)
    if (!this.spawn && appStore.playerState) {
      const ps = appStore.playerState;
      if (ps.mapId === this.scene.key && typeof ps.x === "number" && typeof ps.y === "number") {
        const px = Phaser.Math.Clamp(ps.x, 0, this._worldW);
        const py = Phaser.Math.Clamp(ps.y, 0, this._worldH);
        this.spawn = this.rpgMap.findWalkable(Math.floor(px / 48), Math.floor(py / 48));
      }
    }
    if (!this.spawn) {
      const spawnTile = mcfg.spawn;
      if (spawnTile) this.spawn = this.rpgMap.findWalkable(clampTile(spawnTile[0], this.rpgMap.MAP_W), clampTile(spawnTile[1], this.rpgMap.MAP_H));
      else {
        const c = centerTile();
        this.spawn = this.rpgMap.findWalkable(c.x, c.y);
      }
    }

    // 统一出入口: 遍历 doors 找可通行位置。每个门可含单个 tile 或多个 tile(数组), 任一贴近即触发
    this.doors = [];
    if (Array.isArray(mcfg.doors)) {
      for (const d of mcfg.doors) {
        const tiles = d.tiles && d.tiles.length ? d.tiles : [d.tile];
        for (const tile of tiles) {
          if (!tile) continue;
          const p = this.rpgMap.findWalkable(clampTile(tile[0], this.rpgMap.MAP_W), clampTile(tile[1], this.rpgMap.MAP_H));
          this.doors.push({ to: d.to, spawn: d.spawn || null, pos: p });
        }
      }
    }
    this.nearDoor = false;

    // UI
    this.doorTip = this.add.text(0, 0, "", { fontFamily: '"PingFang SC"', fontSize: "15px", color: "#7fd4ff", fontStyle: "bold", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(69).setVisible(false);
    this.groundTip = this.add.text(0, 0, "", { fontFamily: '"PingFang SC"', fontSize: "15px", color: "#b7f5a1", fontStyle: "bold", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(69).setVisible(false);

    // 背包/金币/任务
    this.bag = { gold: 0, items: {} };
    this.equipped = {};
    // 优先用 Colyseus 实时玩家(selfP, 跨图切换保持), 否则用 /api/mmo/state 预载的存档,
    // 避免进入游戏时先用默认外观/0 金币渲染, 再突然刷新成数据库数据(外观闪烁)
    const savedState = (appStore.selfP && typeof appStore.selfP.gold === "number") ? appStore.selfP : appStore.playerState;
    if (savedState) {
      this.bag.gold = savedState.gold || 0;
      try { this.bag.items = JSON.parse(savedState.inventoryJSON || "{}"); } catch { this.bag.items = savedState.inventory || {}; }
      try { this.equipped = JSON.parse(savedState.equippedJSON || "{}"); } catch { this.equipped = savedState.equipped || {}; }
      this._eqStr = JSON.stringify(this.equipped);
      this._prevGold = this.bag.gold;
      this._invStr = JSON.stringify(this.bag.items);
    }
    this.backpackOpen = false;
    this.shopOpen = false;
    this.selfP = null;
    this.groundSprites = new Map();
    this.nearGround = null;

    this.cfg = mvCfg({ ...DEFAULT_CFG, ...((appStore.playerState && appStore.playerState.cfg) || {}) });

    this.statsHud = new StatsHud(this, W - 14);
    // 头像需叠加"已穿戴装备"中可见的面部部件(耳朵/面纹/胡子等),与行走图保持同一份外观
    this.statsHud.setFaceAsync(this.cfg.gender, applyEquippedAppearance(this.cfg, this.equipped).layers);
    this.dead = false;
    this.deadText = this.add.text(W / 2, H / 2, t("stat.dead"), { fontFamily: '"PingFang SC"', fontSize: "30px", color: "#ff6b6b", fontStyle: "bold", stroke: "#000000", strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0, 0).setDepth(80).setVisible(false);

    Overlay.init();
    Overlay.bp.close.onclick = () => this.toggleBackpack(false);
    Overlay.sh.close.onclick = () => this.toggleShop(false);

    // 输入
    this.cursors = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT");
    this.keys = this.input.keyboard.addKeys({ run: "SHIFT" });
    this.input.keyboard.addKey("E").on("down", () => this.onActionKey());
    this.input.keyboard.addKey("ENTER").on("down", () => this.onActionKey());
    this.input.keyboard.addKey("SPACE").on("down", () => this.onActionKey());
    this.input.keyboard.addKey("ESC").on("down", () => this.closeOverlays());
    this.input.keyboard.addKey("B").on("down", () => this.toggleBackpack());
    this.input.keyboard.addKey("F").on("down", () => this.pickupGround());
    this.input.keyboard.addKey("T").on("down", () => this.toggleTasks());

    // NPC / 怪物(根据 features 开启, 仅室外地图)
    this.npcs = [];
    this.nearNpc = null;
    this.monsters = [];
    this.inBattle = false;       // 回合制战斗进行中(暂停移动)
    if (mcfg.features && mcfg.features.npc) this.spawnNPCs();
    if (mcfg.features && mcfg.features.monsters) this.spawnMonsters();

    this._status = this.add.text(14, 14, t("mmo.connecting"), { fontFamily: '"PingFang SC"', fontSize: "15px", color: "#fff", stroke: "#000", strokeThickness: 3 }).setScrollFactor(0, 0).setDepth(20);
    this.taskHud = this.add.text(14, 54, "", { fontFamily: '"PingFang SC"', fontSize: "14px", color: "#ffd66b", fontStyle: "bold", stroke: "#000000", strokeThickness: 3 }).setScrollFactor(0, 0).setDepth(24).setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleTasks());
    this.posHud = DEV ? this.add.text(14, this.scale.height - 22, "", { fontFamily: "monospace", fontSize: "13px", color: "#b9e8ff", stroke: "#000000", strokeThickness: 2 }).setOrigin(0, 1).setScrollFactor(0, 0).setDepth(201).setVisible(false) : null;

    this.setupDialogUI();
    this.bindNetHandlers();

    // 已连接(跨图返回)则接回, 否则首次加入(仅世界地图发起真实 join)
    this._selfReady = false;
    this._switching = false;
    if (this.net.connected) {
      this.net.resyncPlayers();
      this.sendMapSafe();
      this.setupSelfState();
      if (this._switching) return; // 正在切到存档地图: 交给目标场景就绪后再显示
      await this.loadItemTextures();
      this.setupGroundItems();
      await this.respawnLocalCharacter();
      this.pushSelfPos();
      this.markSelfReady();
    } else {
      await this.createLocalCharacter();
      await this.joinServer();
      if (this._switching) return;
      this.pushSelfPos();
      this.markSelfReady();
    }
    this.updateRoomCount();
    this._sendAcc = 0;
  }

  // 本机角色已就位: 允许 update 循环发 move, 并通知页面可以显示画面
  markSelfReady() {
    if (this._selfReady) return;
    this._selfReady = true;
    try { if (appStore.onSelfReady) appStore.onSelfReady(this); } catch { /* ignore */ }
  }

  // 立即把本机坐标同步给服务器(切图后 mapId 已变但坐标仍为旧地图 → 需补发)
  pushSelfPos() {
    if (!this.net.connected || !this.localChar) return;
    try { this.net.sendMove(this.localChar.sprite.x, this.localChar.sprite.y, this.localChar.state.facing || 2, "idle"); } catch { /* ignore */ }
  }

  localCharName() {
    return NAME;
  }

  async createLocalCharacter() {
    this.cfg = mvCfg({ ...DEFAULT_CFG, ...((appStore.playerState && appStore.playerState.cfg) || {}) });
    if (this.localChar) this.localChar.destroy();
    const result = await buildMvCharacter(applyEquippedAppearance(this.cfg, this.equipped));
    this.localChar = new AnimatedCharacter(this, this.spawn.x, this.spawn.y, this.localNs(), { name: this.localCharName(), nameColor: "#3ddc3d", enableHurtFx: true, scale: 1 });
    this.localChar.build(result.sheets, result.layout);
    this.localChar.ready = true;
    this.localChar.setState("idle", 2);
    this.cameras.main.centerOn(this.spawn.x, this.spawn.y - 60);
  }

  async respawnLocalCharacter() {
    await this.createLocalCharacter(); // 复用同一构建逻辑
  }

  sendMapSafe() { this.net.sendMap(this.scene.key); }

  bindNetHandlers() {
    this.net.setHandlers({
      onPlayerAdd: (p, key) => this.onRemoteAdd(p, key),
      onPlayerRemove: (p, key) => this.onRemoteRemove(key),
      onError: (e) => { console.error("[map onError]", e && e.message); this._status && this._status.setText(t("mmo.joinFailed") + (e.message || e)); },
      onDisconnect: (code) => this.onDisconnected(code),
    });
  }

  // 断线重连(评审 #9): 重新申请一次性 token, 重启当前场景干净地重建连接与本地状态,
  // 避免就地修补导致远端角色/地面物品重复。限制重试次数, 防止服务器持续不可用时死循环。
  onDisconnected(code) {
    if (this._dcHandled) return; // 同一次断连只触发一次
    this._dcHandled = true;
    this._reconnectTries = (this._reconnectTries || 0) + 1;
    if (this._reconnectTries > 6) {
      this._status && this._status.setText(t("game.unstable"));
      this._dcHandled = false;
      return;
    }
    this._status && this._status.setText(t("game.disconnected", { n: this._reconnectTries }));
    this.time.delayedCall(800 * Math.min(this._reconnectTries, 4), async () => {
      try {
        const gj = appStore.gameClient ? await appStore.gameClient.joinGame() : null;
        if (!gj || !gj.token) throw new Error("no token");
        appStore.gameToken = gj.token;
        appStore.classId = gj.classId || appStore.classId;
        appStore.courseId = gj.courseId || appStore.courseId;
        this._dcHandled = false; // restart 后会重新走 create → joinServer, 允许后续断连再触发
        if (this.scene && this.scene.isActive()) this.scene.restart();
      } catch (e) {
        console.error("[mmo reconnect]", e);
        this._dcHandled = false;
        this._status && this._status.setText(t("game.reconnectFailed"));
      }
    });
  }

  updateRoomCount() {
    const n = this.net && this.net.room ? this.net.room.state.players.length : 1;
    if (this._status) this._status.setText(t("mmo.connected", { n }));
  }

  // ---- 外观 ----
  async refreshAppearance() {
    const c = this.localChar;
    if (!c || !c.ready) return;
    const x = c.sprite.x, y = c.sprite.y;
    const { mode, facing } = c.state;
    try {
      const merged = applyEquippedAppearance(this.cfg, this.equipped);
      const result = await buildMvCharacter(merged);
      if (this.localChar !== c) return;
      c.destroy();
      this.localChar = new AnimatedCharacter(this, x, y, this.localNs(), { name: this.localCharName(), nameColor: "#3ddc3d", enableHurtFx: true, scale: 1 });
      this.localChar.build(result.sheets, result.layout);
      this.localChar.ready = true;
      this.localChar.setState(mode, facing);
      // 头像同步刷新(与行走图共用同一份合并后的外观), 否则换装后头像停留在旧外观
      if (this.statsHud) this.statsHud.setFaceAsync(merged.gender, merged.layers);
    } catch (e) { console.warn("[appearance] 重建失败:", e); }
  }

  joinServer() {
    // 首次进入: 创建角色 → join → 同步。身体在内置 get 已处理。
    return this.net.join(this.localCharName(), this.cfg, appStore.gameToken, appStore.classId, appStore.courseId)
      .then((room) => {
        this._reconnectTries = 0; // 成功连上即清零重试计数(评审 #9)
        this.net.room = room; // 赋值 room, net.connected 变 true (在 setupSelfState 之前)
        this.net.sendMap(this.scene.key);
        this._status.setText(t("mmo.connected", { n: room.state.players.length }));
        this.net.sendAppearance(this.cfg);
        this.setupSelfState();
        return this.loadItemTextures().then(() => this.setupGroundItems());
      })
      .catch((e) => { console.error("[mmo join]", e); this._status.setText(t("mmo.noServer") + (e.message || e)); });
  }

  // ---- 本机玩家状态 ----
  setupSelfState() {
    const attach = (p) => {
      this.selfP = p;
      appStore.selfP = p;
      this.syncBag();
      this.syncStats();
      this.wireSelf();
      // 直接用 Colyseus 权威 selfP 恢复存档: 坐标/mapId 已由服务器从 DB 载入,
      // restoreSavedMap 自身优先使用预加载的 appStore.playerState(进入前 GET /api/mmo/state 所得),
      // 无需再发一次 fetch 与服务器权威坐标竞争(评审 #4)
      this.restoreSavedMap(p);
    };
    const tryFind = () => {
      const players = this.net.room && this.net.room.state.players;
      if (!players) return null;
      return players.find((p) => p.sessionId && p.sessionId === this.net.sessionId) || null;
    };
    // 优先从 room.state 获取最新 player(避免 HMR/旧 selfP 拋留导致坐标错误)
    const selfP = tryFind();
    if (selfP) { attach(selfP); return; }
    // 仅当旧 selfP 的 sessionId 与当前连接匹配时才复用(跨图切换场景)
    if (appStore.selfP && appStore.selfP.onChange && appStore.selfP.sessionId === this.net.sessionId) {
      this.wireSelf(); attach(appStore.selfP); return;
    }
    this.time.delayedCall(150, () => {
      const again = tryFind();
      const p = again || (this.net.room.state.players && this.net.room.state.players[this.net.room.state.players.length - 1]);
      if (p) attach(p);
      else console.warn("[self] 未能定位本机玩家");
    });
  }
  // 刷新/重进页面后恢复存档所在的地图
  // 场景列表首个 world 会先启动, join 后从服务器读到存档 mapId,
  // 若不在当前场景则切换到目标地图(目标地图按自身配置 spawn 出生)
  // 走门进入时(_fromNav=true)跳过: door spawn 已正确, 不应再用旧坐标覆盖
  restoreSavedMap(p) {
    const target = p && typeof p.mapId === "string" ? p.mapId : "";
    if (!target) return;
    // 未知地图(可能尚未加载的副本)落回主世界, 避免黑屏
    if (!MAPS[target] && !instanceStore.getMap(target)) { console.warn("[map] 存档 mapId 未知, 落回世界:", target); return; }
    // 走门进入: goDoor 已发送 sendMap(含坐标), 不再干预
    if (this._fromNav) return;
    // 优先用预加载的存档坐标(appStore.playerState), 不受 Colyseus 同步延迟/sendMove 覆盖影响
    const ps = appStore.playerState;
    const pos = (ps && typeof ps.x === "number" && typeof ps.y === "number")
      ? { x: ps.x, y: ps.y }
      : { x: p.x, y: p.y };
    this.net.sendMap(target, pos.x, pos.y); // 同步服务器(mapId + 坐标一次性更新)
    if (target !== this.scene.key) {
      // 场景首选项不匹配: 记录后切换过去; 标记 _switching, 由目标场景就绪后再放行画面
      appStore.nav = { to: target, pos };
      this._switching = true;
      this.time.delayedCall(0, () => {
        if (this.scene && this.scene.isActive(this.scene.key)) this.scene.start(target);
      });
      return;
    }
    // 已是存档地图(active 直进): 直接把本机角色移动到存档坐标
    if (this.rpgMap && this.localChar) {
      const px = Phaser.Math.Clamp(pos.x, 0, this._worldW);
      const py = Phaser.Math.Clamp(pos.y, 0, this._worldH);
      const sp = this.rpgMap.findWalkable(Math.floor(px / 48), Math.floor(py / 48));
      this.localChar.sprite.x = sp.x;
      this.localChar.sprite.y = sp.y;
      this.cameras.main.centerOn(sp.x, sp.y - 60);
      // 发送正确的存档坐标给服务器, 覆盖之前可能的错误 sendMove
      if (this.net.connected) this.net.sendMove(sp.x, sp.y, 2, "idle");
    }
  }

  wireSelf() {
    if (!this.selfP || this.net._selfBound) return;
    this.net._selfBound = true;
    this.selfP.onChange(() => {
      const tgt = appStore.bagTarget;
      // 跳过已销毁/未就绪场景, 防止旧场景残留的 Text 触发 setText 崩溃
      if (!tgt || tgt._dead || !tgt.statsHud) return;
      if (tgt.syncBag) tgt.syncBag();
      if (tgt.syncStats) tgt.syncStats();
    });
  }

  syncBag() {
    if (!this.selfP) return;
    const gold = this.selfP.gold;
    let items;
    try { items = JSON.parse(this.selfP.inventoryJSON || "{}"); } catch { items = {}; }
    const invStr = JSON.stringify(items);
    const eqStr = this.selfP.equippedJSON || "{}";
    if (eqStr !== this._eqStr) {
      this._eqStr = eqStr;
      try { this.equipped = JSON.parse(eqStr); } catch { this.equipped = {}; }
      if (this.backpackOpen) Overlay.renderBackpack(this);
      this.refreshAppearance();
    }
    if (gold === this._prevGold && invStr === this._invStr) {
      if (this.statsHud) this.statsHud.setCoin(gold);
      return;
    }
    this._prevGold = gold;
    this._invStr = invStr;
    this.bag.gold = gold;
    this.bag.items = items;
    this.animateGold(this._prevGold2, gold);
    this._prevGold2 = gold;
    if (this.backpackOpen) Overlay.renderBackpack(this);
    if (this.shopOpen && this.refreshShop) this.refreshShop();
  }

  onBuy(itemId) { sfx.buy(); this.net.sendBuy(itemId); }
  onSell(itemId) { sfx.sell(); this.net.sendSell(itemId); }
  onDrop(itemId) { sfx.drop(); this.net.sendDrop(itemId); }
  onUse(itemId) { sfx.eat(); this.net.sendUse(itemId); }
  onEquip(itemId) { sfx.equip(); this.net.sendEquip(itemId); }
  onUnequip(slot) { sfx.equip(); this.net.sendUnequip(slot); }
  refreshShop() { Overlay.renderShop(this); }

  animateGold(from, to) {
    if (!this.statsHud || this._dead) return;
    from = from === undefined ? 0 : from;
    to = to === undefined ? from : to;
    const t0 = this.time.now, dur = 380;
    const step = () => {
      if (this._dead || !this.statsHud) return;
      const p = Math.min(1, (this.time.now - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (to - from) * ease);
      this.statsHud.setCoin(v);
      if (this.backpackOpen) Overlay.setGold(v);
      if (p < 1) this.time.delayedCall(16, step);
    };
    step();
  }

  syncStats() {
    const p = this.selfP;
    if (!p || typeof p.hp !== "number" || !this.statsHud || this._dead) return;
    const level = p.level || 1;
    if (this._prevLevel && level > this._prevLevel) {
      sfx.levelUp();
      if (this.localChar) this.floatText(this.localChar.sprite.x, this.localChar.sprite.y - 110, t("stat.levelUp", { n: level }), "#c9a7ff");
    }
    this._prevLevel = level;
    this.statsHud.setStats({
      hp: p.hp, maxHp: p.maxHp,
      xp: p.xp, xpNeed: level * XP_PER_LV, level,
    });
    const tasksStr = p.tasksJSON || "{}";
    if (tasksStr !== this._tasksStr) {
      const done = this._tasksInit ? detectTaskCompletions(tasksStr, this._tasksStr) : [];
      this._tasksStr = tasksStr;
      this._tasksInit = true;
      for (const task of done) {
        sfx.levelUp();
        if (this.localChar) this.floatText(this.localChar.sprite.x, this.localChar.sprite.y - 130, t("task.complete", { name: task.name }), "#7fd4ff");
        this.showTaskBanner(task);
      }
      // 任务面板打开时实时刷新
      const tasksEl = document.getElementById("tasks");
      if (tasksEl && !tasksEl.hidden) renderTaskPanel();
    }
    this.updateTaskHud();
    if (p.hp <= 0 && !this.dead) {
      this.dead = true;
      this.deadText.setVisible(true);
      this.closeOverlays();
    } else if (p.hp > 0 && this.dead) {
      this.dead = false;
      this.deadText.setVisible(false);
      this.cameras.main.flash(200, 120, 255, 160);
      if (this.localChar) this.floatText(this.localChar.sprite.x, this.localChar.sprite.y - 110, t("stat.revived"), "#8dff9a");
    }
  }

  floatText(x, y, str, color = "#ffe08a") {
    const tx = this.add.text(x, y, str, { fontFamily: '"PingFang SC"', fontSize: "15px", color, fontStyle: "bold", stroke: "#000000", strokeThickness: 4 }).setOrigin(0.5).setDepth(75);
    this.tweens.add({ targets: tx, y: y - 44, alpha: 0.1, duration: 1100, ease: "Cubic.Out", onComplete: () => tx.destroy() });
  }

  // 全局任务完成提示: 顶部居中 banner 显示任务名 + 奖励, 约 3 秒后自动消失
  showTaskBanner(task) {
    const el = document.getElementById("taskBanner");
    if (!el) return;
    const nameEl = document.getElementById("taskBannerName");
    const rewardEl = document.getElementById("taskBannerReward");
    if (nameEl) nameEl.textContent = task.name;
    if (rewardEl) {
      const parts = [];
      if (task.reward && task.reward.gold) parts.push(`💰 ${task.reward.gold}`);
      if (task.reward && task.reward.xp) parts.push(`✦ ${task.reward.xp} XP`);
      rewardEl.textContent = parts.length ? t("game.reward") + parts.join("  ") : "";
    }
    // 重新触发入场动画
    el.hidden = false;
    el.style.animation = "none";
    void el.offsetHeight; // 强制 reflow
    el.style.animation = "";
    if (this._taskBannerT) clearTimeout(this._taskBannerT);
    this._taskBannerT = setTimeout(() => { el.hidden = true; }, 3200);
  }

  updateTaskHud() {
    if (!this.taskHud) return;
    const p = this.selfP;
    const cur = p ? currentTask(p.tasksJSON) : null;
    if (!cur) { this.taskHud.setVisible(false); return; }
    try { this.taskHud.setText(`📋 ${cur.task.name}  ${cur.progress}/${cur.task.count}`).setVisible(true); } catch { }
  }

  // ---- 地面物品(按 mapId 过滤) ----
  async loadItemTextures() {
    this.itemTex = this.itemTex || {};
    await Promise.all(Object.keys(ITEMS).map(async (id) => {
      if ((ITEMS[id] && ITEMS[id].mv) || this.itemTex[id]) return;
      if (this.textures.exists("it_" + id)) { this.itemTex[id] = "it_" + id; return; }
      try {
        const cv = await fetchBitmap(BASE + "items/" + id + ".png");
        if (cv) {
          this.itemTex[id] = "it_" + id;
          this.textures.addCanvas("it_" + id, cv);
          if (this.textures.get("it_" + id)) this.textures.get("it_" + id).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      } catch { /* 丢弃 */ }
    }));
  }
  setupGroundItems() {
    const arr = this.net.room.state.groundItems;
    if (!this.net._groundWired) {
      this.net._groundWired = true;
      arr.onAdd((it) => { const t = appStore.groundTarget; if (t) t.spawnGroundItem(it); });
      arr.onRemove((it) => { const t = appStore.groundTarget; if (t) t.removeGroundItem(it.id); });
    }
    for (const g of arr) this.spawnGroundItem(g);
  }
  spawnGroundItem(it) {
    if ((it.mapId || "world") !== this.scene.key) return;
    if (this.groundSprites.has(it.id)) return;
    const key = this.itemTex && this.itemTex[it.itemId];
    const shadow = this.add.ellipse(0, 15, 30, 9, 0x000000, 0.35);
    let body;
    if (key) {
      body = this.add.image(0, 0, key).setOrigin(0.5).setDisplaySize(46, 46);
    } else {
      const emoji = (ITEMS[it.itemId] || {}).emoji || "❓";
      body = this.add.text(0, 0, emoji, { fontFamily: "system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif", fontSize: "34px", stroke: "#1b2a14", strokeThickness: 5 }).setOrigin(0.5).setShadow(1, 3, "#000000", 3, true, true);
    }
    body.setDepth(3);
    const g = this.add.container(it.x, it.y, [shadow, body]).setDepth(2);
    g._baseX = it.x; g._baseY = it.y; g._ph = Math.random() * Math.PI * 2;
    this.groundSprites.set(it.id, { g, itemId: it.itemId, id: it.id });
    this.tweens.add({ targets: g, scale: { from: 0.5, to: 1 }, duration: 350, ease: "Back.Out" });
  }
  removeGroundItem(id) {
    const e = this.groundSprites.get(id);
    if (e) { e.g.destroy(); this.groundSprites.delete(id); }
    if (this.nearGround && this.nearGround.id === id) this.nearGround = null;
  }
  pickupGround() {
    if (!this.nearGround || !this.net.connected || this.dead) return;
    const id = this.nearGround.id;
    sfx.pickup();
    this.net.sendPickup(id);
    this.nearGround = null;
    this.groundTip.setVisible(false);
  }

  // ---- 怪物(仅室外 / 副本地图) ----
  async spawnMonsters() {
    await registerMonsterTextures(this);
    // 优先使用地图配置里的怪物落点(教师编排副本的 monsters 数组), 否则用默认 8 点布局
    const places = (this.mcfg && Array.isArray(this.mcfg.monsters)) ? this.mcfg.monsters : null;
    const types = ["bat", "bee", "big_worm", "eyeball", "ghost", "man_eater_flower", "pumpking", "snake"];
    const n = places ? places.length : MONSTER_TILES.length;
    for (let i = 0; i < n; i++) {
      let key, tx, ty;
      if (places) { key = places[i].key; [tx, ty] = places[i].tile; }
      else { key = types[i % types.length]; [tx, ty] = MONSTER_TILES[i]; }
      if (!this.textures.exists("mon_" + key)) continue;
      const def = MONSTER_DEFS.find((d) => d.key === key);
      const spot = this.rpgMap.findWalkable(tx, ty);
      this.spawnMonster(key, spot.x, spot.y, def);
    }
  }
  spawnMonster(key, x, y, def) {
    const m = new Monster(this, x, y, key, { scale: 1, hp: def ? def.hp : 60 });
    this.monsters.push({ m, def, key, homeX: x, homeY: y, ai: { t: Phaser.Math.Between(600, 1600), dx: 0, dy: 1, atkCd: 0 } });
  }
  updateMonsters(delta, dt) {
    for (const mn of this.monsters) {
      if (!mn || !mn.m || !mn.m.spr || !this.textures.exists(mn.m.texKey)) continue;
      if (mn.m.dead) continue;
      const ai = mn.ai, M = 24;
      ai.t = (ai.t || 0) - delta;
      if (ai.t <= 0) {
        if (ai.mode !== "stay") { ai.mode = "stay"; ai.dx = 0; ai.dy = 0; ai.t = Phaser.Math.Between(2000, 4000); }
        else {
          ai.mode = "move";
          const d = [[0, -1], [-1, 0], [0, 1], [1, 0]][(Math.random() * 4) | 0];
          ai.dx = d[0]; ai.dy = d[1];
          ai.t = Phaser.Math.Between(1200, 3200);
        }
      }
      let nx = mn.m.x, ny = mn.m.y;
      if (ai.mode === "move") {
        nx += ai.dx * M * dt; ny += ai.dy * M * dt;
        if (ai.dx) nx = ai.dx > 0 ? Math.min(nx, mn.homeX + 150) : Math.max(nx, mn.homeX - 150);
        if (ai.dy) ny = ai.dy > 0 ? Math.min(ny, mn.homeY + 150) : Math.max(ny, mn.homeY - 150);
        const mv = this.rpgMap.moveWithCollision(mn.m.x, mn.m.y, nx - mn.m.x, ny - mn.m.y, 12);
        nx = mv.x; ny = mv.y;
      }
      const c = this.localChar;
      let face = 2;
      if (ai.mode === "move") face = ai.dx === 0 ? (ai.dy > 0 ? 2 : 0) : (ai.dx > 0 ? 3 : 1);
      else if (c) face = Math.abs(c.sprite.x - nx) >= Math.abs(c.sprite.y - ny) ? (c.sprite.x > nx ? 3 : 1) : (c.sprite.y > ny ? 2 : 0);
      mn.m.setFacing(face);
      try { mn.m.update(delta, nx, ny, ai.mode === "move"); } catch { /* 过渡帧 */ }
    }
  }
  onMonsterHitPlayer(mn) {
    const dmg = (mn.def && mn.def.atk) || 6;
    if (this.net.connected) this.net.sendHit(dmg);
    sfx.hurtPlayer();
    this.cameras.main.flash(140, 255, 40, 40);
    this.cameras.main.shake(120, 0.004);
    if (this.localChar) {
      this.localChar.doAction("hurt");
      this.floatText(this.localChar.sprite.x, this.localChar.sprite.y - 104, "-" + dmg, "#ff7a7a");
    }
  }
  removeMonster(i) {
    const mn = this.monsters[i];
    if (!mn) return;
    const { key, def, homeX, homeY } = mn;
    const x = mn.m.x, y = mn.m.y;
    mn.m.destroy();
    this.monsters.splice(i, 1);
    sfx.monsterDie();
    if (def) {
      if (this.net.connected) this.net.sendKill(key, def.xp || 0);
      if (def.xp) this.floatText(x, y - 40, "+" + def.xp + " XP", "#c9a7ff");
      if (def.drops && def.drops.length && Math.random() < (def.dropChance ?? 0.6)) {
        const itemId = def.drops[(Math.random() * def.drops.length) | 0];
        if (this.net.connected) this.net.sendLoot(itemId, x, y - 6);
        this.floatText(x, y - 64, ITEMS[itemId].name, "#8dff9a");
      }
    }
    this.time.delayedCall(MONSTER_RESPAWN_MS, () => {
      if (!this.scene || !this.scene.isActive(this.scene.key)) return;
      if (this.textures.exists("mon_" + key) && this.rpgMap) {
        const spot = this.rpgMap.findWalkable(Math.floor(homeX / 48), Math.floor(homeY / 48));
        this.spawnMonster(key, spot.x, spot.y, def);
      }
    });
  }

  // 玩家接触怪物 → 开启回合制战斗(暂停移动, 由 BattleUI 接管)
  startBattle(i) {
    const mn = this.monsters[i];
    if (!mn || !mn.m || mn.m.dead || this.inBattle || this.dead) return;
    this.inBattle = true;
    sfx.hurtMonster();
    const def = mn.def || {};
    const sp = this.selfP;
    const engine = new BattleEngine({
      monsterKey: mn.key,
      monsterName: def.name || this.monsterLabel(mn.key),
      monsterHp: mn.m.hp,
      monsterAtk: def.atk || 6,
      player: {
        hp: sp ? sp.hp : 100,
        maxHp: sp ? sp.maxHp : 100,
        level: sp ? (sp.level || 1) : 1,
        equipped: this.equipped || {},
        bag: { items: JSON.parse((sp && sp.inventoryJSON) || "{}") },
      },
    });
    BattleUI.open(this, engine, (snap) => this.endBattle(i, snap));
  }

  // 战斗结束: 胜利→服务端结算+移除怪物; 失败→服务端已扣血; 逃跑→无事
  endBattle(i, snap) {
    this.inBattle = false;
    // 短时间免战冷却: 防止逃跑后玩家仍贴着怪物导致瞬间再次开战
    this._battleCd = this.time.now + 1500;
    const mn = this.monsters[i];
    if (snap.result === "win" && mn) {
      if (this.net.connected) this.net.sendBattleWin(mn.key, snap.taken);
      const xp = (mn.def && mn.def.xp) || 0;
      this.despawnMonster(i, mn.def);
      if (xp && this.localChar) this.floatText(this.localChar.sprite.x, this.localChar.sprite.y - 110, "+" + xp + " XP", "#c9a7ff");
    } else if (snap.result === "lose") {
      this.cameras.main.flash(220, 255, 40, 40);
      this.cameras.main.shake(160, 0.005);
    }
  }

  // 战斗胜利后移除怪物(不发送 kill/loot, 经验与掉落已由服务端 battleWin 权威结算) + 定时重生
  despawnMonster(i, def) {
    const mn = this.monsters[i];
    if (!mn) return;
    const { key, homeX, homeY } = mn;
    const d = mn.def || def;
    mn.m.destroy();
    this.monsters.splice(i, 1);
    sfx.monsterDie();
    this.time.delayedCall(MONSTER_RESPAWN_MS, () => {
      if (!this.scene || !this.scene.isActive(this.scene.key)) return;
      if (this.textures.exists("mon_" + key) && this.rpgMap) {
        const spot = this.rpgMap.findWalkable(Math.floor(homeX / 48), Math.floor(homeY / 48));
        this.spawnMonster(key, spot.x, spot.y, d);
      }
    });
  }

  // ---- 远端玩家(按 mapId 过滤) ----
  async onRemoteAdd(player, key) {
    if (!this.net.sessionId || key === this.net.sessionId) return;
    if (!this.scene || !this.scene.isActive || !this.scene.isActive()) return;
    // 一旦该远端玩家对象出现就绑定 onChange(即使此刻 mapId 不匹配也绑定),
    // 否则玩家从其它地图进入本图时收不到 mapId 变更, 无法补建角色
    if (!this._changeBound.has(key)) {
      this._changeBound.add(key);
      player.onChange(() => this.onRemoteChange(key, player));
    }
    if (player.mapId && player.mapId !== this.scene.key) return;
    if (this.remoteChars.has(key)) return;
    // 记录"本次构建实际使用的"外观串: 异步构建期间若对方又换了装备/外观,
    // onRemoteChange 才能凭差异检测到并重建(否则人物会停留在旧外观)
    const cfgStr = player.cfgJSON || "{}";
    const eqStr = player.equippedJSON || "{}";
    const baseCfg = mvCfg((() => { try { return JSON.parse(cfgStr); } catch { return {}; } })());
    const equipped = (() => { try { return JSON.parse(eqStr); } catch { return {}; } })();
    const cfg = applyEquippedAppearance(baseCfg, equipped);
    const ns = "r_" + key.replace(/[^a-zA-Z0-9]/g, "_");
    // 同步占位: async 构建期间再次进入(如 onRemoteChange 触发的补建)不会重复创建
    this.remoteChars.set(key, { pending: true, tx: player.x, ty: player.y, cfg: null, _eqStr: eqStr, _cfgStr: cfgStr });
    let char;
    try {
      const result = await buildMvCharacter(cfg);
      char = new AnimatedCharacter(this, player.x, player.y, ns, { name: player.name || t("player.default"), enableHurtFx: false, scale: 1 });
      char.build(result.sheets, result.layout);
      char.ready = true;
    } catch {
      try {
        const result = await buildMvCharacter(DEFAULT_CFG);
        char = new AnimatedCharacter(this, player.x, player.y, ns, { name: player.name || t("player.default"), enableHurtFx: false, scale: 1 });
        char.build(result.sheets, result.layout);
        char.ready = true;
      } catch { this.remoteChars.delete(key); return; }
    }
    if (!char.resolveTex("idle", 2)) { char.destroy(); this.remoteChars.delete(key); return; }
    char.setState(this.mapMode(player.mode), player.facing);
    // 构建完成: 仅当仍是占位时才替换, 否则(已被移除/重建)丢弃本次构建
    const cur = this.remoteChars.get(key);
    if (!cur || !cur.pending) { char.destroy(); return; }
    this.remoteChars.set(key, { char, tx: player.x, ty: player.y, cfg, _eqStr: eqStr, _cfgStr: cfgStr });
    this.updateRoomCount();
  }
  onRemoteChange(key, player) {
    const e = this.remoteChars.get(key);
    if (!this.scene || !this.scene.isActive || !this.scene.isActive()) return;
    // 玩家进入本图(此前在其它地图): 尚无角色 → 补建
    if (!e) {
      if (player.mapId && player.mapId !== this.scene.key) return;
      this.onRemoteAdd(player, key);
      return;
    }
    const eqStr = player.equippedJSON || "{}";
    const cfgStr = player.cfgJSON || "{}";
    // 装备或基础外观变化 → 重建角色(含进入本图补建后外观更新)
    if (eqStr !== e._eqStr || cfgStr !== e._cfgStr) {
      e._eqStr = eqStr;
      e._cfgStr = cfgStr;
      this.rebuildRemote(key, player);
      return;
    }
    if (player.mapId && player.mapId !== this.scene.key) { this.removeRemoteChar(key); return; }
    e.tx = player.x; e.ty = player.y;
    if (e.char) e.char.setState(this.mapMode(player.mode), player.facing);
  }
  removeRemoteChar(key) {
    const e = this.remoteChars.get(key);
    if (e) { if (e.char) e.char.destroy(); this.remoteChars.delete(key); }
  }
  async rebuildRemote(key, player) {
    const e = this.remoteChars.get(key);
    if (!e || !this.scene || !this.scene.isActive || !this.scene.isActive()) return;
    // 角色尚未构建完成(占位): 仅更新外观字段, 完成后的条目会带最新 _eqStr/_cfgStr
    if (!e.char) { e._eqStr = player.equippedJSON || "{}"; e._cfgStr = player.cfgJSON || "{}"; return; }
    const baseCfg = mvCfg((() => { try { return JSON.parse(player.cfgJSON || "{}"); } catch { return {}; } })());
    const equipped = (() => { try { return JSON.parse(player.equippedJSON || "{}"); } catch { return {}; } })();
    const cfg = applyEquippedAppearance(baseCfg, equipped);
    const ns = "r_" + key.replace(/[^a-zA-Z0-9]/g, "_");
    try {
      const result = await buildMvCharacter(cfg);
      if (this.remoteChars.get(key) !== e) return;
      const old = e.char;
      const char = new AnimatedCharacter(this, old.sprite.x, old.sprite.y, ns, { name: player.name || t("player.default"), enableHurtFx: false, scale: 1 });
      char.build(result.sheets, result.layout);
      char.ready = true;
      char.setState(this.mapMode(player.mode), player.facing);
      old.destroy();
      e.char = char;
      e.cfg = cfg;
    } catch (err) { console.warn("[remote rebuild]", err); }
  }
  onRemoteRemove(key) {
    this.removeRemoteChar(key);
  }
  mapMode(m) { return m === "hurt" ? "idle" : m; }
  // 怪物显示名：优先本地化文案，缺失(如教师自定义 key)时回退原始 key
  monsterLabel(key) {
    const k = "monster." + key;
    const label = t(k);
    return label === k ? key : label;
  }

  // ---- NPC ----
  async spawnNPCs() {
    // 静态 NPCS + 本图教师编排副本 NPC(副本 NPC 已带 map 字段)
    const defs = NPCS.slice();
    if (this.mcfg && Array.isArray(this.mcfg.npcs)) defs.push(...this.mcfg.npcs);
    for (const def of defs) {
      // 只生成属于当前地图的 NPC(def.map 缺省视为 world)
      if ((def.map || "world") !== this.scene.key) continue;
      try {
        const result = await buildMvCharacter(mvCfg(def.cfg || DEFAULT_CFG));
        const spot = this.rpgMap.findWalkable(def.tile[0], def.tile[1]);
        const ch = new AnimatedCharacter(this, spot.x, spot.y, "npc_" + def.key, { name: def.name, enableHurtFx: false, scale: 1 });
        ch.build(result.sheets, result.layout);
        ch.ready = true;
        ch.setState("idle", 2);
        this.npcs.push({ def, x: spot.x, y: spot.y, char: ch });
      } catch (e) { console.warn("[npc] build failed:", def.key, e); }
    }
  }

  // ---- 对话框 / 互动 ----
  setupDialogUI() {
    this._setVisible = (g, v) => g && g.setVisible(v);
    this.dlgPanel = this.add.rectangle(W / 2, H - 85, W + 8, 170, 0x10141c, 0.92).setStrokeStyle(2, 0x4f8cff, 0.9).setScrollFactor(0).setDepth(70).setVisible(false);
    this.dlgBar = this.add.rectangle(28, H - 153, W - 56, 3, 0x4f8cff, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(71).setVisible(false);
    this.dlgName = this.add.text(36, H - 140, "", { fontFamily: '"PingFang SC"', fontSize: "17px", color: "#7fd4ff", fontStyle: "bold", stroke: "#000000", strokeThickness: 3 }).setOrigin(0, 0).setScrollFactor(0).setDepth(71).setVisible(false);
    this.dlgText = this.add.text(36, H - 112, "", { fontFamily: '"PingFang SC"', fontSize: "18px", color: "#f2f6fc", lineHeight: 27, stroke: "#000000", strokeThickness: 4 }).setWordWrapWidth(W - 76).setOrigin(0, 0).setScrollFactor(0).setDepth(71).setVisible(false);
    this.dlgNext = this.add.text(W - 32, H - 18, "", { fontFamily: '"PingFang SC"', fontSize: "14px", color: "#9fb3d0" }).setOrigin(1, 1).setScrollFactor(0).setDepth(71).setVisible(false);
    this.tip = this.add.text(0, 0, "", { fontFamily: '"PingFang SC"', fontSize: "15px", color: "#ffe08a", fontStyle: "bold", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(69).setVisible(false);
    this.dlgOmni = { open: false, npc: null, index: 0 };
    this.ensureVoices(); // 预热发音人列表，避免首句落在"列表未就绪"的默认音色上
  }
  openDialog(npc) {
    if (this.dlgOmni.open) return;
    this.dlgOmni = { open: true, npc, index: 0 };
    this.renderDialog();
  }
  renderDialog() {
    const d = this.dlgOmni;
    const lines = d.npc.def.lines || [];
    this.dlgName.setText(`${d.npc.def.name}:`);
    this.dlgText.setText(lines[d.index] || "");
    this.dlgNext.setText(d.index >= lines.length - 1 ? "" : t("npc.next"));
    [this.dlgPanel, this.dlgBar, this.dlgName, this.dlgText, this.dlgNext].forEach((g) => this._setVisible(g, true));
    this.tip.setVisible(false);
    this.speak(lines[d.index] || "", d.npc.def.key, d.npc.def.cfg && d.npc.def.cfg.gender);
  }
  advanceDialog() {
    const d = this.dlgOmni;
    if (!d.open) return;
    if (d.index < (d.npc.def.lines || []).length - 1) { d.index++; this.renderDialog(); }
    else this.closeDialog();
  }
  closeDialog() {
    if (!this.dlgOmni.open) { return; }
    this.dlgOmni.open = false;
    this.stopSpeak();
    [this.dlgPanel, this.dlgBar, this.dlgName, this.dlgText, this.dlgNext].forEach((g) => this._setVisible(g, false));
  }

  onActionKey() {
    if (this.backpackOpen || this.dead) return;
    if (this.nearDoor) { this.goDoor(this.nearDoor); return; }
    if (this.dlgOmni.open) { this.advanceDialog(); return; }
    if (this.shopOpen) { this.toggleShop(false); return; }
    if (this.nearNpc) {
      if (this.net.connected) this.net.sendTalk(this.nearNpc.def.key);
      if (this.nearNpc.def.role === "shop") { this.openShop(); return; }
      this.openDialog(this.nearNpc);
    }
  }

  // ---- 跨图出入口 ----
  goDoor(door) {
    this.closeOverlays();
    appStore.nav = { to: door.to, tile: door.spawn };
    // 目标地图的出生瓦片 → 像素(48px/格, 取格中心), 与 mapId 一起发给服务器,
    // 让"进入新地图"和"坐标更新"原子化, 避免远端玩家先看到旧地图坐标再瞬移到门口
    const tcfg = MAPS[door.to] || instanceStore.getMap(door.to);
    const sp = door.spawn || (tcfg && tcfg.spawn);
    let px, py;
    if (Array.isArray(sp)) { px = sp[0] * 48 + 24; py = sp[1] * 48 + 24; }
    if (this.net.connected) this.net.sendMap(door.to, px, py);
    this.scene.start(door.to);
  }

  // ---- 背包 / 商店 / 任务 ----
  toggleBackpack(force) {
    const open = force !== undefined ? force : !this.backpackOpen;
    if (open && this.shopOpen) this.toggleShop(false);
    this.backpackOpen = open;
    Overlay.bp.root.hidden = !open;
    Overlay.close("shop");
    if (!open) { Overlay.close("backpack"); return; }
    Overlay.open("backpack");
    Overlay.setGold(this.bag.gold);
    Overlay.renderBackpack(this);
  }
  openShop() {
    if (this.backpackOpen) this.toggleBackpack(false);
    this.shopOpen = true;
    this.dlgOmni.open = false;
    Overlay.setGold(this.bag.gold);
    // 按 NPC 配置的商品分类过滤商店(cats 缺省则展示全部分类)
    const cats = this.nearNpc && Array.isArray(this.nearNpc.def.cats) ? this.nearNpc.def.cats : null;
    Overlay.renderShop(this, cats);
    Overlay.open("shop");
  }
  toggleShop(force) {
    const open = force !== undefined ? force : !this.shopOpen;
    this.shopOpen = open;
    if (open) { Overlay.open("shop"); Overlay.setGold(this.bag.gold); Overlay.renderShop(this, null); }
    else { Overlay.close("shop"); }
  }
  toggleTasks(force) {
    const root = document.getElementById("tasks");
    if (!root) return;
    const open = force !== undefined ? force : root.hidden;
    root.hidden = !open;
    if (open) renderTaskPanel();
  }
  closeOverlays() {
    if (this.shopOpen) { this.toggleShop(false); return; }
    if (this.backpackOpen) { this.toggleBackpack(false); return; }
    this.closeDialog();
    const root = document.getElementById("tasks");
    if (root && !root.hidden) { root.hidden = true; }
  }

  // ---- TTS ----
  stopSpeak() { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }
  // 语音列表在部分浏览器首次为空，需等待 onvoiceschanged；这里缓存并在对话前预热
  ensureVoices() {
    if (this._voices && this._voices.length) return this._voices;
    const ss = window.speechSynthesis;
    const list = ss && ss.getVoices ? ss.getVoices() : [];
    if (list && list.length) { this._voices = list; return list; }
    if (ss && !this._voicesHooked) {
      this._voicesHooked = true;
      try { ss.onvoiceschanged = () => { this._voices = ss.getVoices() || []; }; } catch { /* ignore */ }
    }
    return [];
  }
  // 按 NPC 固定发音人：同一 NPC 的所有台词始终使用同一音色（按性别挑选，结果缓存）
  pickVoiceFor(key, gender) {
    if (key && this._voiceByNpc && this._voiceByNpc.has(key)) return this._voiceByNpc.get(key);
    const langCode = isZh() ? "zh" : "en";
    const pool = this.ensureVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith(langCode));
    const FEMALE = /(female|xiaoxiao|xiaoyi|xiaoni|xiaomo|huihui|yaoyao|ting-?ting|meijia|samantha|victoria|karen|moira|tessa|zira|susan|女)/i;
    const MALE = /(male|yunxi|yunjian|yunyang|kangkang|daniel|alex|fred|david|mark|男)/i;
    let v = null;
    if (gender === "Female") v = pool.find((x) => FEMALE.test(x.name || "")) || null;
    else if (gender === "Male") v = pool.find((x) => MALE.test(x.name || "")) || null;
    if (!v) v = pool[0] || null; // 无性别匹配(或列表尚未就绪)时回退
    if (key) {
      if (!this._voiceByNpc) this._voiceByNpc = new Map();
      this._voiceByNpc.set(key, v); // 缓存(含 null)：同一 NPC 不会中途换音色
    }
    return v;
  }
  speak(text, npcKey, gender) {
    this.stopSpeak();
    if (!("speechSynthesis" in window) || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    const v = this.pickVoiceFor(npcKey, gender);
    if (v) { u.voice = v; u.lang = v.lang || (isZh() ? "zh-CN" : "en-US"); }
    else { u.lang = isZh() ? "zh-CN" : "en-US"; }
    // 同一 NPC 保持一致：即便浏览器没有性别音色，也用固定音高区分男女且不跳变
    u.pitch = gender === "Female" ? 1.15 : gender === "Male" ? 0.8 : 1;
    u.rate = 1;
    window.speechSynthesis.speak(u);
  }

  update(_time, delta) {
    const c = this.localChar;
    if (!c || !c.ready) return;
    const runKey = this.keys && this.keys.run;
    let vx = 0, vy = 0;
    const uiBlocked = this.dlgOmni.open || this.backpackOpen || this.shopOpen || this.dead || this.inBattle ||
      (() => { const r = document.getElementById("tasks"); return r && !r.hidden; })();
    if (!c.state.busy && !uiBlocked) {
      vx = (this.cursors.RIGHT.isDown || this.cursors.D.isDown ? 1 : 0) - (this.cursors.LEFT.isDown || this.cursors.A.isDown ? 1 : 0);
      vy = (this.cursors.DOWN.isDown || this.cursors.S.isDown ? 1 : 0) - (this.cursors.UP.isDown || this.cursors.W.isDown ? 1 : 0);
    }
    const dt = Math.min(delta, 50) / 1000;
    if (vx !== 0 || vy !== 0) {
      if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }
      const running = runKey && runKey.isDown;
      const speed = running ? 430 : MOVE_SPEED;
      const nx = Phaser.Math.Clamp(c.sprite.x + vx * speed * dt, 0, this._worldW);
      const ny = Phaser.Math.Clamp(c.sprite.y + vy * speed * dt, 0, this._worldH);
      const mv = this.rpgMap.moveWithCollision(c.sprite.x, c.sprite.y, nx - c.sprite.x, ny - c.sprite.y, COLLIDE_R);
      c.sprite.x = mv.x; c.sprite.y = mv.y;
      c.state.facing = Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 3 : 1) : (vy > 0 ? 2 : 0);
      c.state.mode = running ? "run" : "walk";
    } else if (!c.state.busy && c.state.mode !== "idle") {
      c.state.mode = "idle";
    }
    c.update(delta);
    if (DEV) c.setCoord(c.sprite.x, c.sprite.y);

    for (const n of this.npcs) { n.char.update(delta); if (DEV) n.char.setCoord(n.char.sprite.x, n.char.sprite.y); }
    this.updateMonsters(delta, dt);

    // NPC 靠近检测
    let near = null, best = 110;
    for (const n of this.npcs) {
      const d2 = Math.hypot(c.sprite.x - n.x, c.sprite.y - n.y);
      if (d2 < best) { best = d2; near = n; }
    }
    this.nearNpc = near;
    if (near && !uiBlocked && !this.nearGround && !this.nearDoor) {
      this.tip.setVisible(true).setText(t("npc.talkTip")).setPosition(near.x, near.y - 52);
    } else { this.tip.setVisible(false); }

    // 怪物接触 → 触发回合制战斗(暂停移动)
    if (!this.inBattle && !uiBlocked && !this.dead && this.time.now >= (this._battleCd || 0)) {
      for (let i = 0; i < this.monsters.length; i++) {
        const mn = this.monsters[i];
        if (!mn || !mn.m || mn.m.dead) continue;
        const d = Math.hypot(c.sprite.x - mn.m.x, c.sprite.y - mn.m.y);
        if (d < COLLIDE_R + 8) { this.startBattle(i); break; }
      }
    }

    // 门(跨图出入口)
    let door = null;
    for (const d of this.doors) {
      if (Math.hypot(c.sprite.x - d.pos.x, c.sprite.y - d.pos.y) < 64) { door = d; break; }
    }
    this.nearDoor = door;
    if (door && !this.nearGround) {
      const toName = (MAPS[door.to] && MAPS[door.to].name) || door.to;
      this.doorTip.setVisible(true).setText(t("door.enterTip", { name: toName })).setPosition(door.pos.x, door.pos.y - 26);
    } else { this.doorTip.setVisible(false); }

    // 地面物品
    let nearG = null, bestG = 70;
    for (const e of this.groundSprites.values()) {
      e.g._ph += delta * 0.004;
      e.g.y = (e.g._baseY || e.g.y) + Math.sin(e.g._ph) * 4;
      const d2 = Math.hypot(c.sprite.x - e.g.x, c.sprite.y - e.g.y);
      if (d2 < bestG) { bestG = d2; nearG = e; }
    }
    this.nearGround = nearG;
    if (nearG && !uiBlocked) {
      const nm = ITEMS[nearG.itemId] ? ITEMS[nearG.itemId].name : nearG.itemId;
      this.groundTip.setVisible(true).setText(t("bag.pickTip", { name: nm })).setPosition(nearG.g.x, nearG.g.y - 30);
    } else { this.groundTip.setVisible(false); }

    this.cameras.main.centerOn(c.sprite.x, c.sprite.y - 60);

    for (const e of this.remoteChars.values()) {
      if (!e.char) continue;
      const dx = e.tx - e.char.sprite.x, dy = e.ty - e.char.sprite.y;
      if (dx * dx + dy * dy > 600 * 600) {
        // 距离过大(切图/重连等)直接落位, 避免从很远的地方"滑"过来
        e.char.sprite.x = e.tx;
        e.char.sprite.y = e.ty;
      } else {
        e.char.sprite.x = Phaser.Math.Linear(e.char.sprite.x, e.tx, 0.25);
        e.char.sprite.y = Phaser.Math.Linear(e.char.sprite.y, e.ty, 0.25);
      }
      e.char.update(delta);
      if (DEV) e.char.setCoord(e.char.sprite.x, e.char.sprite.y);
    }

    if (DEV && this.posHud) {
      const p = this.input.activePointer;
      try { this.posHud.setText(`${t("game.mouse")}${coordText(p.worldX, p.worldY)}`).setVisible(true); } catch { }
    }

    this._sendAcc += delta;
    if (this._sendAcc >= MOVE_INTERVAL && this.net.connected && this._selfReady) {
      this._sendAcc = 0;
      this.net.sendMove(c.sprite.x, c.sprite.y, c.state.facing, c.state.mode);
    }
    if (this.net.connected && this._status) this.updateRoomCount();
  }
}