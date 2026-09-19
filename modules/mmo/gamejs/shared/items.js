// items.js —— 物品目录（数据来自 gamejs/config/items.json，供前端 UI 与后端经济共用）
// 价格/效果/装备槽/LPC 图层等均为纯数据；名称/描述已内置于 JSON。
import itemsData from "../config/items.json";

export const ITEMS = itemsData.items;
export const SHOP_STOCK = itemsData.shopStock;
export const DEFAULT_GOLD = itemsData.defaultGold;
export const GROUND_SPAWNS = itemsData.groundSpawns;

// 装备槽定义(顺序即装备栏显示顺序)。服饰/配件槽通过 item.mv 关联到 MV 角色合成图层。
export const EQUIP_SLOTS = [
  { key: "weapon", labelKey: "eq.weapon" },
  { key: "helmet", labelKey: "eq.helmet" },
  { key: "armor",  labelKey: "eq.armor" },
  { key: "shield", labelKey: "eq.shield" },
  { key: "clothing", labelKey: "eq.clothing" },
  { key: "outer",    labelKey: "eq.outer" },
  { key: "cloak",    labelKey: "eq.cloak" },
  { key: "acca",     labelKey: "eq.acca" },
  { key: "accb",     labelKey: "eq.accb" },
  { key: "glasses",  labelKey: "eq.glasses" },
  { key: "ears",     labelKey: "eq.ears" },
  { key: "tail",     labelKey: "eq.tail" },
  { key: "wing",     labelKey: "eq.wing" },
  { key: "facial",   labelKey: "eq.facial" },
];

// 商店分类定义(顺序即 tab 显示顺序);match 命中一个物品即归入该类
// 服饰按装备槽(MV 图层)细分，便于浏览
export const SHOP_CATS = [
  { key: "consumable", labelKey: "cat.consumable", match: (it) => !it.slot },
  { key: "weapon",     labelKey: "cat.weapon",     match: (it) => it.slot === "weapon" },
  { key: "shield",     labelKey: "cat.shield",     match: (it) => it.slot === "shield" },
  { key: "armor",      labelKey: "cat.armor",      match: (it) => it.slot === "armor" },
  { key: "helmet",     labelKey: "cat.helmet",     match: (it) => it.slot === "helmet" },
  { key: "clothing",   labelKey: "cat.top",        match: (it) => it.mv && it.slot === "clothing" },
  { key: "outer",      labelKey: "cat.outer",      match: (it) => it.mv && it.slot === "outer" },
  { key: "cloak",      labelKey: "cat.cloak",      match: (it) => it.mv && it.slot === "cloak" },
  { key: "acca",       labelKey: "cat.acca",       match: (it) => it.mv && it.slot === "acca" },
  { key: "accb",       labelKey: "cat.accb",       match: (it) => it.mv && it.slot === "accb" },
  { key: "glasses",    labelKey: "cat.glasses",    match: (it) => it.mv && it.slot === "glasses" },
  { key: "ears",       labelKey: "cat.ears",       match: (it) => it.mv && it.slot === "ears" },
  { key: "tail",       labelKey: "cat.tail",       match: (it) => it.mv && it.slot === "tail" },
  { key: "wing",       labelKey: "cat.wing",       match: (it) => it.mv && it.slot === "wing" },
  { key: "facial",     labelKey: "cat.facial",     match: (it) => it.mv && it.slot === "facial" },
];

// 商店每个分类最多展示的商品数（消耗品不限）。
// 武器/服饰/配件类只保留"最便宜的 N 种"并按价格升序，便于新手选购；其余商品暂不上架。
export const SHOP_LIMIT_PER_CAT = 3;

// 商店实际售卖的分类(只含非空,按 SHOP_CATS 顺序)
// - 非消耗品每类最多 SHOP_LIMIT_PER_CAT 种、按价格升序
// - 同名款式(男/女两版共用名称，如"兽耳一")合并为一种；传入 gender 时优先该性别的版本
export function shopCategories(gender) {
  return SHOP_CATS
    .map((c) => {
      let ids = SHOP_STOCK.filter((id) => c.match(ITEMS[id]));
      if (c.key !== "consumable") {
        ids = [...ids].sort((a, b) => (ITEMS[a].buy || 0) - (ITEMS[b].buy || 0));
        const byName = new Map();
        for (const id of ids) {
          const name = ITEMS[id].name;
          if (!byName.has(name)) { byName.set(name, id); continue; }
          const g = ITEMS[id].mv && ITEMS[id].mv.gender;
          if (gender && g === gender) byName.set(name, id); // 同款优先选玩家性别的版本
        }
        ids = [...byName.values()]
          .sort((a, b) => (ITEMS[a].buy || 0) - (ITEMS[b].buy || 0))
          .slice(0, SHOP_LIMIT_PER_CAT);
      }
      return { key: c.key, labelKey: c.labelKey, ids };
    })
    .filter((c) => c.ids.length > 0);
}

// 依据已穿戴服饰/配件(equipped:{slot:itemId})，把对应 MV 图层覆盖到基础外观 cfg 上。
// 返回值可直接传给 buildMvCharacter。性别不匹配的条目自动跳过。
export function applyEquippedAppearance(cfg, equipped) {
  const out = {
    gender: (cfg && cfg.gender) || "Male",
    skin: cfg && cfg.skin,
    colors: { ...((cfg && cfg.colors) || {}) },
    layers: { ...((cfg && cfg.layers) || {}) },
  };
  if (equipped) {
    for (const slot in equipped) {
      const item = ITEMS[equipped[slot]];
      if (!item || !item.mv) continue;
      if (item.mv.gender && out.gender && item.mv.gender !== out.gender) continue;
      out.layers[item.mv.layer] = item.mv.num;
    }
  }
  return out;
}
