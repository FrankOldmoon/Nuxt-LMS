/* buildMvCharacter.js —— RPG Maker MV 风格角色合成器(移植 new_tilesets/js/character.js)
 * 用 assets/mmo/generator/TV/{gender}/TV_*.png 分层合成 4 方向行走图。
 * 输出与 AnimatedCharacter 兼容:sheets[walk] = 画布, layout[walk] = {frames:[4], cell:48},
 * 其中每行(0..3)按 DIRECTIONS 顺序 = up/left/down/right。
 * 素材在运行时通过 fetch 加载(不能用 import.meta.glob),数量清单来自 TV/manifest.json。
 */
import { fetchBitmap } from "../lpc/imageLoader.js";

export const BASE_GEN = "/api/game-assets/mmo/generator/TV/";
export const TV_CELL = 48;      // MV 行走图单格边长
export const TV_FRAME_W = 3;    // 每方向 3 帧(循环动画)

/* 官方图层顺序(底->顶);tv 为 TV 视图前缀。None 类(可留空)用 pre=null 表示面板可选"无"。 */
export const MV_CATS = [
  { key: "Body",      tv: "Body",      depth: 0, required: true },
  { key: "Clothing1", tv: "Clothing1", depth: 1 },
  { key: "Clothing2", tv: "Clothing2", depth: 2 },
  { key: "RearHair2", tv: "RearHair2", depth: 3 },
  { key: "RearHair1", tv: "RearHair1", depth: 5 },
  { key: "FrontHair1",tv: "FrontHair1",depth: 10 },
  { key: "FrontHair2",tv: "FrontHair2",depth: 11 },
  { key: "Cloak1",    tv: "Cloak1",    depth: 12 },
  { key: "Cloak2",    tv: "Cloak2",    depth: 13 },
  { key: "AccA",      tv: "AccA",      depth: 14 },
  { key: "Glasses",   tv: "Glasses",   depth: 15 },
  { key: "AccB",      tv: "AccB",      depth: 16 },
  { key: "FacialMark",tv: "FacialMark",depth: 17 },
  { key: "Beard",     tv: "Beard1",    depth: 18 },
  { key: "Ears",      tv: "Ears",      extra: "BeastEars", depth: 19 },
  { key: "Tail",      tv: "Tail1",     depth: 21 },
  { key: "Wing",      tv: "Wing1",     depth: 22 },
].sort((a, b) => a.depth - b.depth);

/* 面板类别(必选 Body + 可留空的可选分层) */
export const MV_PANEL_CATS = MV_CATS.filter((c) => c.key !== "RearHair2" && c.key !== "FrontHair2");

export const MV_GENDERS = ["Male", "Female", "Kid"];

/* 可调色类别 */
export const MV_COLORABLE = ["Clothing1", "Clothing2", "RearHair1", "RearHair2", "FrontHair1", "FrontHair2", "Cloak1", "Cloak2", "AccA", "Glasses", "AccB", "Beard", "Ears", "Tail", "Wing"];

/* 肤色渐变预设 */
export const SKIN_GRADIENTS = ['#f9e3d0', '#f6c8a0', '#f0be94', '#e8b08a', '#dda076', '#d6986b', '#c98a60', '#c0805a', '#b0704a', '#9c5a38', '#8a5a3a', '#70401f', '#5a3018'];
const PRESET_COLORS = [null, '#f0f0f0', '#303030', '#8a5a3a', '#c0805a', '#d6986b',
  '#e8b08a', '#f6c8a0', '#f2c14e', '#e8903a', '#c05030', '#a02050',
  '#b35a98', '#8a7ad8', '#5a7ad8', '#3a90d8', '#2ab0a0', '#3a9a4a',
  '#90a830', '#b07030', '#7a4a2a', '#d8d8b0'];
export { PRESET_COLORS };

let _manifest = null;

/* 加载 TV/manifest.json(缓存)。
 * 仅在浏览器端 fetch(相对路径);SSR/非浏览器无 window,直接返回空,避免相对 URL 解析失败。 */
