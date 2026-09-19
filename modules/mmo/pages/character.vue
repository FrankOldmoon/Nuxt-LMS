<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

definePageMeta({ layout: false })

const { t } = useI18n()

/* RPG Maker MV 角色生成器 —— 官方素材 + 三视图同步预览 + 序列帧动画
 * 素材结构: generator/{TV,TVD,Face,SV,Variation}/{Male,Female,Kid}/
 * 命名规则: {前缀}_{类别}_p{编号}[_c{配色}][_m{蒙版}].png
 * 官方图层顺序(底->顶):
 *   Body -> Clothing1 -> Clothing2 -> RearHair1 -> RearHair2
 *   -> FrontHair1 -> FrontHair2 -> Cloak1 -> Cloak2
 *   -> AccA -> Glasses -> AccB
 *   + 附加层: Beard / Ears / FacialMark / BeastEars / Tail / Wing
 */

/* ---------- 素材索引：运行时通过 game-assets-list 接口枚举全部 png ----------
 * 素材已移至项目根目录 game_assets(不参与构建打包);启动时拉取文件清单,
 * 再通过 /api/game-assets/* 按需加载。pngs: 相对路径 -> 完整 URL。 */
const pngs = {};
async function loadPngIndex() {
  const res = await fetch('/api/game-assets-list?dir=mmo/generator');
  const data = await res.json();
  for (const rel of (data.files || [])) {
    if (/\.png$/i.test(rel)) pngs[rel] = data.root + rel;
  }
}

/* 类别定义：key 统一类别名，tv/face/sv 为该类别在各视图的文件前缀
 * required=true 表示必须有（不提供"无"，随机/清空都保留）
 * 面部类别(face 专属)仅影响头像/战斗图，行走图无对应素材自动跳过 */
const CATS = [
  { key: 'Body',       labelKey: 'mmo.character.catBody',      tv: 'TV_Body',      face: 'FG_Body',       sv: 'SV_Body',       depth: 0, required: true },
  { key: 'Clothing1',  labelKey: 'mmo.character.catClothing1', tv: 'TV_Clothing1', face: 'FG_Clothing1',  sv: 'SV_Clothing1',  depth: 1 },
  { key: 'Clothing2',  labelKey: 'mmo.character.catClothing2', tv: 'TV_Clothing2', face: 'FG_Clothing2',  sv: 'SV_Clothing2',  depth: 2 },
  { key: 'RearHair2',  labelKey: 'mmo.character.catRearHair2', tv: 'TV_RearHair2', face: 'FG_RearHair2',  sv: 'SV_RearHair2',  depth: 3 },
  { key: 'Face',       labelKey: 'mmo.character.catFace',      tv: null,           face: 'FG_Face',       sv: null,            depth: 4, required: true },
  { key: 'RearHair1',  labelKey: 'mmo.character.catRearHair1', tv: 'TV_RearHair1', face: 'FG_RearHair1',  sv: 'SV_RearHair1',  depth: 5 },
  { key: 'Eyebrows',   labelKey: 'mmo.character.catEyebrows',  tv: null,           face: 'FG_Eyebrows',   sv: null,            depth: 6, required: true },
  { key: 'Eyes',       labelKey: 'mmo.character.catEyes',      tv: null,           face: 'FG_Eyes',       sv: null,            depth: 7, required: true },
  { key: 'Nose',       labelKey: 'mmo.character.catNose',      tv: null,           face: 'FG_Nose',       sv: null,            depth: 8, required: true },
  { key: 'Mouth',      labelKey: 'mmo.character.catMouth',     tv: null,           face: 'FG_Mouth',      sv: null,            depth: 9, required: true },
  { key: 'FrontHair1', labelKey: 'mmo.character.catFrontHair1',tv: 'TV_FrontHair1',face: 'FG_FrontHair',  sv: 'SV_FrontHair',  depth: 10 },
  { key: 'FrontHair2', labelKey: 'mmo.character.catFrontHair2',tv: 'TV_FrontHair2',face: null,            sv: null,            depth: 11 },
  { key: 'Cloak1',     labelKey: 'mmo.character.catCloak1',    tv: 'TV_Cloak1',    face: 'FG_Cloak1',     sv: 'SV_Cloak1',     depth: 12 },
  { key: 'Cloak2',     labelKey: 'mmo.character.catCloak2',    tv: 'TV_Cloak2',    face: 'FG_Cloak2',     sv: 'SV_Cloak2',     depth: 13 },
  { key: 'AccA',       labelKey: 'mmo.character.catAccA',      tv: 'TV_AccA',      face: 'FG_AccA',       sv: 'SV_AccA',       depth: 14 },
  { key: 'Glasses',    labelKey: 'mmo.character.catGlasses',   tv: 'TV_Glasses',   face: 'FG_Glasses',    sv: 'SV_Glasses',    depth: 15 },
  { key: 'AccB',       labelKey: 'mmo.character.catAccB',      tv: 'TV_AccB',      face: 'FG_AccB',       sv: 'SV_AccB',       depth: 16 },
  { key: 'Beard',      labelKey: 'mmo.character.catBeard',     tv: 'TV_Beard1',    face: 'FG_Beard',      sv: 'SV_Beard',      depth: 17 },
  { key: 'Ears',       labelKey: 'mmo.character.catEars',      tv: 'TV_Ears',      face: 'FG_Ears',       sv: 'SV_Ears',       extra: { TV: 'TV_BeastEars', Face: 'FG_BeastEars', SV: 'SV_BeastEars' }, depth: 18 },
  { key: 'Tail',       labelKey: 'mmo.character.catTail',      tv: 'TV_Tail1',     face: null,            sv: 'SV_Tail',       depth: 21 },
  { key: 'Wing',       labelKey: 'mmo.character.catWing',      tv: 'TV_Wing1',     face: null,            sv: 'SV_Wing',       depth: 22 },
];
CATS.sort((a, b) => a.depth - b.depth);

