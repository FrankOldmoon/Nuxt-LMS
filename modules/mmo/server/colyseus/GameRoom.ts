// GameRoom.ts —— Colyseus 游戏房间（权威服务器）
// 通过 /api/mmo/join 发放的 token 认证；玩家状态在房间内权威维护并实时广播；
// 每 5 秒 + 离房时将玩家数据持久化到 game_info 表；任务系统在服务端权威结算。
// 存档按 (用户, 课程) 隔离：同一用户在每门课里各有一份存档；
// 金币不使用存档里的值，而是直接读写该课程的 user_courses.coin（与 LMS 课程商店同一份）。
// 注：colyseus 为 CJS 动态重导出，无法静态解析具名导出，故用默认导入取 Room。
import colyseus from "colyseus";
import { GameRoomState, Player, GroundItem } from "./schema";
import itemsData from "../../gamejs/config/items.json";
import tasksData from "../../gamejs/config/tasks.json";
import monstersData from "../../gamejs/config/monsters.json";
import { db, schema } from "@nuxthub/db";
import { eq, and, isNull } from "drizzle-orm";

const { Room } = colyseus;

const ITEMS: Record<string, any> = itemsData.items;
const GROUND_SPAWNS: any[] = itemsData.groundSpawns;
const DEFAULT_GOLD: number = itemsData.defaultGold;
const TASKS: any[] = tasksData.tasks;
const MONSTER_DEFS: any[] = monstersData.monsters;

const DEFAULT_CFG = {
  gender: "Male",
  layers: { Body: 1, Clothing1: 1, Clothing2: 5, FrontHair1: 3, RearHair1: 4 },
  colors: {}, skin: null,
};

const RESPAWN_MS = 20000;   // 地面物品被拾取后的原地刷新
const INIT_HP = 100;
const DEAD_MS = 2500;
const XP_PER_LV = 100;
const SAVE_INTERVAL_TICKS = 5; // 每 5 秒持久化一次

let dropCounter = 0;
let lootCounter = 0;

const readJson = (json: any) => { try { return JSON.parse(json || "{}"); } catch { return {}; } };
const writeJson = (o: any) => JSON.stringify(o);

export class GameRoom extends Room {
  // 本房间所属班级（按 default_class.id 隔离）；sessionId -> userId
  private classId = 0;
  private userBySession = new Map<string, number>();
  private courseBySession = new Map<string, number>();
  // 运行时加载的"教师编排副本"任务(按班级隔离, 不污染全局 TASKS)
  private instTasks: any[] = [];