export async function loadManifest() {
  if (_manifest) return _manifest;
  if (typeof window === "undefined") return (_manifest = {});
  const res = await fetch(BASE_GEN + "manifest.json");
  if (!res.ok) return (_manifest = {});
  _manifest = await res.json();
  return _manifest;
}

/* 该性别可用的编号列表;返回 category key -> [nums] */
export async function availableNums(gender, key) {
  const m = await loadManifest();
  const cat = MV_CATS.find((c) => c.key === key);
  if (!cat) return [];
  const n = m[gender] && m[gender][cat.tv];
  return n || [];
}

/* RGB<->HSL(肤色/调色用) */
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}
export function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = f(h + 1 / 3); g = f(h); b = f(h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
function targetHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return rgbToHsl(r, g, b);
}

/* 对图层染色:保留 alpha 与明暗纹理,色相/饱和对齐目标色,亮度保留 */
function tintLayer(img, hex) {
  const w = img.width, h = img.height;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, w, h);
  const d = id.data;
  const [tH, tS] = targetHsl(hex);
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 20) continue;
    const [hh, ss, ll] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    const [nr, ng, nb] = hslToRgb(tH, tS, ll);
    d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
  }
  x.putImageData(id, 0, 0);
  return c;
}

/* 对画布应用肤色(疑似肤色像素按明暗映射到目标肤色) */
export function applySkinToCanvas(cv, hex) {
  const ctx = cv.getContext("2d");
  const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = imgData.data;
  const [tH, tS, tL] = targetHsl(hex);
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 20) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (!(r > g && g > b)) continue;
    if (!(r > 50 && b > 20)) continue;
    const [hh, ss, ll] = rgbToHsl(r, g, b);
    if (!(hh >= 8 && hh <= 50 && ss >= 15 && ss <= 75 && ll >= 20 && ll <= 90)) continue;
    const nl = ll / 100;
    const scale = 0.5 + nl * 0.5;
    const newL = tL * scale;
    const [nr, ng, nb] = hslToRgb(tH, tS, Math.min(Math.max(newL, 3), 96));
    // 混合皮肤色与像素,避免过度锐化
    const mix = 0.9;
    d[i] = nr * mix + r * (1 - mix);
    d[i + 1] = ng * mix + g * (1 - mix);
    d[i + 2] = nb * mix + b * (1 - mix);
  }
  ctx.putImageData(imgData, 0, 0);
  return cv;
}

/* 生成一张 MV 行走图层 TV_{pre}_p{num}[_c] 的源图 */
async function loadLayer(gender, pre, num) {
  return fetchBitmap(`${BASE_GEN}${gender}/TV_${pre}_p${String(num).padStart(2, "0")}.png`);
}

/* 部件素材按"可见朝向"出图：MV 生成器导出的每个部件只在它实际可见的朝向有画面，
 * 空行是**刻意的**（前发在背面不可见、后发正面不可见、内衬被外套挡住…），所以默认**原样使用**。
 * 实测掩码(下/左/右/上)：Body `####`、Clothing2 `####`、FrontHair1/RearHair2/Glasses `###.`、
 * RearHair1/FrontHair2 `...#`、Clothing1 `.##.`。
 *
 * 唯一例外：翅膀/尾巴/披风这类"挂在背后的配件"素材常常**只有背面视图**(`...#`)，
 * 于是四个朝向里只有"朝上"能看到它。按约定改为「只在朝下时显示」：把那行素材挪到第 1 行(下)，
 * 其余朝向留空，并标记 behind=true 画在身体**下层**（否则会盖住人物正面）。 */
const BACK_ATTACH = new Set(["Wing", "Tail", "Cloak1", "Cloak2"]);
function normalizeLayer(key, img) {
  const w = img && img.width, h = img && img.height;
  if (!BACK_ATTACH.has(key) || !w || !h || h % 4 !== 0) return { img, behind: false };
  const fh = h / 4;
  const probe = document.createElement("canvas");
  probe.width = w; probe.height = h;
  const px = probe.getContext("2d");
  px.drawImage(img, 0, 0);
  const counts = [];
  for (let r = 0; r < 4; r++) {
    const d = px.getImageData(0, r * fh, w, fh).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++;
    counts.push(n);
  }
  const filled = counts.filter((n) => n > 0).length;
  if (filled !== 1 || counts[3] === 0) return { img, behind: false }; // 非"只有背面视图" → 原样
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 3 * fh, w, fh, 0, 0, w, fh); // 背面那行 → 第 1 行(朝下)，其余留空
  return { img: out, behind: true };
}