/* 从候选列表选一张可叠加的图层图
 * Face: 取 _c1_m*（彩色透明成品）；其余视图: 取基础版（无 _c，透明剪影） */
function pickLayer(cands) {
  if (!cands.length) return null;
  if (cands[0].view === 'Face') {
    return cands.find(o => o.color === 1) || cands[0];
  }
  return cands.find(o => o.color === null) || cands[0];
}

/* 视图定义 */
const VIEWS = {
  TV:   { labelKey: 'mmo.character.viewTV',   w: 144, h: 192, cols: 3, rows: 4, dirs: true },
  Face: { labelKey: 'mmo.character.viewFace', w: 144, h: 144, cols: 1, rows: 1, dirs: false },
  SV:   { labelKey: 'mmo.character.viewSV',   w: 576, h: 384, cols: 3, rows: 4, dirs: false },
};

/* 战斗图基础层：直接使用 generator/battle_{gender}.png 作为人物底图 */
const SV_BASE_URL = {
  Male: '/api/game-assets/mmo/generator/battle_male.png',
  Female: '/api/game-assets/mmo/generator/battle_female.png',
  Kid: '/api/game-assets/mmo/generator/battle_kid.png',
};

/* ---------- 解析路径 -> {view, gender, catName, num, color, url} ---------- */
function parse(path) {
  // .../generator/{VIEW}/{GENDER}/{PREFIX}_{CAT}_p{NN}[_c{col}][_m{mask}].png
  const m = path.match(/generator\/([A-Za-z]+)\/(Male|Female|Kid)\/([A-Za-z0-9_]+?)\.png$/);
  if (!m) return null;
  const [, view, gender, base] = m;
  const pm = base.match(/^(?:[A-Za-z]+_|FG_|SV_|icon_)([A-Za-z0-9]+)_p(\d+)(?:_c(\d*))?(?:_m(\d+))?$/);
  if (!pm) return null;
  return {
    view, gender, catName: pm[1], num: +pm[2],
    color: pm[3] === undefined ? null : (pm[3] === '' ? 1 : +pm[3]),
    url: pngs[path]
  };
}

/* 建立索引: view -> gender -> catKey -> entry[]（在素材清单加载完成后调用） */
const index = {};
function buildIndex() {
  for (const path in pngs) {
    const e = parse(path);
    if (!e || e.view === 'Variation') continue;
    // 匹配类别：主前缀 + extra 前缀（如 BeastEars 归入 Ears）
    const cat = CATS.find(c => {
      const pre = c[e.view.toLowerCase()];
      const list = [pre].filter(Boolean);
      if (c.extra && c.extra[e.view]) list.push(c.extra[e.view]);
      return list.map(p => p.replace(/^[A-Za-z]+_/, '')).includes(e.catName);
    });
    if (!cat) continue;
    (index[e.view] = index[e.view] || {})[e.gender] = index[e.view]?.[e.gender] || {};
    (index[e.view][e.gender][cat.key] = index[e.view][e.gender][cat.key] || []).push(e);
  }
}

