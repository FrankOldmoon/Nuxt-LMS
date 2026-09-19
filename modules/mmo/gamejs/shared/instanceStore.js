// instanceStore.js —— 教师编排副本的运行时注册表(客户端)
// 主 MMO 场景(world/indoor…)保持不变; 副本作为独立 mapId("inst_<id>")在玩家选择进入时
// 动态注册到本表, 并由 MapScene 即时 add 一个同款场景实例后 scene.start 进入。
import { t } from "../i18n.js";

export const instanceStore = {
  // mapId -> 完整地图配置(含 npcs / monsters / doors / _tasks)
  maps: {},
  // 当前班级可用副本列表(来自 /api/mmo/instances)
  list: [],

  setList(arr) { this.list = Array.isArray(arr) ? arr : []; },

  // 把教师 JSON 编译为 MapScene 可直接消费的地图配置
  register(inst, mapId) {
    mapId = mapId || ("inst_" + inst.id);
    const mc = inst.map || {};
    this.maps[mapId] = {
      type: "instance",
      file: mc.file,
      // 底图纹理 key 带上 mapId, 避免与同名 tileset 的其它地图(如 world)共用 key 互相覆盖
      tex: (mc.tex || "rpg") + "_" + mapId,
      spawn: mc.spawn || [10, 12],
      name: inst.name || mc.name || t("game.instanceDefault"),
      features: mc.features || { npc: true, monsters: true },
      doors: (mc.doors || []).map((d) => ({ tile: d.tile, tiles: d.tiles, to: d.to, spawn: d.spawn })),
      // 副本专属 NPC(带上 map 字段, 让 spawnNPCs 正确落到本图)
      npcs: (inst.npcs || []).map((n) => ({ ...n, map: mapId })),
      // 怪物落点(供 spawnMonsters 使用)
      monsters: (inst.monsters || []).map((m) => ({ key: m.key, tile: m.tile })),
      _tasks: inst.tasks || [],
    };
    return mapId;
  },

  getMap(mapId) { return this.maps[mapId]; },
};