/* 依据外观配置合成行走图。
 * cfg = { gender, skin, colors:{cat:hex}, layers:{cat:num} }
 * 返回 { walk: canvas, layout: { frames:[4], cell: TV_CELL } }(兼容 AnimatedCharacter);
 * 同时返回原版 TV 秩序画布 full(层级已按 rows=down/left/right/up 排好,供调试)。 */
export async function buildMvCharacter(cfg) {
  const gender = cfg.gender || "Male";
  const layers = cfg.layers || {};
  const colors = cfg.colors || {};

  // 逐层(官方顺序)加载非空分层
  const stack = [];   // 按官方层序(会画在身体之上)
  const behind = [];  // "背后"的部件(翅膀/披风/后发/尾巴) → 先画，位于身体下层
  await loadManifest();
  for (const c of MV_CATS) {
    let num = layers[c.key];
    if (num === undefined || num === null || num === 0 || num === "none") continue;
    // 耳朵有第二套素材(BeastEars, 见 character.vue 的 extra): 优先用它以区分不同耳型,
    // 再退回 TV_Ears(仅存在 p02 一张), 避免不同耳型渲染成同一张 / 404
    let img = null;
    if (c.extra) img = await loadLayer(gender, c.extra, num);
    if (!img) img = await loadLayer(gender, c.tv, num);
    if (!img && c.key === "Ears") img = await loadLayer(gender, "Ears", 2);
    if (!img) continue;
    const color = colors[c.key];
    const norm = normalizeLayer(c.key, color ? tintLayer(img, color) : img);
    (norm.behind ? behind : stack).push(norm.img);
  }
  if (!stack.length && !behind.length) return null;

  // 合成基础行走图(3 列 × 4 行 = down/left/right/up)
  const fw = TV_CELL, fh = TV_CELL;
  const w = fw * 3, h = fh * 4;
  const full = document.createElement("canvas");
  full.width = w; full.height = h;
  const fctx = full.getContext("2d");
  // 先画"背后"的部件(翅膀/披风/后发/尾巴)到下层，再按官方层序画身体与其余部件
  for (const im of behind) fctx.drawImage(im, 0, 0);
  for (const im of stack) fctx.drawImage(im, 0, 0);
  if (cfg.skin) applySkinToCanvas(full, cfg.skin);

  // 重排行序为 AnimatedCharacter 的 DIRECTIONS=[up,left,down,right]
  // MV 行序:0=down,1=left,2=right,3=up
  const srcRows = { up: 3, left: 1, down: 0, right: 2 };
  const order = ["up", "left", "down", "right"];
  const reorderRows = () => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    order.forEach((dir, r) => {
      const sy = srcRows[dir] * fh;
      ctx.drawImage(full, 0, sy, w, fh, 0, r * fh, w, fh);
    });
    return c;
  };
  const walk = reorderRows();

  // idle:每方向取中间站立帧(第 1 列)复制为 3 帧,保持静止呼吸
  const idle = document.createElement("canvas");
  idle.width = w; idle.height = h;
  const ictx = idle.getContext("2d");
  order.forEach((_dir, r) => {
    for (let col = 0; col < 3; col++) {
      ictx.drawImage(walk, TV_CELL, r * fh, TV_CELL, fh, col * TV_CELL, r * fh, TV_CELL, fh);
    }
  });

  return {
    sheets: { walk, idle },
    layout: {
      walk: { frames: [3, 3, 3, 3], cell: TV_CELL },
      idle: { frames: [3, 3, 3, 3], cell: TV_CELL },
    },
    layoutMode: "mv",
    full,
    walk,
    idle,
    face: full,
  };
}