/* 该视图的类别顺序（官方图层顺序） */
function catListForView(view) {
  return CATS.filter(c => {
    const pre = c[view.toLowerCase()];
    return pre;
  });
}

/* 属性面板类别：行走图(TV)类别 + 面部必有的 required 类别（供头像/战斗图用） */
function panelCatList() {
  // 合并分层：后发2/前发2 不在面板单独显示（与 后发1/前发1 共用同款编号）
  return CATS.filter(c => (c.tv || c.required) && !HIDE_KEYS.includes(c.key));
}

/* 分层合并：后发2跟随后发1、前发2跟随前发1（同款式 = 同编号） */
const MERGE_KEYS = { RearHair2: 'RearHair1', FrontHair2: 'FrontHair1' };
const HIDE_KEYS = ['RearHair2', 'FrontHair2'];

/* 设置某个选择；若它是分层主层（如后发1），同步设置次层同名编号（后发2） */
function setSelection(key, num) {
  state.sel[key] = { num };
  // 若 key 是主层，把所有映射到它的次层同步
  for (const [subKey, mainKey] of Object.entries(MERGE_KEYS)) {
    if (mainKey === key) {
      const hasNum = (index['TV']?.[state.gender]?.[subKey] || []).some(o => o.num === num);
      if (hasNum) state.sel[subKey] = { num };
    }
  }
}

/* 视图性别（Kid 部分类别可能缺素材） */
const GENDERS = ['Male', 'Female', 'Kid'];

/* ---------- 图片缓存 ---------- */
let imgCache = {};
function loadImg(url) {
  return new Promise((res, rej) => {
    if (imgCache[url]) return res(imgCache[url]);
    const im = new Image();
    im.onload = () => { imgCache[url] = im; res(im); };
    im.onerror = rej;
    im.src = url;
  });
}

/* ---------- 状态 ---------- */
let state = { gender: 'Male', sel: {}, skin: null, colors: {} };

/* 肤色渐变预设（浅 -> 深） */
const SKIN_GRADIENTS = ['#f9e3d0', '#f6c8a0', '#f0be94', '#e8b08a', '#dda076', '#d6986b', '#c98a60', '#c0805a', '#b0704a', '#9c5a38', '#8a5a3a', '#70401f', '#5a3018'];

/* 可调色类别 & 预设色板（从 gradients.png 风格提取的常用色） */
const COLOR_PRESETS = [
  null, '#f0f0f0', '#303030', '#8a5a3a', '#c0805a', '#d6986b',
  '#e8b08a', '#f6c8a0', '#f2c14e', '#e8903a', '#c05030', '#a02050',
  '#b35a98', '#8a7ad8', '#5a7ad8', '#3a90d8', '#2ab0a0', '#3a9a4a',
  '#90a830', '#b07030', '#7a4a2a', '#d8d8b0'
];
const COLORABLE_KEYS = ['Clothing1', 'Clothing2', 'RearHair1', 'RearHair2', 'FrontHair1', 'FrontHair2',
  'Cloak1', 'Cloak2', 'AccA', 'Glasses', 'AccB', 'Beard', 'Ears', 'FacialMark', 'BeastEars', 'Tail', 'Wing'];

