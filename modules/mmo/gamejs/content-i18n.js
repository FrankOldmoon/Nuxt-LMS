// content-i18n.js —— 内容文案（物品 / NPC / 任务 / 地图）语言切换
// 中文为 config/*.json 内置原文；英文见同目录 *.en.json（按 id/key 覆盖）。
// 切换时原地改写被 import 的单例对象，所有引用（ITEMS / NPCS / TASKS / MAPS）立即生效。
import items from "./config/items.json";
import itemsEn from "./config/items.en.json";
import npcs from "./config/npcs.json";
import npcsEn from "./config/npcs.en.json";
import tasks from "./config/tasks.json";
import tasksEn from "./config/tasks.en.json";
import maps from "./config/maps.json";
import mapsEn from "./config/maps.en.json";

let applied = null;

function swapFields(obj, enObj, fields) {
  if (!obj) return;
  for (const f of fields) {
    const keep = "__i18n_" + f;
    if (obj[keep] === undefined) obj[keep] = obj[f];
    obj[f] = enObj && enObj[f] !== undefined ? enObj[f] : obj[keep];
  }
}

export function applyContentLang(lang) {
  if (applied === lang) return;
  applied = lang;
  const enMode = lang === "en";

  for (const id in items.items) swapFields(items.items[id], enMode ? itemsEn[id] : null, ["name", "desc"]);
  for (const id in maps.maps) swapFields(maps.maps[id], enMode ? mapsEn[id] : null, ["name"]);
  for (const task of tasks.tasks) swapFields(task, enMode ? tasksEn[task.id] : null, ["name", "desc"]);

  for (const npc of npcs.npcs) {
    const enNpc = enMode ? npcsEn[npc.key] : null;
    swapFields(npc, enNpc, ["name"]);
    if (npc.__i18n_lines === undefined) npc.__i18n_lines = npc.lines;
    npc.lines = enNpc && enNpc.lines ? enNpc.lines : npc.__i18n_lines;
  }
}
