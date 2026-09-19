// characterConfig.js —— 角色外观配置(MV 风格: TVD 分层)
// 单人与多人场景共用;外观由 gender + 各分层编号 + 可选调色 + 肤色组成。
import { MV_PANEL_CATS, MV_GENDERS, availableNums, loadManifest, SKIN_GRADIENTS, PRESET_COLORS } from "../rpg/buildMvCharacter.js";

// 默认外观配置(MV 分层编号)。注意 Ears 留空：耳朵属于"兽耳饰品"，只能靠道具/装备获得，
// 初始外观不应自带耳朵（Face 与 Body 视图都不渲染耳朵层）。
export const DEFAULT_CFG = {
  gender: "Male",
  layers: { Body: 1, Clothing1: 1, Clothing2: 13, Face: 1, Eyes: 1, Nose: 1, Mouth: 1, Eyebrows: 1, Ears: null, FrontHair1: null, FrontHair2: null, RearHair1: null, RearHair2: null },
  colors: {},        // {cat: hex|null}
  skin: null,        // null=原肤色
};

// 男女默认外套(切性别时套用)
export const DEFAULT_OUTFIT = {
  Male: { Clothing1: 1, Clothing2: 13 },   // 男默认 TV_Clothing2_p13
  Female: { Clothing1: 16, Clothing2: null }, // 女默认 TV_Clothing1_p16
};
export function applyOutfit(layers, gender) {
  const o = DEFAULT_OUTFIT[gender];
  if (!o) return;
  if (o.Clothing1 !== undefined) layers.Clothing1 = o.Clothing1;
  if (o.Clothing2 !== undefined) layers.Clothing2 = o.Clothing2;
}

// 面板类别(供角色创建页 / 外观设置用)
export const MV_CATS_PANEL = MV_PANEL_CATS;

// 随机一组 MV 外观(必选 Body;其余可选分层有概率留空)
// 排除 Ears：耳朵属于兽耳饰品，创建页不提供该选项，随机也不应自带
const RANDOM_EXCLUDE = new Set(["Ears"]);
export async function randomMvCfg() {
  const cfg = { gender: MV_GENDERS[Math.floor(Math.random() * MV_GENDERS.length)], layers: {}, colors: {}, skin: null };
  await loadManifest();
  for (const c of MV_CATS_PANEL) {
    if (RANDOM_EXCLUDE.has(c.key)) continue;
    const nums = await availableNums(cfg.gender, c.key);
    if (!nums.length) continue;
    if (c.required) cfg.layers[c.key] = nums[0];
    else if (nums.some((n) => n) && Math.random() < 0.8) cfg.layers[c.key] = nums[Math.floor(Math.random() * nums.length)];
  }
  return cfg;
}

// 幂等补全: 保证必选分层存有有效编号
export async function ensureMvCfg(cfg = {}) {
  const out = {
    gender: MV_GENDERS.includes(cfg.gender) ? cfg.gender : "Male",
    layers: { ...cfg.layers }, colors: { ...cfg.colors }, skin: cfg.skin || null,
  };
  await loadManifest();
  for (const c of MV_CATS_PANEL) {
    if (!c.required) continue;
    const nums = await availableNums(out.gender, c.key);
    if (nums.length && !out.layers[c.key]) out.layers[c.key] = nums[0];
  }
  return out;
}

// 以可序列化结构存储(供存档/网络传输)
export function serialize(cfg = {}) {
  return { gender: cfg.gender || "Male", layers: { ...(cfg.layers || {}) }, colors: { ...(cfg.colors || {}) }, skin: cfg.skin || null };
}

/* 皮肤选项(仅取色板,无文案) */
export const MV_SKIN_GRADIENTS = SKIN_GRADIENTS;
export const MV_COLORS = PRESET_COLORS;