/* ---------- 渲染属性面板（行走图类别 + 面部必选类别） ---------- */
let propsEl;
let scrollPos = {};   // 记录各类别横向滚动位置
function renderProps() {
  // 记录当前各类别滚动位置（按 data-key）
  for (const s of propsEl.querySelectorAll('.opt-scroll')) {
    if (s.dataset.key) scrollPos[s.dataset.key] = s.scrollLeft;
  }
  const catList = panelCatList();
  propsEl.innerHTML = '';
  for (const c of catList) {
    const group = document.createElement('div');
    group.className = 'cat-group';
    // 面板缩略图素材：有 TV 用 TV；否则用 Face（如脸型/眼睛等面部类）
    const srcView = c.tv ? 'TV' : 'Face';
    const opts = index[srcView]?.[state.gender]?.[c.key] || [];
    const nums = [...new Set(opts.map(o => o.num))].sort((a, b) => a - b);

    const title = document.createElement('div');
    title.className = 'cat-title';
    const span = document.createElement('span');
    span.textContent = t(c.labelKey);
    const cnt = document.createElement('span');
    cnt.className = 'count';
    cnt.textContent = `${nums.length} ${t('mmo.character.countSuffix')}`;
    title.append(span, cnt);
    group.appendChild(title);

    const scroll = document.createElement('div');
    scroll.className = 'opt-scroll';
    scroll.dataset.key = c.key;
    // 必选类别（身体/脸型/眼睛/眉毛/鼻子/嘴巴）不提供"无"选项
    if (!c.required) {
      const noneBtn = document.createElement('button');
      noneBtn.className = 'opt none' + (!state.sel[c.key] ? ' active' : '');
      noneBtn.textContent = t('mmo.character.none');
      noneBtn.onclick = () => { state.sel[c.key] = null; renderProps(); renderAll(); };
      scroll.appendChild(noneBtn);
    }

    for (const num of nums) {
      const btn = document.createElement('button');
      btn.className = 'opt';
      const sel = state.sel[c.key];
      if (sel && sel.num === num) btn.classList.add('active');
      const th = pickLayer(opts.filter(o => o.num === num));
      const img = document.createElement('img');
      img.src = th ? th.url : '';
      img.alt = num;
      btn.appendChild(img);
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = num;
      btn.appendChild(tag);
      btn.onclick = () => { setSelection(c.key, num); renderProps(); renderAll(); };
      scroll.appendChild(btn);
    }
    group.appendChild(scroll);

    // 脸型类别：加肤色渐变条（浅->深），替代原先顶部独立肤色按钮
    if (c.key === 'Face') {
      const skinRow = document.createElement('div');
      skinRow.className = 'skin-gradient';
      const skinLab = document.createElement('span');
      skinLab.className = 'skin-grad-label';
      skinLab.textContent = t('mmo.character.skin');
      skinRow.appendChild(skinLab);
      // 原色（不染色）
      const origBtn = document.createElement('button');
      origBtn.className = 'copt orig' + (state.skin === null ? ' active' : '');
      origBtn.title = t('mmo.character.originalSkin');
      origBtn.onclick = () => { state.skin = null; renderProps(); renderAll(); };
      skinRow.appendChild(origBtn);
      for (const col of SKIN_GRADIENTS) {
        const sb = document.createElement('button');
        sb.className = 'copt' + (state.skin === col ? ' active' : '');
        sb.style.background = col;
        sb.title = col;
        sb.onclick = () => {
          state.skin = col;
          renderProps(); renderAll();
        };
        skinRow.appendChild(sb);
      }
      group.appendChild(skinRow);
    }

    // 可调色类别：加颜色 swatch 行
    if (COLORABLE_KEYS.includes(c.key)) {
      const colorRow = document.createElement('div');
      colorRow.className = 'color-scroll';
      for (const col of COLOR_PRESETS) {
        const cbs = document.createElement('button');
        cbs.className = 'copt' + (state.colors[c.key] === col ? ' active' : '');
        if (col) {
          cbs.style.background = col;
          cbs.title = col;
        } else {
          cbs.classList.add('orig');
          cbs.title = t('mmo.character.originalColor');
        }
        cbs.onclick = () => {
          state.colors[c.key] = col;   // null = 原色
          renderProps(); renderAll();
        };
        colorRow.appendChild(cbs);
      }
      group.appendChild(colorRow);
    }

    propsEl.appendChild(group);
  }
  // 恢复各类别横向滚动位置
  requestAnimationFrame(() => {
    for (const s of propsEl.querySelectorAll('.opt-scroll')) {
      if (s.dataset.key && scrollPos[s.dataset.key] !== undefined) {
        s.scrollLeft = scrollPos[s.dataset.key];
      }
    }
  });
}