  async onCreate(options: any = {}) {
    this.classId = Number(options && options.classId) || 0;
    this.setState(new GameRoomState());

    // 载入本班教师 / 外部（?json= 链接）编排副本的任务定义(供 kill/collect/talk 任务权威结算)
    this.instTasks = [];
    await this.reloadInstanceTasks();

    // 世界地面物品（一次生成,拾取即从状态移除）
    for (let i = 0; i < GROUND_SPAWNS.length; i++) {
      const s = GROUND_SPAWNS[i];
      this.state.groundItems.push(new GroundItem().assign({ id: "g_" + i, itemId: s.itemId, x: s.x, y: s.y, mapId: "world" }));
    }

    this.onMessage("move", (client, msg) => {
      const p = this.playerOf(client);
      if (!p) return;
      // join 后 2 秒内忽略 move 消息: 防止客户端出生点坐标(restoreSavedMap 之前)覆盖存档
      if (p._joinAt && Date.now() - p._joinAt < 2000) return;
      if (typeof msg.x === "number") p.x = msg.x;
      if (typeof msg.y === "number") p.y = msg.y;
      if (typeof msg.facing === "number") p.facing = msg.facing;
      if (typeof msg.mode === "string") p.mode = msg.mode;
    });
    this.onMessage("appearance", (client, msg) => {
      const p = this.playerOf(client);
      if (!p) return;
      const cfg = msg && msg.cfg ? msg.cfg : {};
      p.cfgJSON = JSON.stringify({ ...DEFAULT_CFG, ...cfg });
    });
    this.onMessage("map", (client, msg) => {
      const p = this.playerOf(client);
      if (!p) return;
      // mapId 承载任意地图标识(world/indoor/indoor2/inst_<id>…), 对应 config/maps.json 的 key；
      // 上限放宽到 64 以容纳 "inst_" + 教师副本 id(≤48)，保证副本地图能持久化
      const m = msg && typeof msg.mapId === "string" ? msg.mapId.trim() : "";
      if (!m || m.length > 64) return;
      p.mapId = m;
      // 与坐标同时更新: 客户端切图时可携带目标出生点, 消除"新地图+旧坐标"的中间态
      if (typeof msg.x === "number" && typeof msg.y === "number") { p.x = msg.x; p.y = msg.y; }
    });
    // 丢弃物品: 背包扣 1,并在地面生成拾取物
    this.onMessage("drop", (client, msg) => {
      const p = this.playerOf(client);
      if (!p) return;
      const itemId = msg && msg.itemId;
      if (!itemId || !ITEMS[itemId]) return;
      if (!this.delItem(p, itemId, 1)) return;
      const gid = "g_drop_" + (++dropCounter);
      this.state.groundItems.push(new GroundItem().assign({ id: gid, itemId, x: p.x, y: p.y, mapId: p.mapId || "world" }));
    });

    // 购买/出售/拾取
    this.onMessage("buy", (client, msg) => {
      const p = this.playerOf(client);
      if (!p) return;
      const item = ITEMS[msg && msg.itemId];
      const qty = Math.max(1, Math.floor(msg.qty || 1));
      if (!item) return;
      const cost = item.buy * qty;
      if (p.gold < cost) { (p as any)._lastErr = "noGold"; return; }
      this.setGold(p, p.gold - cost);
      this.addItem(p, msg.itemId, qty);
      this.checkAllTasks(p);
    });
    this.onMessage("sell", (client, msg) => {
      const p = this.playerOf(client);
      if (!p) return;
      const item = ITEMS[msg && msg.itemId];
      const qty = Math.max(1, Math.floor(msg.qty || 1));
      if (!item) return;
      if (!this.delItem(p, msg.itemId, qty)) return;
      this.setGold(p, p.gold + item.sell * qty);
      this.checkAllTasks(p);
    });
    this.onMessage("pickup", (client, msg) => {
      const p = this.playerOf(client);
      if (!p) return;
      const gid = (typeof msg === "string") ? msg : msg?.id;
      const gi = this.state.groundItems.find((g: any) => g.id === gid);
      if (!gi) return;
      // 地面物品按地图隔离：只能拾取自己当前所在地图的掉落
      if ((gi.mapId || "world") !== (p.mapId || "world")) return;
      const d = Math.hypot(p.x - gi.x, p.y - gi.y);
      if (d > 90) return;
      const info = { id: gi.id, itemId: gi.itemId, x: gi.x, y: gi.y };
      const idx = this.state.groundItems.findIndex((g: any) => g.id === gi.id);
      this.state.groundItems.splice(idx, 1);
      this.addItem(p, info.itemId);
      this.updateTask(p, "collect", info.itemId);
      this.checkAllTasks(p);
      setTimeout(() => {
        if (!this.state) return;
        if (this.state.groundItems.some((g: any) => g.id === info.id)) return;
        this.state.groundItems.push(new GroundItem().assign(info));
      }, RESPAWN_MS);
    });

    // 玩家状态：被怪物击中 / 击杀 / 掉落 / 使用物品 / 装备
    this.onMessage("hit", (client, msg) => {
      const p = this.playerOf(client);
      if (!p || p.hp <= 0) return;
      const raw = Math.min(60, Math.max(0, Number(msg && msg.dmg) || 0));
      if (!raw) return;
      const dmg = Math.max(1, raw - this.totalDef(p));
      p.hp = Math.max(0, p.hp - dmg);
    });
    // 击杀怪物：key 必须属于服务端怪物表(MONSTER_DEFS)，经验由服务端 def.xp 决定，
    // 拒绝客户端上报的任意 xp/key，避免伪造击杀刷经验。
    this.onMessage("kill", (client, msg) => this.handleKill(client, msg));
    // 回合制战斗胜利: 服务端权威结算
    //  - 仅信任怪物 key(校验属于 MONSTER_DEFS), 经验/掉落由服务端生成, 杜绝客户端作弊上报
    //  - 玩家承受伤害做上限钳制(≤ 怪物攻击×20), 并经 totalDef 减免后扣血
    this.onMessage("battleWin", (client, msg) => this.handleBattleWin(client, msg));
    // 与 NPC 对话：先接取由该 NPC 给出的任务，再推进已接取的 talk 任务
    this.onMessage("talk", (client, msg) => {
      const p = this.playerOf(client);
      if (!p) return;
      const key = msg && msg.key;
      if (!key) return;
      let tasks = readJson(p.tasksJSON);
      let changed = false;
      // 1. 接取由该 NPC 给出的任务(尚未接取的)
      for (const task of this.allTasks()) {
        if (task.giver !== key) continue;
        const rec = tasks[task.id];
        if (!rec || (!rec.accepted && !rec.done)) {
          tasks[task.id] = { progress: rec ? (rec.progress || 0) : 0, done: rec ? rec.done : false, accepted: true };
          changed = true;
        }
      }
      // 2. 推进已接取的 talk 类型任务(target 匹配)
      for (const task of this.allTasks()) {
        const rec = tasks[task.id];
        if (rec && rec.accepted && !rec.done && task.type === "talk" && String(task.target) === String(key)) {
          rec.progress = Math.min(task.count, (rec.progress || 0) + 1);
          changed = true;
        }
      }
      if (changed) {
        p.tasksJSON = writeJson(tasks);
        this.checkAllTasks(p);
      }
    });
    // 掉落物由服务端在 battleWin 中按 def.drops/dropChance 权威决定，
    // 不再接受客户端上报的 loot(itemId)，此处仅保留消息槽以兼容旧客户端，不做任何写入。
    this.onMessage("loot", () => { /* drops are server-authoritative via battleWin */ });
    // 使用物品: 恢复生命,消耗 1 个
    this.onMessage("use", (client, msg) => {
      const p = this.playerOf(client);
      if (!p || p.hp <= 0) return;
      const item = ITEMS[msg && msg.itemId];
      if (!item || item.heal === undefined) return;
      if (!this.delItem(p, msg.itemId, 1)) return;
      p.hp = Math.min(p.maxHp, p.hp + item.heal);
    });
    // 装备: 穿上/脱下
    this.onMessage("equip", (client, msg) => {
      const p = this.playerOf(client);
      if (!p || p.hp <= 0) return;
      const itemId = msg && msg.itemId;
      const item = ITEMS[itemId];
      if (!item || !item.slot) return;
      // 服饰/配件按性别锁定: 性别不匹配不可穿戴
      if (item.mv && item.mv.gender) {
        const pcfg = readJson(p.cfgJSON);
        if (pcfg.gender && item.mv.gender !== pcfg.gender) return;
      }
      if (!this.delItem(p, itemId, 1)) return;
      const eq = readJson(p.equippedJSON);
      if (eq[item.slot]) this.addItem(p, eq[item.slot], 1);
      eq[item.slot] = itemId;
      p.equippedJSON = writeJson(eq);
    });
    this.onMessage("unequip", (client, msg) => {
      const p = this.playerOf(client);
      if (!p) return;
      const slot = msg && msg.slot;
      const eq = readJson(p.equippedJSON);
      if (!eq[slot]) return;
      this.addItem(p, eq[slot], 1);
      delete eq[slot];
      p.equippedJSON = writeJson(eq);
    });

    // 每秒结算: 倒地复活 + 金币回写课程 + 周期持久化
    this._tickN = 0;
    this.setSimulationInterval(() => this.tick(), 1000);
  }

