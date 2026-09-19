// face.js —— 头像(face)合成器 + 脸部部件编号清单
// RPG Maker 素材 generator/Face/{gender}/ 下的部件文件,按顺序叠加合成头部特写。
// 命名: FG_<部件>_p<NN>_c1_m<变体>.png (取默认 c1 通道)。
import { fetchBitmap } from "../lpc/imageLoader.js";

const F_DIR = "/api/game-assets/mmo/generator/Face/";
const p2 = (n) => String(n).padStart(2, "0");
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// 各部件默认通道的 m 变体(从素材目录核实,c1 主色)
const CH = {
  Face: "m001", Eyes: "m002", Eyebrows: "m003", Nose: "m001", Mouth: "m001",
  Ears: "m001", BeastEars: "m006", FrontHair: "m003", RearHair1: "m003",
  Beard: "m003", FacialMark: "m005",
};

// 第二套素材(同 character.vue 的 extra): 耳朵存在 FG_BeastEars, 优先用它,
// 否则兽耳类道具(num>2)在 FG_Ears(仅 p01/p02)下会 404 而完全不显示
const EXTRA = { Ears: "BeastEars" };

// 每一性别各部件可用编号(按素材目录确认;Female 无 Beard/FacialMark 较少)
const NUMS = {
  Male: {
    Eyes: range(1, 27), Eyebrows: range(1, 19), Nose: range(1, 13), Mouth: range(1, 15),
    Ears: range(1, 6), FrontHair: range(1, 17), RearHair1: range(1, 18),
    Face: range(1, 12), Beard: range(1, 11), FacialMark: range(1, 8),
  },
  Female: {
    Eyes: range(1, 20), Eyebrows: range(1, 10), Nose: range(1, 13), Mouth: range(1, 13),
    Ears: range(1, 6), FrontHair: range(1, 15), RearHair1: range(1, 20),
    Face: range(1, 7), Beard: [], FacialMark: range(1, 7),
  },
};

// 该性别某脸部部件的可用编号;key 兼容创建页用键(FrontHair1->FrontHair)
export function faceNums(gender, key) {
  const tv = key === "FrontHair1" ? "FrontHair" : key === "RearHair1" ? "RearHair1" : key;
  return (NUMS[gender] || {})[tv] || [];
}

// 部件素材地址
export function faceUrl(gender, tv, num) {
  return `${F_DIR}${gender}/FG_${tv}_p${p2(num)}_c1_${CH[tv] || "m001"}.png`;
}
// 某部件在指定性别/编号下的候选素材地址(按优先级):
// 1) 默认色道 _c1_<m通道>  2) 无通道(部分素材如女性面纹 p01/p02 没有 _m 后缀)
export function facePartUrls(gender, part, num) {
  const base = `${F_DIR}${gender}/FG_${part}_p${p2(num)}_c1`;
  return [`${base}_${CH[part] || "m001"}.png`, `${base}.png`];
}
export async function faceSpriteImg(gender, tv, num, size = 30) {
  const cv = await fetchBitmap(faceUrl(gender, tv, num));
  if (!cv) return null;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;
  x.drawImage(cv, 0, 0, size, size);
  return c.toDataURL();
}

// 按配置逐层叠加合成一张头部特写(自底向上),返回 canvas;失败返回 null
export async function buildFaceAvatar(gender, layers = {}) {
  // 合成顺序: 脸底 → 后发 → 耳朵 → 眼睛 → 眉 → 鼻 → 嘴 → 面纹 → 胡子 → 前发(最上)
  const order = ["Face", "RearHair1", "Ears", "Eyes", "Eyebrows", "Nose", "Mouth", "FacialMark", "Beard", "FrontHair"];
  const imgs = [];
  for (const k of order) {
    const tv = k;
    const keyL = k === "Face" ? "Face" : k === "FrontHair" ? "FrontHair1" : k;
    const raw = layers[keyL];
    // 显式"无"(null/undefined)时跳过该层
    if (k !== "Face" && raw == null) continue;
    const n = k === "Face" ? 1 : raw;
    const nums = (NUMS[gender] || {})[tv] || [];
    if (!nums.includes(n)) continue;
    // 优先第二套素材(如耳朵的 FG_BeastEars), 再回退主素材; 每项依次尝试 m 通道 → 无通道
    const cands = [...(EXTRA[tv] ? facePartUrls(gender, EXTRA[tv], n) : []), ...facePartUrls(gender, tv, n)];
    let cv = null;
    for (const u of cands) { cv = await fetchBitmap(u); if (cv) break; }
    if (cv) imgs.push(cv);
  }
  if (!imgs.length) return null;
  const W = imgs[0].width, H = imgs[0].height;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  for (const im of imgs) x.drawImage(im, 0, 0);
  return c;
}