/* 对图层染色：保留 alpha 与明暗纹理，色相/饱和对齐目标色 */
function tintLayer(img, hex) {
  if (!hex) return img;
  const w = img.width, h = img.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, w, h);
  const d = id.data;
  const [tH, tS] = targetSkinHSL(hex);
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 20) continue;
    const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    // 目标色相/饱和，保留原亮度
    const [nr, ng, nb] = hslToRgb(tH, tS, l);
    d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
  }
  x.putImageData(id, 0, 0);
  return c;
}

/* ---------- 获取某视图的待叠加图层列表 ---------- */
async function buildLayers(view) {
  const catList = catListForView(view);
  const layers = [];
  // 战斗图基础层：先用 battle_{gender}.png 铺底，再叠配饰，保证有人物本体
  if (view === 'SV') {
    const baseUrl = SV_BASE_URL[state.gender];
    if (baseUrl) layers.push(await loadImg(baseUrl));
  }
  for (const c of catList) {
    const sel = state.sel[c.key];
    if (!sel) continue;
    const cands = (index[view]?.[state.gender]?.[c.key] || []).filter(o => o.num === sel.num);
    if (!cands.length) continue;
    const layer = pickLayer(cands);
    if (!layer) continue;
    const img = await loadImg(layer.url);
    const color = state.colors[c.key];
    layers.push(color ? tintLayer(img, color) : img);
  }
  return { imgs: layers, viewDef: VIEWS[view] };
}

/* ---------- 三个画布 ---------- */
let cvTV, ctxTV;
let cvFace, ctxFace;
let cvSV, ctxSV;
let metaEl;

let cached = {};
let animTimer = null, animRunning = false, dir = 0, frame = 0;

/* 绘制行走图整张（方向 row, 指定帧 f，0-2）到 ctx，画布尺寸 w x h */
function drawTVFrame(ctx, w, h, dirRow, f) {
  const { imgs, viewDef } = cached.TV || { imgs: [] };
  const fw = viewDef.w / viewDef.cols, fh = viewDef.h / viewDef.rows;
  ctx.clearRect(0, 0, w, h);
  for (const im of imgs) {
    const sx = f * fw, sy = dirRow * fh;
    ctx.drawImage(im, sx, sy, fw, fh, 0, 0, w, h);
  }
  applySkin(ctx, w, h, state.skin);
}

/* 绘制静态完整画布（整图） */
function drawStatic(ctx, view, w, h) {
  const { imgs, viewDef } = cached[view] || { imgs: [] };
  ctx.clearRect(0, 0, w, h);
  imgs.forEach(im => ctx.drawImage(im, 0, 0, w, h));
}

/* ---------- 肤色重着色 ---------- */
/* RGB -> HSL */
function rgbToHsl(r, g, b) {
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
/* HSL -> RGB */
function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
/* 目标肤色 HSL（由主色计算） */
function targetSkinHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return rgbToHsl(r, g, b);
}
/* 对某画布应用肤色：判定肤色像素并按其亮度映射到目标肤色（保留光影） */
function applySkin(ctx, w, h, hex) {
  if (!hex) return;   // null = 使用素材原肤色，不染色
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const tH = targetSkinHSL(hex)[0];
  const tS = targetSkinHSL(hex)[1];
  const tL = targetSkinHSL(hex)[2];
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 20) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    // 肤色判定：色相一致(10-45°)、饱和度中等、亮度中上，R>G>B
    if (!(r > g && g > b)) continue;
    if (!(r > 50 && b > 20)) continue;
    const [h, s, l] = rgbToHsl(r, g, b);
    if (!(h >= 8 && h <= 50 && s >= 15 && s <= 75 && l >= 20 && l <= 90)) continue;
    // 用原像素亮度映射到目标肤色，保留明暗纹理
    const nl = l / 100;
    const scale = 0.5 + nl * 0.5;           // 亮度映射比例
    const newL = tL * scale;                  // 目标 L 按原明暗缩放
    const [ nr, ng, nb ] = hslToRgb(tH, tS, Math.min(Math.max(newL, 3), 96));
    d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
  }
  ctx.putImageData(imgData, 0, 0);
}