  private playerOf(client: any): Player | null {
    return this.state.players.find((x: any) => x.sessionId === client.sessionId) || null;
  }

  // 全部任务 = 静态 TASKS + 本班教师编排副本任务(运行时注入)
  // 重新载入本班副本任务定义（合并去重）。在房间创建时调用一次；玩家 onJoin 时再次调用，
  // 以覆盖"房间已存在后、再通过 ?json= 链接新增副本"的场景（否则新副本任务不会进入权威结算）。
  private async reloadInstanceTasks() {
    try {
      const rows = await db
        .select({ id: schema.mmoInstance.id, json: schema.mmoInstance.json })
        .from(schema.mmoInstance)
        .where(eq(schema.mmoInstance.classId, this.classId));
      const seen = new Set((this.instTasks || []).map((t: any) => (t._instance || "") + ":" + (t.id || "")));
      for (const r of rows) {
        const j = (typeof r.json === "string" ? JSON.parse(r.json) : r.json) || {};
        if (Array.isArray(j.tasks)) {
          for (const t of j.tasks) {
            const key = (r.id) + ":" + (t && t.id);
            if (seen.has(key)) continue;
            seen.add(key);
            this.instTasks.push({ ...t, _instance: r.id });
          }
        }
      }
    } catch (e) {
      console.error("[mmo instance reload]", e);
    }
  }

  private allTasks(): any[] {
    return [...TASKS, ...(this.instTasks || [])];
  }

  tick() {
    const now = Date.now();
    this._tickN = (this._tickN || 0) + 1;
    for (const p of this.state.players as any[]) {
      if (p.hp <= 0) {
        if (!p._deadAt) { p._deadAt = now; continue; }
        if (now - p._deadAt >= DEAD_MS) {
          p._deadAt = 0;
          p.hp = p.maxHp;
        }
        continue;
      }
      // 金币变更即时回写课程(≈1 秒内)，避免与 LMS 课程商店读到的余额长时间不一致
      if (p._goldDirty) this.flushCoin(p);
    }
    // 周期持久化
    if (this._tickN % SAVE_INTERVAL_TICKS === 0) {
      for (const p of this.state.players as any[]) this.persistPlayer(p);
    }
  }

  async onJoin(client: any, options: any = {}) {
    try {
      // 1. token 认证（/api/mmo/join 签发，一次性）
      const token = options && options.token;
      const userId = await this.authenticate(token);
      if (!userId) {
        client.leave();
        return;
      }
      // 2. 校验班级：只允许进入自己 default_class 对应的房间（服务端权威）
      const info = await this.userBaseInfo(userId);
      const userClassId = info ? info.classId : 0;
      if (userClassId !== this.classId) {
        client.leave();
        return;
      }
      // 3. 校验课程：必须带 courseId 且是该课程的成员（游戏数据/金币都按课程隔离）
      const courseId = Number(options && options.courseId) || 0;
      if (!courseId) {
        client.leave();
        return;
      }
      const coin = await this.courseInfo(userId, courseId);
      if (coin === null) {
        client.leave();
        return;
      }
      // 同一账号只保留最新会话：踢掉旧会话并移除其角色，避免同一玩家出现重复角色
      // 必须 await persistPlayer，否则 loadSave 会读到旧坐标(写入还没落地)，导致刷新后位置丢失
      for (const sid of Array.from(this.userBySession.keys())) {
        if (sid !== client.sessionId && this.userBySession.get(sid) === userId) {
          const idx = this.state.players.findIndex((x: any) => x.sessionId === sid);
          if (idx >= 0) {
            const oldP = this.state.players[idx];
            await this.persistPlayer(oldP);
            this.state.players.splice(idx, 1);
          }
          this.userBySession.delete(sid);
          this.courseBySession.delete(sid);
          const oldClient = this.clients.find((c: any) => c.sessionId === sid);
          if (oldClient) oldClient.leave();
        }
      }
      this.userBySession.set(client.sessionId, userId);
      this.courseBySession.set(client.sessionId, courseId);

      // 4. 从 game_info 读取该课程的存档；金币以课程 coin 为准
      const saved = await this.loadSave(userId, courseId);
      const cfg = { ...DEFAULT_CFG, ...(saved.cfg || {}) };
      const p = new Player().assign({
        sessionId: client.sessionId,
        x: saved.x, y: saved.y, facing: saved.facing ?? 2, mode: "idle",
        name: (info && info.name) || saved.name || "玩家",
        cfgJSON: JSON.stringify(cfg),
        gold: coin,
        inventoryJSON: writeJson(saved.inventory || {}),
        equippedJSON: writeJson(saved.equipped || {}),
        tasksJSON: writeJson(saved.tasks || {}),
        mapId: (saved.mapId === "outdoor" ? "world" : saved.mapId) || "world",
        hp: saved.hp, maxHp: saved.maxHp,
        xp: saved.xp, level: saved.level,
      });
      this.state.players.push(p);
      (p as any)._joinAt = Date.now();
      await this.reloadInstanceTasks(); // 覆盖房间创建后新增的外部副本（?json= 链接）
      this.checkAllTasks(p);
    } catch (e) {
      console.error("[mmo onJoin error]", e);
      try { client.leave(); } catch { /* ignore */ }
    }
  }