/* 渲染全部视图 */
async function renderAll() {
  cached = {};
  try {
    for (const view of ['TV', 'Face', 'SV']) {
      cached[view] = await buildLayers(view);
    }
  } catch (e) { console.error('render error', e); }

  cvTV.width = VIEWS.TV.w; cvTV.height = VIEWS.TV.h;
  drawStatic(ctxTV, 'TV', cvTV.width, cvTV.height);
  applySkin(ctxTV, cvTV.width, cvTV.height, state.skin);
  cvFace.width = VIEWS.Face.w; cvFace.height = VIEWS.Face.h;
  drawStatic(ctxFace, 'Face', cvFace.width, cvFace.height);
  applySkin(ctxFace, cvFace.width, cvFace.height, state.skin);
  cvSV.width = VIEWS.SV.w; cvSV.height = VIEWS.SV.h;
  drawStatic(ctxSV, 'SV', cvSV.width, cvSV.height);
  applySkin(ctxSV, cvSV.width, cvSV.height, state.skin);

  if (animRunning) drawTVFrame(ctxTV, cvTV.width, cvTV.height, dir, frame);

  const genderLabel = state.gender === 'Male' ? t('mmo.character.male')
    : state.gender === 'Female' ? t('mmo.character.female') : t('mmo.character.kid');
  metaEl.textContent = [
    `${t('mmo.character.gender')}: ${genderLabel}`,
    ...panelCatList().map(c => {
      const sel = state.sel[c.key];
      return sel ? `${t(c.labelKey)} #${sel.num}` : null;
    }).filter(Boolean)
  ].join('  ');
}

/* ---------- 随机（可选类别随机，required 类强制选中） ---------- */
function randomize() {
  const catList = panelCatList();
  for (const c of catList) {
    // required 类（身体/脸型/眼睛/眉毛/鼻子/嘴巴）：从对应视图取素材并强制选中
    const srcView = c.required ? (c.tv ? 'TV' : 'Face') : 'TV';
    const opts = index[srcView]?.[state.gender]?.[c.key] || [];
    const nums = [...new Set(opts.map(o => o.num))].sort((a, b) => a - b);
    if (!nums.length) { state.sel[c.key] = null; continue; }
    if (c.required) { setSelection(c.key, nums[Math.floor(Math.random() * nums.length)]); continue; }
    if (Math.random() < 0.15) { state.sel[c.key] = null; continue; }
    setSelection(c.key, nums[Math.floor(Math.random() * nums.length)]);
  }
  renderProps();
  renderAll();
}

/* ---------- 序列帧动画（播放行走图 4 方向循环） ---------- */
const DIRS = [0, 1, 2, 3];   // 下 左 右 上
let dirIdx = 0;
function toggleAnim() {
  const btn = document.getElementById('btnAnim');
  if (animRunning) {
    stopAnim();
    btn.classList.remove('playing');
    btn.textContent = t('mmo.character.anim');
  } else {
    dir = 0; frame = 0; dirIdx = 0;
    animRunning = true;
    btn.classList.add('playing');
    btn.textContent = t('mmo.character.stopAnim');
    const step = () => {
      if (!animRunning) return;
      dir = DIRS[dirIdx % DIRS.length];
      drawTVFrame(ctxTV, cvTV.width, cvTV.height, dir, frame % 3);
      frame++;
      if (frame % 3 === 0) dirIdx++;
      animTimer = setTimeout(step, 160);
    };
    step();
  }
}
function stopAnim() {
  animRunning = false;
  if (animTimer) { clearTimeout(animTimer); animTimer = null; }
  drawStatic(ctxTV, 'TV', cvTV.width, cvTV.height);
}

/* ---------- 导出 ---------- */
function exportPng() {
  const views = ['TV', 'Face', 'SV'];
  const totalH = views.reduce((s, v) => s + VIEWS[v].h, 0) + 40;
  const w = VIEWS.SV.w;
  const out = document.createElement('canvas');
  out.width = w; out.height = totalH;
  const octx = out.getContext('2d');
  octx.fillStyle = '#000'; octx.fillRect(0, 0, w, totalH);
  let yy = 0;
  octx.drawImage(cvTV, 0, yy); yy += VIEWS.TV.h + 10;
  octx.drawImage(cvFace, 0, yy); yy += VIEWS.Face.h + 10;
  octx.drawImage(cvSV, 0, yy);
  const a = document.createElement('a');
  a.download = `character_${state.gender}.png`;
  a.href = out.toDataURL('image/png');
  a.click();
}

/* 确保所有 required 类有选中值（缺失则取第一个） */
function ensureRequired() {
  for (const c of CATS) {
    if (!c.required) continue;
    if (state.sel[c.key]) continue;
    const srcView = c.tv ? 'TV' : 'Face';
    const opts = index[srcView]?.[state.gender]?.[c.key] || [];
    const nums = [...new Set(opts.map(o => o.num))].sort((a, b) => a - b);
    if (nums.length) setSelection(c.key, nums[0]);
  }
}

/* ---------- 生命周期：DOM 绑定 + 初始化 ---------- */
onMounted(async () => {
  propsEl = document.getElementById('props');
  cvTV = document.getElementById('cvTV'); ctxTV = cvTV.getContext('2d');
  cvFace = document.getElementById('cvFace'); ctxFace = cvFace.getContext('2d');
  cvSV = document.getElementById('cvSV'); ctxSV = cvSV.getContext('2d');
  metaEl = document.getElementById('meta');

  document.getElementById('genderSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#genderSeg button').forEach(x => x.classList.toggle('active', x === b));
    state.gender = b.dataset.v;
    ensureRequired();
    renderProps(); renderAll();
  });
  document.getElementById('btnAnim').addEventListener('click', toggleAnim);
  document.getElementById('btnRandom').addEventListener('click', randomize);
  document.getElementById('btnExport').addEventListener('click', exportPng);
  document.getElementById('btnClearAll').addEventListener('click', () => {
    stopAnim();
    document.getElementById('btnAnim').classList.remove('playing');
    document.getElementById('btnAnim').textContent = t('mmo.character.anim');
    for (const c of CATS) if (!c.required) state.sel[c.key] = null;   // required 类保留
    state.colors = {};   // 重置全部颜色为原色
    ensureRequired();
    renderProps(); renderAll();
  });

  /* ---------- 初始化 ---------- */
  // 素材已移至根目录 game_assets(不打包): 先拉取素材清单再构建索引
  await loadPngIndex();
  buildIndex();
  // required 类（身体/脸型/眼睛/眉毛/鼻子/嘴巴）必须有：默认选第一个
  ensureRequired();
  renderProps();
  renderAll();
})

onBeforeUnmount(() => {
  stopAnim();
  if (animTimer) { clearTimeout(animTimer); animTimer = null; }
})
</script>

<template>
  <div class="char-page">
  <header>
    <h1>{{ $t('mmo.character.title') }}</h1>
    <div class="seg" id="genderSeg">
      <button data-v="Male" class="active">{{ $t('mmo.character.male') }}</button>
      <button data-v="Female">{{ $t('mmo.character.female') }}</button>
      <button data-v="Kid">{{ $t('mmo.character.kid') }}</button>
    </div>
  </header>
  <main>
    <div id="props"></div>
    <div id="view">
      <div class="preview-row">
        <div class="preview-col">
          <div class="preview-label">{{ $t('mmo.character.viewTV') }}</div>
          <div class="preview-box"><canvas id="cvTV"></canvas></div>
        </div>
        <div class="preview-col">
          <div class="preview-label">{{ $t('mmo.character.viewFace') }}</div>
          <div class="preview-box"><canvas id="cvFace"></canvas></div>
        </div>
        <div class="preview-col">
          <div class="preview-label">{{ $t('mmo.character.viewSV') }}</div>
          <div class="preview-box"><canvas id="cvSV"></canvas></div>
        </div>
      </div>
      <div class="actions">
        <button id="btnAnim">{{ $t('mmo.character.anim') }}</button>
        <button id="btnRandom">{{ $t('mmo.character.random') }}</button>
        <button id="btnExport">{{ $t('mmo.character.exportPng') }}</button>
        <button class="ghost" id="btnClearAll">{{ $t('mmo.character.clearAll') }}</button>
      </div>
      <div id="meta"></div>
    </div>
  </main>
  </div>
</template>