  async onLeave(client: any) {
    const idx = this.state.players.findIndex((x: any) => x.sessionId === client.sessionId);
    if (idx >= 0) {
      const p = this.state.players[idx];
      this.state.players.splice(idx, 1);
      await this.persistPlayer(p); // 离房最终保存
    }
    this.userBySession.delete(client.sessionId);
    this.courseBySession.delete(client.sessionId);
  }

  onDispose() {
    this.userBySession.clear();
    this.courseBySession.clear();
  }

  // ---- 班级/账号信息 ----
  // 读取用户基础信息：班级（优先 default_class.id，否则回退 users.class_id，0 = 默认大厅房间）+ 账号名
  private async userBaseInfo(userId: number): Promise<{ classId: number; name: string } | null> {
    try {
      const rows = await db
        .select({ defaultClass: schema.users.defaultClass, classId: schema.users.classId, name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);
      if (!rows[0]) return null;
      const dc = rows[0].defaultClass;
      return {
        classId: (dc && Number((dc as any).id)) || rows[0].classId || 0,
        name: rows[0].name || "",
      };
    } catch (e) {
      return null;
    }
  }

  // ---- 认证 ----
  private async authenticate(token: string): Promise<number | null> {
    if (!token) return null;
    try {
      const tok = await db
        .select()
        .from(schema.tokens)
        .where(and(eq(schema.tokens.name, token), isNull(schema.tokens.deletedAt)))
        .limit(1);
      if (!tok[0]) return null;
      // 一次性 token：用后即删
      await db.delete(schema.tokens).where(eq(schema.tokens.id, tok[0].id)).catch(() => {});
      return tok[0].userId;
    } catch (e) {
      console.error("[mmo auth]", e);
      return null;
    }
  }

  // ---- 课程绑定：金币以该课程的 user_courses.coin 为唯一真相 ----
  // 返回课程金币余额；null = 不是该课程成员（onJoin 据此权威拒绝）
  private async courseInfo(userId: number, courseId: number): Promise<number | null> {
    try {
      const rows = await db
        .select({ coin: schema.userCourses.coin })
        .from(schema.userCourses)
        .where(and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)))
        .limit(1);
      if (!rows[0]) return null;
      return Number(rows[0].coin) || 0;
    } catch (e) {
      console.error("[mmo course]", e);
      return null;
    }
  }
  private async persistCoin(userId: number, courseId: number, coin: number) {
    try {
      await db
        .update(schema.userCourses)
        .set({ coin })
        .where(and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)));
    } catch (e) {
      console.error("[mmo coin]", e);
    }
  }
  // 修改金币：同步游戏内数值并标记待回写（tick 内 ≈1 秒、离房时立即回写课程 coin）
  private setGold(p: any, value: number) {
    p.gold = Math.max(0, Math.round(value));
    p._goldDirty = true;
  }
  private flushCoin(p: any) {
    p._goldDirty = false;
    const userId = this.userBySession.get(p.sessionId);
    const courseId = this.courseBySession.get(p.sessionId);
    if (!userId || !courseId) return;
    void this.persistCoin(userId, courseId, Math.max(0, Math.round(p.gold)));
  }

  // ---- 存档读写（按 userId + courseId 隔离） ----
  private async loadSave(userId: number, courseId: number): Promise<any> {
    try {
      const rows = await db
        .select()
        .from(schema.gameInfo)
        .where(and(eq(schema.gameInfo.userId, userId), eq(schema.gameInfo.courseId, courseId)))
        .limit(1);
      if (rows[0]) return rows[0];
    } catch (e) {
      console.error("[mmo load]", e);
    }
    return {
      name: "玩家", cfg: {}, gold: DEFAULT_GOLD, inventory: {}, equipped: {}, tasks: {},
      x: 936, y: 1080, facing: 2, mode: "idle", mapId: "world",
      hp: INIT_HP, maxHp: INIT_HP, xp: 0, level: 1,
    };
  }

  private async persistPlayer(p: any) {
    const userId = this.userBySession.get(p.sessionId);
    if (!userId) return;
    const courseId = this.courseBySession.get(p.sessionId) || 0;
    const data = {
      name: p.name,
      cfg: readJson(p.cfgJSON),
      gold: p.gold,
      inventory: readJson(p.inventoryJSON),
      equipped: readJson(p.equippedJSON),
      tasks: readJson(p.tasksJSON),
      x: Math.round(p.x),
      y: Math.round(p.y),
      facing: p.facing,
      mode: p.mode,
      mapId: p.mapId,
      hp: p.hp,
      maxHp: p.maxHp,
      xp: p.xp,
      level: p.level,
    };
    try {
      await db.insert(schema.gameInfo)
        .values({ userId, courseId, ...data })
        .onConflictDoUpdate({ target: [schema.gameInfo.userId, schema.gameInfo.courseId], set: data });
    } catch (e) {
      console.error("[mmo persist]", e);
    }
    await this.flushCoin(p); // 金币写回课程 user_courses.coin（与 LMS 课程商店共用）
  }

  // ---- 背包/装备 ----
  private addItem(p: any, id: string, qty = 1) {
    const o = readJson(p.inventoryJSON);
    o[id] = (o[id] || 0) + qty;
    p.inventoryJSON = writeJson(o);
  }
  private delItem(p: any, id: string, qty = 1): boolean {
    const o = readJson(p.inventoryJSON);
    if ((o[id] || 0) < qty) return false;
    o[id] -= qty;
    if (o[id] <= 0) delete o[id];
    p.inventoryJSON = writeJson(o);
    return true;
  }
  private totalDef(p: any): number {
    const eq = readJson(p.equippedJSON);
    let d = 0;
    for (const s in eq) d += (ITEMS[eq[s]] || {}).def || 0;
    return d;
  }

  // ---- 经验/升级 ----
  private applyXp(p: any, gain: number) {
    p.xp += gain;
    while (p.xp >= p.level * XP_PER_LV) {
      p.xp -= p.level * XP_PER_LV;
      p.level += 1;
      p.maxHp += 20;
      p.hp = p.maxHp;
    }
    // 注：升级/经验变化后由调用方统一走一次 checkAllTasks（迭代式），避免此处与 checkAllTasks 互递归爆栈。
  }

  // ---- 任务系统（服务端权威） ----
  // 只推进已接取(accepted)且未完成的任务
  private updateTask(p: any, type: string, target: any, amount = 1) {
    let tasks = readJson(p.tasksJSON);
    let changed = false;
    for (const task of this.allTasks()) {
      const rec = tasks[task.id];
      if (!rec || !rec.accepted || rec.done) continue;
      if (task.type !== type || String(task.target) !== String(target)) continue;
      rec.progress = Math.min(task.count, (rec.progress || 0) + amount);
      changed = true;
    }
    if (changed) {
      p.tasksJSON = writeJson(tasks);
      this.checkAllTasks(p);
    }
  }
  private checkAllTasks(p: any) {
    // 迭代处理：任务奖励可能改变 level/gold，进而解锁依赖它们的其它任务。
    // 每轮只处理一个完成则在下一轮重新读取最新任务状态，避免快照陈旧导致重复奖励而无限递归。
    for (let guard = 0; guard < 64; guard++) {
      let tasks = readJson(p.tasksJSON);
      let progressed = false;
      for (const task of this.allTasks()) {
        let rec = tasks[task.id];
        // 自动迁移: 已存在的记录若无 accepted 字段, 视为已接取
        if (rec && !rec.accepted && !rec.done) { rec.accepted = true; }
        if (!rec || !rec.accepted) continue;
        if (rec.done) continue;
        if (task.type === "level") rec.progress = Math.max(rec.progress, p.level >= task.target ? task.count : 0);
        else if (task.type === "gold") rec.progress = Math.max(rec.progress, p.gold >= task.target ? task.count : 0);
        if ((rec.progress || 0) >= task.count) {
          rec.done = true;
          rec.progress = task.count;
          p.tasksJSON = writeJson(tasks); // 先落库，防止重复奖励
          this.grantReward(p, task);      // grantReward 不再回调 checkAllTasks
          progressed = true;
          break; // 本轮处理一个，下一轮重新读取最新，避免连坐递归
        }
      }
      if (!progressed) break;
    }
  }
  private grantReward(p: any, task: any) {
    const r = task.reward || {};
    if (r.gold) this.setGold(p, p.gold + r.gold);
    if (r.xp) this.applyXp(p, r.xp);
    if (r.items) {
      const inv = readJson(p.inventoryJSON);
      for (const id in r.items) inv[id] = (inv[id] || 0) + r.items[id];
      p.inventoryJSON = writeJson(inv);
    }
  }

  // 击杀怪物：key 必须属于服务端怪物表(MONSTER_DEFS)，经验由服务端 def.xp 决定，
  // 拒绝客户端上报的任意 xp/key，避免伪造击杀刷经验。
  private handleKill(client: any, msg: any) {
    const p = this.playerOf(client);
    if (!p) return;
    const key = msg && msg.key;
    const def = MONSTER_DEFS.find((d: any) => d.key === key);
    if (!def) return;
    this.updateTask(p, "kill", key);
    if (def.xp) this.applyXp(p, def.xp);
    this.checkAllTasks(p);
  }

  // 回合制战斗胜利: 服务端权威结算
  //  - 仅信任怪物 key(校验属于 MONSTER_DEFS), 经验/掉落由服务端生成, 杜绝客户端作弊上报
  //  - 玩家承受伤害做上限钳制(≤ 怪物攻击×20), 并经 totalDef 减免后扣血
  private handleBattleWin(client: any, msg: any) {
    const p = this.playerOf(client);
    if (!p || p.hp <= 0) return;
    const key = msg && msg.key;
    const def = MONSTER_DEFS.find((d: any) => d.key === key);
    if (!def) return;
    const taken = Math.min(Number(msg && msg.taken) || 0, (def.atk || 0) * 20);
    if (taken > 0) {
      const dmg = Math.max(1, taken - this.totalDef(p));
      p.hp = Math.max(0, p.hp - dmg);
    }
    this.updateTask(p, "kill", key);
    if (def.xp) this.applyXp(p, def.xp);
    this.checkAllTasks(p);
    // 服务端决定掉落(不信任客户端上报的 loot)
    if (def.drops && def.drops.length && Math.random() < (def.dropChance ?? 0.6)) {
      const itemId = def.drops[(Math.random() * def.drops.length) | 0];
      this.state.groundItems.push(new GroundItem().assign({
        id: "g_loot_" + (++lootCounter),
        itemId,
        x: Math.max(20, Math.min(2400, p.x)),
        y: Math.max(20, Math.min(2000, p.y)),
        mapId: p.mapId || "world",
      }));
    }
  }
}