<style>
  :root {
    --bg: #14161c; --panel: #1d2129; --panel2: #232833; --border: #333a47;
    --text: #dce3ee; --muted: #8b95a5; --accent: #4aa3ff; --sel: #2a5c8f;
  }
  * { box-sizing: border-box; margin: 0; }
  .char-page {
    height: 100vh;
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: var(--bg); color: var(--text);
    display: flex; flex-direction: column; overflow: hidden;
  }
  header {
    display: flex; align-items: center; gap: 16px; padding: 10px 18px;
    background: var(--panel); border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  header h1 { font-size: 16px; font-weight: 600; }
  .seg { display: flex; gap: 4px; background: var(--panel2); border-radius: 6px; padding: 3px; }
  .seg button {
    border: 0; background: transparent; color: var(--muted);
    padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;
  }
  .seg button.active { background: var(--sel); color: #fff; }
  .skin-seg { display: flex; align-items: center; gap: 6px; }
  .skin-label { font-size: 13px; color: var(--muted); margin-right: 2px; }
  .skin-seg button {
    width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border);
    cursor: pointer; padding: 0;
  }
  .skin-seg button.active { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(74,163,255,.4); }
  main { flex: 1; min-height: 0; display: flex; overflow: hidden; }
  /* 属性面板 */
  #props {
    width: 330px; background: var(--panel); border-right: 1px solid var(--border);
    overflow-y: auto; padding: 12px; flex-shrink: 0;
  }
  .cat-group { margin-bottom: 14px; }
  .cat-title {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 13px; color: var(--muted); margin-bottom: 6px;
  }
  .cat-title .count { font-size: 11px; color: #5b6577; }
  .opt-scroll {
    display: flex; gap: 6px; overflow-x: auto; padding: 2px;
  }
  .opt {
    width: 44px; height: 44px; flex-shrink: 0; border: 2px solid var(--border);
    border-radius: 6px; background: var(--panel2); cursor: pointer;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    padding: 0; position: relative;
  }
  .opt img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
  .opt .tag {
    position: absolute; left: 2px; top: 2px; font-size: 8px; color: #fff;
    background: rgba(0,0,0,0.55); padding: 0 3px; border-radius: 3px;
  }
  .opt.active { border-color: var(--accent); }
  .opt.none { font-size: 10px; color: var(--muted); }
  .color-scroll { display: flex; gap: 4px; margin-top: 5px; padding-left: 2px; flex-wrap: wrap; }
  .copt {
    width: 18px; height: 18px; border-radius: 4px; border: 2px solid var(--border);
    cursor: pointer; padding: 0; flex-shrink: 0;
  }
  .copt.orig { background: repeating-linear-gradient(45deg, #666 0 2px, #222 2px 4px); }
  .copt.active { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(74,163,255,.35); }
  .skin-gradient { display: flex; align-items: center; gap: 4px; margin-top: 5px; flex-wrap: wrap; }
  .skin-grad-label { font-size: 11px; color: var(--muted); margin-right: 2px; white-space: nowrap; }
  /* 预览区：三个视图并排 */
  #view {
    flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center;
    justify-content: flex-start;
    position: relative; padding: 16px; gap: 12px; overflow: auto;
  }
  .preview-row {
    display: flex; gap: 20px; align-items: flex-start; justify-content: center;
    flex-wrap: wrap;
  }
  .preview-col { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .preview-label { font-size: 12px; color: var(--muted); }
  .preview-box {
    background: linear-gradient(135deg, #20242e 25%, transparent 25%) 0 0/24px 24px,
                linear-gradient(225deg, #20242e 25%, transparent 25%) 0 0/24px 24px,
                linear-gradient(315deg, #20242e 25%, transparent 25%) 0 0/24px 24px,
                linear-gradient(45deg, #20242e 25%, transparent 25%) 0 0/24px 24px,
                #181c24;
    border: 1px solid var(--border); border-radius: 10px; padding: 10px;
    image-rendering: pixelated; line-height: 0;
  }
  canvas { image-rendering: pixelated; display: block; }
  #meta {
    font-size: 12px; color: var(--muted);
    background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
    padding: 8px 10px; max-width: 700px; word-break: break-all; line-height: 1.5;
  }
  .actions { display: flex; gap: 8px; }
  .actions button {
    border: 0; border-radius: 6px; padding: 8px 16px; font-size: 13px; cursor: pointer;
    background: var(--accent); color: #fff;
  }
  .actions button.ghost { background: var(--panel2); color: var(--text); border: 1px solid var(--border); }
  .actions button.playing { background: #e05a5a; }
  /* 滚动条 */
  ::-webkit-scrollbar { height: 8px; width: 8px; }
  ::-webkit-scrollbar-thumb { background: #3a4252; border-radius: 4px; }
</style>
