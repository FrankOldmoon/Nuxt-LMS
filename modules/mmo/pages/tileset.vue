<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'

const { t } = useI18n()

definePageMeta({ layout: false })

/* ============ 官方常量与自动瓦片表（复用共享模块 ../gamejs/tile-draw.js，与 render.js 一致） ============ */
import {
    TILE, TILE_ID_A1, TILE_ID_A5, TILE_ID_A2, TILE_ID_A3, TILE_ID_A4, TILE_ID_MAX,
    isA1, isA2, isA3, isA4, isAutotile, isVisible, autotileKind,
    drawTile, buildPassGrid, autotileQuads, normalTileSource, D_UP, D_DOWN, D_LEFT, D_RIGHT
} from '../gamejs/tile-draw.js';

/* 地牢随机生成（与 scripts/gen-dungeon-map.mjs 共用同一套逻辑） */
import { generateDungeon, listWallBases, listFloorTiles } from '../gamejs/rpg/dungeonGen.js';

/* ============ 图集定义（与 Tilesets.json 的 id 对应） ============ */
const FAMILIES = [
  { id: 1, labelKey: 'famWorld',    names: ['World_A1','World_A2','','','','World_B','World_C'] },
  { id: 2, labelKey: 'famOutside',  names: ['Outside_A1','Outside_A2','Outside_A3','Outside_A4','Outside_A5','Outside_B','Outside_C'] },
  { id: 3, labelKey: 'famInside',   names: ['Inside_A1','Inside_A2','','Inside_A4','Inside_A5','Inside_B','Inside_C'] },
  { id: 4, labelKey: 'famDungeon',  names: ['Dungeon_A1','Dungeon_A2','','Dungeon_A4','Dungeon_A5','Dungeon_B','Dungeon_C'] },
  { id: 5, labelKey: 'famSfOutside', names: ['Outside_A1','Outside_A2','SF_Outside_A3','SF_Outside_A4','SF_Outside_A5','SF_Outside_B','SF_Outside_C'] },
  { id: 6, labelKey: 'famSfInside', names: ['Inside_A1','Inside_A2','','SF_Inside_A4','SF_Outside_A5','SF_Inside_B','SF_Inside_C'] },
];
/* 类型划分为 A / B / C：A 合并 A1~A5 全部自动瓦片（含 A5 普通地面块） */
const TYPE_DEFS = [
  {
    key: 'A', labelKey: 'typeAuto', layer: 0, sections: [
      { key: 'A1', idx: 0, auto: true,  base: TILE_ID_A1, count: 16,  whoKey: 'whoA1' },
      { key: 'A2', idx: 1, auto: true,  base: TILE_ID_A2, count: 32,  whoKey: 'whoA2' },
      { key: 'A3', idx: 2, auto: true,  base: TILE_ID_A3, count: 32,  whoKey: 'whoA3' },
      { key: 'A4', idx: 3, auto: true,  base: TILE_ID_A4, count: 48,  whoKey: 'whoA4' },
      { key: 'A5', idx: 4, auto: false, base: TILE_ID_A5, count: 128, whoKey: 'whoA5' },
    ]
  },
  {
    key: 'B', labelKey: 'typeDecor', layer: 2, sections: [
      { key: 'B', idx: 5, auto: false, base: 0,   count: 256, whoKey: 'whoB' },
    ]
  },
  {
    key: 'C', labelKey: 'typeUpper', layer: 3, sections: [
      { key: 'C', idx: 6, auto: false, base: 256, count: 256, whoKey: 'whoC' },
    ]
  },
];
/* 该类型在当前图集族下是否有可用图集 */
function isTypeAvailable(fam, type) {
  return type.sections.some(s => fam.names[s.idx]);
}

/* ============ 素材：运行时通过 game-assets API 加载 ============
 * 素材已移至项目根目录 game_assets(不参与构建打包);这里不再用 import.meta.glob 引入,
 * 而是按文件名拼接 /api/game-assets/mmo/tilesets/* 的 URL 在运行时加载。 */
const ASSET_ROOT = '/api/game-assets/mmo/tilesets/';
const txtRaw = {};            // 图集文件名(无扩展) -> 材料清单文本
let TILESETS_DATA = null;     // Tilesets.json 的通行 flags（数组下标 = tilesetId）

/* 预取所有图集材料清单 *.txt 与 Tilesets.json */
async function loadTilesetsData() {
  const wanted = new Set();
  for (const fam of FAMILIES) for (const nm of fam.names) if (nm) wanted.add(nm);
  const jobs = [];
  for (const nm of wanted) {
    jobs.push(fetch(ASSET_ROOT + nm + '.txt').then(r => r.ok ? r.text() : '').then(t => { txtRaw[nm] = t; }).catch(() => { txtRaw[nm] = ''; }));
  }
  jobs.push(fetch(ASSET_ROOT + 'Tilesets.json').then(r => r.ok ? r.text() : '').then(t => { TILESETS_DATA = t ? JSON.parse(t) : null; }).catch(() => { TILESETS_DATA = null; }));
  await Promise.all(jobs);
}

const imgCache = {};
function loadImg(url) {
  return new Promise((res, rej) => {
    if (imgCache[url]) return res(imgCache[url]);
    const im = new Image();
    im.onload = () => { imgCache[url] = im; res(im); };
    im.onerror = () => rej(new Error(t('mmo.tileset.loadFailed') + url));
    im.src = url;
  });
}

/* ============ 状态 ============ */
const state = {
  family: FAMILIES[1],   // 默认室外
  type: TYPE_DEFS[0],    // 默认 A1
  brush: null,           // 当前画笔（信息展示）
  brushes: null,         // 当前所选画笔集合（扁平）
  stamp: null,           // 当前图章块 { rows, cols, cells }（按位置一次性摆放）
  paintIdx: 0,           // 批量绘制时的循环游标
  layer: 0,              // 当前绘制图层 0/2/3
  erase: false,
  showCollision: false,  // 是否叠加显示不可通行碰撞框
};

let MAP_W = 24, MAP_H = 15;
const layers = { 0: null, 2: null, 3: null };
function initGrid() {
  const old = layers;
  for (const z of [0, 2, 3]) {
    const arr = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(0));
    if (old[z]) {
      for (let y = 0; y < Math.min(MAP_H, old[z].length); y++)
        for (let x = 0; x < Math.min(MAP_W, old[z][y].length); x++)
          arr[y][x] = old[z][y][x];
    }
    layers[z] = arr;
  }
}

/* 官方 blob(47) 自动瓦片表：每个 shape(0..46) = 4 个角块编号
 * 依据 8 邻(含对角)同材质判定，得到 4 个角的块编号，查表定位 shape */
const AUTOTILE_BLOCK_TAB = [
  [18,17,14,13],[2,17,14,13],[18,3,14,13],[2,3,14,13],[18,17,14,7],[2,17,14,7],[18,3,14,7],[2,3,14,7],
  [18,17,6,13],[2,17,6,13],[18,3,6,13],[2,3,6,13],[18,17,6,7],[2,17,6,7],[18,3,6,7],[2,3,6,7],
  [16,17,12,13],[16,3,12,13],[16,17,12,7],[16,3,12,7],[10,9,14,13],[10,9,14,7],[10,9,6,13],[10,9,6,7],
  [18,19,14,15],[18,19,6,15],[2,19,14,15],[2,19,6,15],[18,17,22,21],[2,17,22,21],[18,3,22,21],[2,3,22,21],
  [16,19,12,15],[10,9,22,21],[8,9,12,13],[8,9,12,7],[10,11,14,15],[10,11,6,15],[18,19,22,23],[2,19,22,23],
  [16,17,20,21],[16,3,20,21],[8,11,12,15],[8,9,20,21],[16,19,20,23],[10,11,22,23],[8,11,20,23],[0,1,4,5]
];
const AUTOTILE_KEY = AUTOTILE_BLOCK_TAB.map(b => b.join(','));
/* 自动瓦片 shape：返回官方编码。
 * - A3/A4 墙体按官方 4 邻位编码 shape = 15 - (上*2 + 下*8 + 左*1 + 右*4)（WALL 表 0..15）
 * - 其它自动瓦片（A1/A2）用 8 邻 blob 算法，返回官方 FLOOR 表 0..46 编码 */
function cellShape(z, x, y, base) {
  // A4 地面（kind 的 bit3 为 0，即官方 ty%2===0）用 blob 自动连接；A4 墙与 A3 用 4 邻位公式
  const isA4Floor = isA4(base) && (autotileKind(base) & 8) === 0;
  if (isA3(base) || (isA4(base) && !isA4Floor)) {
    // 墙体邻居按同 kind 判定（官方 isSameKindTile），避免差异材质连接受挫
    const kind = autotileKind(base);
    const same = (ox, oy) => {
      const nx = x + ox, ny = y + oy;
      return nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H &&
             layers[z][ny][nx] > 0 && autotileKind(layers[z][ny][nx]) === kind;
    };
    const v = (same(0,-1)?2:0) + (same(0,1)?8:0) + (same(-1,0)?1:0) + (same(1,0)?4:0);
    return 15 - v;
  }
  const same = (ox, oy) => {
    const nx = x + ox, ny = y + oy;
    return nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && layers[z][ny][nx] === base;
  };
  // 8 邻顺序：[0]=左上 [1]=上 [2]=右上 [3]=左 [4]=右 [5]=左下 [6]=下 [7]=右下
  const o = [
    same(-1,-1)?1:0, same(0,-1)?1:0, same(1,-1)?1:0,
    same(-1,0)?1:0,  same(1,0)?1:0,
    same(-1,1)?1:0,  same(0,1)?1:0,  same(1,1)?1:0
  ];
  const blocks = cornerBlocks(o);
  const keyIdx = AUTOTILE_KEY.indexOf(blocks.join(','));
  return keyIdx >= 0 ? keyIdx : 0;
}
/* 由 8 邻判定 4 个角块编号（规范 blob 算法） */
function cornerBlocks(o) {
  const [TL,T,TR,L,R,BL,B,BR] = o.map(v=>!!v);
  const b = [0,0,0,0];
  // 左上（对角 TL 仅在 T、L 同时存在时才参与；T 在而 L 缺时恒为 16）
  if (T && L) b[0] = TL ? 18 : 2;
  else if (T && !L) b[0] = 16;
  else if (!T && L) b[0] = 10;
  else b[0] = TL ? 10 : 8;
  // 右上（对角 TR 仅在 T、R 同时存在时才参与；T 在而 R 缺时恒为 19）
  if (T && R) b[1] = TR ? 17 : 3;
  else if (T && !R) b[1] = 19;
  else if (!T && R) b[1] = 9;
  else b[1] = TR ? 9 : 11;
  // 左下（对角 BL 仅在 B、L 同时存在时才参与；B 在而 L 缺时恒为 12）
  if (B && L) b[2] = BL ? 14 : 6;
  else if (B && !L) b[2] = 12;
  else if (!B && L) b[2] = 22;
  else b[2] = BL ? 22 : 20;
  // 右下（对角 BR 仅在 B、R 同时存在时才参与；B 在而 R 缺时恒为 15）
  if (B && R) b[3] = BR ? 13 : 7;
  else if (B && !R) b[3] = 15;
  else if (!B && R) b[3] = 21;
  else b[3] = BR ? 21 : 23;
  return b;
}
function displayedId(z, x, y) {
  const base = layers[z]?.[y]?.[x] || 0;
  if (!base) return 0;
  return isAutotile(base) ? base + cellShape(z, x, y, base) : base;
}

/* ============ DOM ============ */
const $ = id => document.getElementById(id);
let familySeg, typeSeg, layerSeg;
let paletteEl, brushInfo, brushBlock, posInfo;
let canvas, ctx;
let mapW, mapH;
let waterAnimTimer = null;

/* ============ 调色板 ============ */
let srcImages = new Array(7).fill(null);   // 当前图集族的 7 张图
let sectionsData = [];                     // 当前类型的分区数据 [{section, brushes:[...]}]

async function loadFamily() {
  const fam = state.family;
  srcImages = new Array(7).fill(null);
  const jobs = fam.names.map((nm, i) =>
    nm ? loadImg(ASSET_ROOT + nm + '.png').then(im => { srcImages[i] = im; }).catch(() => {}) : Promise.resolve()
  );
  await Promise.all(jobs);
}

function buildBrushList() {
  const fam = state.family;
  sectionsData = [];
  for (const s of state.type.sections) {
    if (!fam.names[s.idx]) continue;            // 该分区在本族不可用
    const txt = txtRaw[fam.names[s.idx]];
    const names = txt ? txt.split('\n').map(l => l.split('|')[0].trim()).filter(Boolean) : [];
    const brushes = [];
    const start = (!s.auto && s.base === 0) ? 1 : 0;   // B 的 0 号(id0)为空，跳过
    for (let i = start; i < s.count; i++) {
      const baseId = s.auto ? s.base + i * 48 : s.base + i;
      brushes.push({ baseId, auto: s.auto, index: i, name: names[i] || '', section: s });
    }
    sectionsData.push({ section: s, brushes });
  }
}

/* 生成画笔缩略图：40px；自动瓦片用“全连接代表形状”(shape47) 展示自动图形效果 */
function makeThumb(brush) {
  const S = 40;
  const cv2 = document.createElement('canvas');
  cv2.width = S; cv2.height = S;
  const id = brush.auto ? brush.baseId + 47 : brush.baseId;
  drawTile(cv2.getContext('2d'), srcImages, id, 0, 0, 0);
  return cv2;
}

function renderPalette() {
  const curType = state.type;
  brushBlock.innerHTML = '';
  const b = document.createElement('div');
  b.className = 'label';
  b.textContent = `${t('mmo.tileset.' + state.family.labelKey)} / ${t('mmo.tileset.' + curType.labelKey)}`;
  brushBlock.appendChild(b);

  paletteEl.innerHTML = '';
  for (const { section, brushes } of sectionsData) {
    const hd = document.createElement('div');
    hd.className = 'psection';
    hd.textContent = t('mmo.tileset.' + section.whoKey);
    paletteEl.appendChild(hd);
    for (const brush of brushes) {
      const cell = document.createElement('button');
      cell.className = 'ptile';
      cell.dataset.sec = section.key;
      cell.dataset.idx = brush.index;
      const active = state.brushes && state.brushes.some(b => b.baseId === brush.baseId && b.auto === brush.auto);
      if (active) cell.classList.add('active');
      const th = makeThumb(brush);
      cell.appendChild(th);
      const tag = document.createElement('span');
      tag.className = 'ptag';
      tag.textContent = section.key + '#' + brush.index;
      cell.appendChild(tag);
      cell.title = brush.name || `${section.key}#${brush.index}`;
      paletteEl.appendChild(cell);
    }
  }
}

/* 当前所选画笔列表（按位置一次性摆放的“图章”块） */
function currentStamp() {
  return state.stamp && state.stamp.cells;
}

/* 从调色板矩形区域构建“图章”块：cells 为 rows*cols 的一维数组 */
function buildStamp(list, r0, c0, r1, c1) {
  const rows = Math.abs(r1 - r0) + 1, cols = Math.abs(c1 - c0) + 1;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = (c0 + c) + 8 * (r0 + r);
      cells.push(list[idx] || null);
    }
  }
  return { rows, cols, cells };
}

function selectBrushArea(list, r0, c0, r1, c1) {
  const stamp = buildStamp(list, r0, c0, r1, c1);
  if (!stamp.cells.some(Boolean)) return;
  state.stamp = stamp;
  state.brushes = stamp.cells.filter(Boolean);
  state.paintIdx = 0;
  state.brush = state.brushes[state.brushes.length - 1];
  state.layer = state.type.layer;
  updateLayerSeg();
  const multi = stamp.rows > 1 || stamp.cols > 1;
  brushInfo.textContent = multi
    ? t('mmo.tileset.selectedCells', { rows: stamp.rows, cols: stamp.cols })
    : `${state.brush.section.key} #${state.brush.index} ${state.brush.name ? '· ' + state.brush.name : ''}`;
  renderPalette();
}

/* 调色板按住拖选块（可先拖出多列，再往下延伸到这些列的下面几行） */
function brushesOfSection(secKey) {
  const grp = sectionsData.find(g => g.section.key === secKey);
  return grp ? grp.brushes : [];
}

let dragSel = null;                 // { list, anchorCol, anchorRow }
const endDragSel = () => { dragSel = null; };

/* ============ 画布绘制 ============ */
let staticCv = null, waterSet = new Set(), animFrame = 0;
let passGridCache = null;   // 当前地图通行网格（碰撞叠加层用）

/* 当前图集族对应的通行 flags（无则 null） */
function currentFlags() {
  return TILESETS_DATA && TILESETS_DATA[state.family.id] ? TILESETS_DATA[state.family.id].flags : null;
}

function rebuild() {
  canvas.width = MAP_W * TILE; canvas.height = MAP_H * TILE;
  staticCv = document.createElement('canvas');
  staticCv.width = canvas.width; staticCv.height = canvas.height;
  const sctx = staticCv.getContext('2d');
  waterSet = new Set();
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      for (const z of [0, 2, 3]) {
        const id = displayedId(z, x, y);
        if (!id) continue;
        if (isA1(id)) waterSet.add(y * MAP_W + x);
        else drawTile(sctx, srcImages, id, x, y, 0);
      }
    }
  }
  // 依据当前图层 + 通行 flags 重建碰撞网格（供叠加层使用）
  const flags = currentFlags();
  passGridCache = flags ? buildPassGrid(buildMapObject(), flags) : null;
  paintFrame(0);
}

function paintFrame(frame) {
  if (!staticCv) return;   // 图片未加载完成/画布未重建时跳过，避免 drawImage(null) 报错
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(staticCv, 0, 0);
  for (const key of waterSet) {
    const x = key % MAP_W, y = (key / MAP_W) | 0;
    ctx.clearRect(x * TILE, y * TILE, TILE, TILE);
    for (const z of [0, 2, 3]) {
      const id = displayedId(z, x, y);
      if (id) drawTile(ctx, srcImages, id, x, y, frame);
    }
  }
  drawGrid();
  drawCollisionOverlay();
  drawPreview();
}

/* 画布悬停预览：未按下时按图章块整体显示“将要放置”的效果与高亮框 */
let previewPos = null;
let painting = false;
function drawPreview() {
  if (!previewPos || painting || state.erase) return;
  const st = state.stamp;
  if (!st || !st.cells) return;
  ctx.save();
  ctx.globalAlpha = 0.6;
  for (let r = 0; r < st.rows; r++) {
    for (let c = 0; c < st.cols; c++) {
      const b = st.cells[r * st.cols + c];
      if (!b) continue;
      const x = previewPos.x + c, y = previewPos.y + r;
      if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) continue;
      // 自动瓦片用代表形状展示该块效果
      const id = isAutotile(b.baseId) ? b.baseId + 47 : b.baseId;
      drawTile(ctx, srcImages, id, x, y, animFrame);
    }
  }
  ctx.restore();
  const px = previewPos.x * TILE, py = previewPos.y * TILE;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, st.cols * TILE - 2, st.rows * TILE - 2);
}

/* 叠加显示不可通行碰撞框（绿色半透明整格 + 黄色各方向封闭边），与 render.js overlay 一致 */
function drawCollisionOverlay() {
  if (!state.showCollision || !passGridCache) return;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const m = passGridCache[y][x];
      const px = x * TILE, py = y * TILE;
      if (m & (D_UP | D_DOWN | D_LEFT | D_RIGHT)) {
        ctx.fillStyle = 'rgba(0,255,0,0.18)';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,255,0,0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      }
      ctx.strokeStyle = 'rgba(255,255,0,0.9)';
      ctx.lineWidth = 3;
      if (m & D_UP) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + TILE, py); ctx.stroke(); }
      if (m & D_DOWN) { ctx.beginPath(); ctx.moveTo(px, py + TILE); ctx.lineTo(px + TILE, py + TILE); ctx.stroke(); }
      if (m & D_LEFT) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + TILE); ctx.stroke(); }
      if (m & D_RIGHT) { ctx.beginPath(); ctx.moveTo(px + TILE, py); ctx.lineTo(px + TILE, py + TILE); ctx.stroke(); }
    }
  }
}

function drawGrid() {
  if (!showGrid) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= MAP_W; x++) { ctx.moveTo(x * TILE + 0.5, 0); ctx.lineTo(x * TILE + 0.5, canvas.height); }
  for (let y = 0; y <= MAP_H; y++) { ctx.moveTo(0, y * TILE + 0.5); ctx.lineTo(canvas.width, y * TILE + 0.5); }
  ctx.stroke();
}
let showGrid = true;

/* ============ 绘制交互 ============ */
function cellFromEvent(e) {
  const r = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width, sy = canvas.height / r.height;
  const x = Math.floor((e.clientX - r.left) * sx / TILE);
  const y = Math.floor((e.clientY - r.top) * sy / TILE);
  return { x, y };
}
function applyCell(x, y) {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return;
  const z = state.layer;
  if (state.erase) {
    // 擦除时按当前所选面积清除相应大小的块
    const st = state.stamp;
    if (st && st.cells) {
      for (let r = 0; r < st.rows; r++) {
        for (let c = 0; c < st.cols; c++) {
          const mx = x + c, my = y + r;
          if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H) layers[z][my][mx] = 0;
        }
      }
    } else {
      layers[z][y][x] = 0;
    }
  } else {
    // 按图章块整体放置：所有选中瓦片按位置一次性摆放
    const st = state.stamp;
    if (st && st.cells) {
      for (let r = 0; r < st.rows; r++) {
        for (let c = 0; c < st.cols; c++) {
          const b = st.cells[r * st.cols + c];
          if (!b) continue;
          const mx = x + c, my = y + r;
          if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) continue;
          layers[z][my][mx] = b.baseId;
        }
      }
    }
  }
  rebuild();
}

/* ============ 工具栏与导出 ============ */
/* 当前图集族可用的第一个类型（用于切换族后重置默认类型） */
function firstAvailableType(fam) {
  return TYPE_DEFS.find(t => isTypeAvailable(fam, t)) || TYPE_DEFS[0];
}
function updateFamilySeg() {
  familySeg.innerHTML = '';
  const sel = document.createElement('select');
  sel.id = 'familySel';
  for (const fam of FAMILIES) {
    const opt = document.createElement('option');
    opt.value = fam.id;
    opt.textContent = t('mmo.tileset.' + fam.labelKey);
    opt.selected = fam.id === state.family.id;
    sel.appendChild(opt);
  }
  sel.onchange = () => {
    const fam = FAMILIES.find(f => f.id === +sel.value) || FAMILIES[0];
    state.family = fam;
    state.type = firstAvailableType(fam);
    state.brush = null; state.brushes = null; state.stamp = null;
    initType();
  };
  familySeg.appendChild(sel);
}
function updateTypeSeg() {
  typeSeg.innerHTML = '';
  for (const def of TYPE_DEFS) {
    const b = document.createElement('button');
    b.textContent = def.key;
    b.disabled = !isTypeAvailable(state.family, def);
    b.className = def.key === state.type.key ? 'active' : '';
    b.title = t('mmo.tileset.' + def.labelKey);
    b.onclick = () => { state.type = def; state.brush = null; state.brushes = null; state.stamp = null; initType(); };
    typeSeg.appendChild(b);
  }
}
function updateLayerSeg() {
  for (const b of layerSeg.children) b.classList.toggle('active', +b.dataset.z === state.layer);
}

async function initType() {
  // 若当前类型在本族不可用，回退到本族第一个可用类型
  if (!isTypeAvailable(state.family, state.type)) state.type = firstAvailableType(state.family);
  updateFamilySeg();
  updateTypeSeg();
  await loadFamily();
  buildBrushList();
  renderPalette();
  rebuild();
}

/* 地图尺寸变更 */
function applySize() {
  const w = Math.max(2, Math.min(120, +mapW.value || 24));
  const h = Math.max(2, Math.min(120, +mapH.value || 15));
  if (w === MAP_W && h === MAP_H) return;
  MAP_W = w; MAP_H = h;
  initGrid();
  rebuild();
}
/* 清空整个画布：所有图层归零 */
function clearGrid() {
  for (const z of Object.keys(layers)) {
    layers[z] = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(0));
  }
}

/* 碰撞叠加显示开关 */
function toggleCollision() {
  state.showCollision = !state.showCollision;
  const btn = $('btnCollision');
  if (btn) btn.classList.toggle('active', state.showCollision);
  rebuild();
}

/* 构建完整地图对象（6 层：0 下层 / 1 空 / 2 中层 / 3 上层 / 4 5 空） */
function buildMapObject() {
  const n = MAP_W * MAP_H;
  const data = new Array(6 * n).fill(0);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      data[(0 * n) + y * MAP_W + x] = displayedId(0, x, y);
      data[(2 * n) + y * MAP_W + x] = displayedId(2, x, y);
      data[(3 * n) + y * MAP_W + x] = displayedId(3, x, y);
    }
  }
  return {
    autoplayBgm: false, autoplayBgs: false, battleback1Name: '', battleback2Name: '',
    bgm: { name: '', pan: 0, pitch: 100, volume: 90 },
    bgs: { name: '', pan: 0, pitch: 100, volume: 90 },
    disableDashing: false, displayName: '', encounterList: [], encounterStep: 30,
    height: MAP_H, note: '', parallaxLoopX: false, parallaxLoopY: false,
    parallaxName: '', parallaxShow: true, parallaxSx: 0, parallaxSy: 0,
    scrollType: 0, specifyBattleback: false, tilesetId: state.family.id, width: MAP_W,
    data, events: [],
  };
}

/* 下载 JSON（本地导出） */
function exportJSON() {
  const out = buildMapObject();
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Map_Tileset_${MAP_W}x${MAP_H}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* 把地图对象应用到当前画布（自动切换到对应图集族） */
async function applyMapObject(map) {
  const w = map.width, h = map.height, n = w * h;
  MAP_W = w; MAP_H = h;
  mapW.value = w; mapH.value = h;
  // 切换到地图所用图集族
  const fam = FAMILIES.find(f => f.id === map.tilesetId) || state.family;
  state.family = fam;
  state.type = firstAvailableType(fam);
  state.brush = null; state.brushes = null; state.stamp = null;
  await loadFamily();
  buildBrushList();
  updateFamilySeg();
  updateTypeSeg();
  updateLayerSeg();
  renderPalette();
  // 填层（把含 shape 的 tileId 还原成 base，供 autotile 重新连接）
  initGrid();
  const data = map.data || [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      layers[0][y][x] = stripShape(data[(0 * n) + y * w + x] || 0);
      layers[2][y][x] = stripShape(data[(2 * n) + y * w + x] || 0);
      layers[3][y][x] = stripShape(data[(3 * n) + y * w + x] || 0);
    }
  }
  rebuild();
}
/* 把已烘焙 shape 的 tileId 还原成材质 base 编号 */
function stripShape(id) {
  if (!id || id < TILE_ID_A1) return id || 0;
  return id - ((id - TILE_ID_A1) % 48);
}

/* ============ 随机地牢对话框 ============ */
const DUNGEON_FAMILY_ID = 4;   // Dungeon 图集
const genOpen = ref(false);
const genErr = ref('');
const genWalls = ref([]);   // [{ id, style }] 墙候选（A4 三组共 24 个，一律平等不分组）
const genFloors = ref([]);  // [{ id, style }] 地面候选（A5 第3/5/7行共 24 个，一律平等不分组）
const gen = reactive({
  w: 41, h: 30, rooms: 8, seed: 20260919,
  deco: true, decoN: 3,
  wallMode: 'fill',        // fill=非地面全铺墙 / edge=只铺边缘(其余留空)
  voidTile: 0,             // edge 留空格填充：0=透明 / 1536=Darkness(实心)
  wallPairMode: 'single',  // single / topFace / outerInner / mix
  wallA: 0, wallB: 0, floorId: 0,
});

/* 某 tileId 的缩略图 CSS（按图集 + 源矩形做 background-position） */
function tileThumb(id) {
  const fam = FAMILIES.find(f => f.id === DUNGEON_FAMILY_ID);
  let setNumber, sx, sy, sw, sh;
  if (isAutotile(id)) {
    const a = autotileQuads(id, 0);
    setNumber = a.setNumber;
    sx = Math.min(...a.quads.map(q => q.sx));
    sy = Math.min(...a.quads.map(q => q.sy));
    sw = Math.max(...a.quads.map(q => q.sx + q.sw)) - sx;
    sh = Math.max(...a.quads.map(q => q.sy + q.sh)) - sy;
  } else {
    const r = normalTileSource(id);
    setNumber = r.setNumber; sx = r.sx; sy = r.sy; sw = 48; sh = 48;
  }
  const url = ASSET_ROOT + fam.names[setNumber] + '.png';
  const img = imgCache[url];
  const aw = (img && img.naturalWidth) || (setNumber === 4 ? 384 : 768);
  const ah = (img && img.naturalHeight) || (setNumber === 4 ? 768 : 720);
  const S = 40; // 显示尺寸(px)
  return {
    width: S + 'px', height: S + 'px',
    backgroundImage: `url(${url})`,
    backgroundSize: `${aw * (S / 48)}px ${ah * (S / 48)}px`,
    backgroundPosition: `${-sx * (S / 48)}px ${-sy * (S / 48)}px`,
    imageRendering: 'pixelated',
  };
}

/* 打开对话框：预载 Dungeon 图集，构建墙/地面候选；默认尺寸取当前画布 */
async function openGenModal() {
  genErr.value = '';
  gen.w = MAP_W; gen.h = MAP_H;
  gen.rooms = Math.max(3, Math.min(14, Math.round((MAP_W * MAP_H) / 130)));
  genOpen.value = true;
  try {
    const flags = (TILESETS_DATA && TILESETS_DATA[4] && TILESETS_DATA[4].flags) || [];
    const fam = FAMILIES.find(f => f.id === DUNGEON_FAMILY_ID);
    await Promise.all([3, 4].map(i => loadImg(ASSET_ROOT + fam.names[i] + '.png').catch(() => null)));
    genWalls.value = listWallBases(flags).map(id => ({ id, style: tileThumb(id) }));
    genFloors.value = listFloorTiles(flags).map(id => ({ id, style: tileThumb(id) }));
    if (!gen.wallA && genWalls.value[0]) gen.wallA = genWalls.value[0].id;
    if (!gen.wallB) gen.wallB = gen.wallA;
    if (!gen.floorId && genFloors.value[0]) gen.floorId = genFloors.value[0].id;
  } catch (e) {
    genErr.value = String((e && e.message) || e);
  }
}

/* 按对话框设置生成并填入画布 */
async function applyGen() {
  const flags = (TILESETS_DATA && TILESETS_DATA[4] && TILESETS_DATA[4].flags) || [];
  const { map } = generateDungeon({
    width: gen.w, height: gen.h, rooms: gen.rooms, seed: gen.seed || 1,
    deco: gen.deco ? gen.decoN : 0,
    floorId: gen.floorId, wallA: gen.wallA, wallB: gen.wallB,
    wallPairMode: gen.wallPairMode, wallMode: gen.wallMode, voidTile: gen.voidTile,
  }, { flags, meta: null });
  genOpen.value = false;
  await applyMapObject(map);
}

onMounted(async () => {
  /* ============ DOM ============ */
  familySeg = $('familySeg'); typeSeg = $('typeSeg'); layerSeg = $('layerSeg');
  paletteEl = $('palette'); brushInfo = $('brushInfo'); brushBlock = $('brushBlock'); posInfo = $('posInfo');
  canvas = $('cv'); ctx = canvas.getContext('2d');
  mapW = $('mapW'); mapH = $('mapH');

  /* ============ 调色板拖选事件 ============ */
  paletteEl.addEventListener('pointerdown', e => {
    e.preventDefault();
    const cell = e.target.closest('.ptile');
    if (!cell) return;
    const sec = cell.dataset.sec, idx = +cell.dataset.idx;
    const list = brushesOfSection(sec);
    if (!list[idx]) return;
    selectBrushArea(list, Math.floor(idx / 8), idx % 8, Math.floor(idx / 8), idx % 8);
    dragSel = { list, anchorCol: idx % 8, anchorRow: Math.floor(idx / 8) };
    paletteEl.setPointerCapture(e.pointerId);
  });
  paletteEl.addEventListener('pointermove', e => {
    if (!dragSel) return;
    const cell = document.elementFromPoint(e.clientX, e.clientY);
    const hover = cell && cell.closest ? cell.closest('.ptile') : null;
    if (!hover || hover.dataset.sec !== (dragSel.list[0] ? dragSel.list[0].section.key : null)) return;
    const cur = Math.floor((+hover.dataset.idx) / 8), cc = (+hover.dataset.idx) % 8;
    // 矩形：已选列 × 已选行（先横向选列，再向下选这些列的下面几行）
    selectBrushArea(dragSel.list, dragSel.anchorRow, dragSel.anchorCol, cur, cc);
  });
  paletteEl.addEventListener('pointerup', endDragSel);
  paletteEl.addEventListener('pointercancel', endDragSel);

  /* ============ 画布绘制交互 ============ */
  canvas.addEventListener('pointerdown', e => {
    previewPos = null;
    if (e.button === 2) {
      // 右键：按所选面积大小删除相应块，按住可连续擦除
      state.erase = true;
      painting = true;
      const { x, y } = cellFromEvent(e);
      applyCell(x, y);
    }
    else {
      const { x, y } = cellFromEvent(e);
      applyCell(x, y);
      painting = true;
    }
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    const { x, y } = cellFromEvent(e);
    // 更新 header 坐标显示(从左上 0,0 开始, 一个小 tile = 1)
    if (posInfo) posInfo.textContent = t('mmo.tileset.posInfoFmt', { x: Math.max(0, Math.min(MAP_W - 1, x)), y: Math.max(0, Math.min(MAP_H - 1, y)) });
    if (painting) {
      applyCell(x, y);
    } else {
      previewPos = { x, y };
      paintFrame(animFrame);
    }
  });
  canvas.addEventListener('pointerup', () => { painting = false; state.erase = false; });
  canvas.addEventListener('pointerleave', () => { previewPos = null; paintFrame(animFrame); });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  /* ============ 工具栏事件 ============ */
  mapW.addEventListener('change', applySize);
  mapH.addEventListener('change', applySize);

  /* 图层选择 */
  for (const b of layerSeg.children) {
    b.onclick = () => { state.layer = +b.dataset.z; updateLayerSeg(); };
  }

  $('btnClear').onclick = () => { clearGrid(); rebuild(); };
  $('btnCollision').onclick = toggleCollision;
  $('btnJSON').onclick = exportJSON;
  $('btnGenDungeon').onclick = openGenModal;

  /* 导入 JSON：从本地文件读取地图，填入画布 */
  $('btnImport').onclick = () => $('fileImport').click();
  $('fileImport').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const map = JSON.parse(reader.result);
        if (!map || !Array.isArray(map.data)) throw new Error(t('mmo.tileset.invalidMapJson'));
        applyMapObject(map);
      } catch (err) {
        alert(t('mmo.tileset.importFailed') + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  /* 拖拽 JSON 文件加载（直接拖到页面任意处） */
  const dragOverlay = $('dragOverlay');
  let dragDepth = 0;
  const hasJson = (dt) => dt && Array.from(dt.types || []).includes('Files');
  window.addEventListener('dragenter', (e) => {
    if (!hasJson(e.dataTransfer)) return;
    e.preventDefault();
    dragDepth++;
    if (dragOverlay) dragOverlay.classList.add('show');
  });
  window.addEventListener('dragover', (e) => {
    if (!hasJson(e.dataTransfer)) return;
    e.preventDefault();
    if (dragOverlay) dragOverlay.classList.add('show');
  });
  window.addEventListener('dragleave', (e) => {
    if (!hasJson(e.dataTransfer)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0 && dragOverlay) dragOverlay.classList.remove('show');
  });
  window.addEventListener('drop', (e) => {
    if (!hasJson(e.dataTransfer)) return;
    e.preventDefault();
    dragDepth = 0;
    if (dragOverlay) dragOverlay.classList.remove('show');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    if (!/\.json$/i.test(file.name) && file.type !== 'application/json') {
      alert(t('mmo.tileset.dropJsonOnly'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const map = JSON.parse(reader.result);
        if (!map || !Array.isArray(map.data)) throw new Error(t('mmo.tileset.invalidMapJson'));
        applyMapObject(map);
      } catch (err) {
        alert(t('mmo.tileset.importFailed') + err.message);
      }
    };
    reader.readAsText(file);
  });

  /* 导出 PNG */
  $('btnPNG').onclick = () => {
    paintFrame(0);
    canvas.toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `Map_Tileset_${MAP_W}x${MAP_H}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  };

  /* ============ 水动画 ============ */
  waterAnimTimer = setInterval(() => {
    animFrame++;
    paintFrame(animFrame);
  }, 150);

  /* ============ 启动 ============ */
  initGrid();
  updateFamilySeg();
  await loadTilesetsData();   // 先预取材料清单 *.txt / Tilesets.json（运行时加载）
  initType();
});

onBeforeUnmount(() => {
  if (waterAnimTimer) clearInterval(waterAnimTimer);
});
</script>

<template>
  <div class="ts-page">
  <header>
    <h1>{{ $t('mmo.tileset.title') }}</h1>
    <div class="tool">{{ $t('mmo.tileset.width') }} <input class="num" id="mapW" value="24" type="number" min="2" max="120"></div>
    <div class="tool">{{ $t('mmo.tileset.height') }} <input class="num" id="mapH" value="15" type="number" min="2" max="120"></div>
    <div class="tool">{{ $t('mmo.tileset.layer') }}
      <div class="seg" id="layerSeg">
        <button data-z="0" class="active">{{ $t('mmo.tileset.layerLower') }}</button>
        <button data-z="2">{{ $t('mmo.tileset.layerMiddle') }}</button>
        <button data-z="3">{{ $t('mmo.tileset.layerUpper') }}</button>
      </div>
    </div>
    <div id="brushInfo">{{ $t('mmo.tileset.noTileSelected') }}</div>
    <span id="posInfo">{{ $t('mmo.tileset.posInfo') }}</span>
    <span style="flex:1"></span>
    <button class="btn ghost" id="btnCollision" :title="$t('mmo.tileset.showCollisionTip')">{{ $t('mmo.tileset.showCollision') }}</button>
    <button class="btn" id="btnGenDungeon" :title="$t('mmo.tileset.genDungeonTip')">{{ $t('mmo.tileset.genDungeon') }}</button>
    <button class="btn ghost" id="btnClear">{{ $t('mmo.tileset.clear') }}</button>
    <button class="btn warn" id="btnJSON">{{ $t('mmo.tileset.exportJson') }}</button>
    <button class="btn" id="btnPNG">{{ $t('mmo.tileset.exportPng') }}</button>
    <button class="btn" id="btnImport">{{ $t('mmo.tileset.importJson') }}</button>
    <input type="file" id="fileImport" accept=".json,application/json" hidden>
  </header>
  <main>
    <div id="left">
      <div class="block" id="familyBlock">
        <div class="label">{{ $t('mmo.tileset.family') }}</div>
        <div class="seg" id="familySeg"></div>
      </div>
      <div class="block" id="typeBlock">
        <div class="label">{{ $t('mmo.tileset.type') }}</div>
        <div class="seg" id="typeSeg"></div>
      </div>
      <div class="block" id="brushBlock"></div>
      <div id="paletteWrap"><div id="palette"></div></div>
    </div>
    <div id="view">
      <div class="frame"><canvas id="cv"></canvas></div>
      <div class="hint">{{ $t('mmo.tileset.hint') }}</div>
    </div>
  </main>
  <!-- 随机地牢对话框 -->
  <div v-if="genOpen" class="gen-mask" @click.self="genOpen = false">
    <div class="gen-modal">
      <div class="gen-head">
        <b>{{ $t('mmo.tileset.genDungeon') }}</b>
        <button class="gen-x" @click="genOpen = false">✕</button>
      </div>
      <div class="gen-body">
        <div class="gen-row">
          <label>{{ $t('mmo.tileset.genWidth') }}</label>
          <input class="num" type="number" min="8" max="120" v-model.number="gen.w">
          <label>{{ $t('mmo.tileset.genHeight') }}</label>
          <input class="num" type="number" min="8" max="120" v-model.number="gen.h">
          <label>{{ $t('mmo.tileset.genRooms') }}</label>
          <input class="num" type="number" min="1" max="40" v-model.number="gen.rooms">
        </div>

        <div class="gen-row">
          <label>{{ $t('mmo.tileset.genSeed') }}</label>
          <input class="num" style="width:110px" type="number" v-model.number="gen.seed">
          <button class="btn ghost" @click="gen.seed = Math.floor(Math.random() * 0x7fffffff)">{{ $t('mmo.tileset.genReroll') }}</button>
        </div>

        <div class="gen-row">
          <label><input type="checkbox" v-model="gen.deco"> {{ $t('mmo.tileset.genDeco') }}</label>
          <input class="num" type="number" min="0" max="12" v-model.number="gen.decoN" :disabled="!gen.deco">
        </div>

        <div class="gen-row">
          <label>{{ $t('mmo.tileset.genWallMode') }}</label>
          <div class="seg gen-seg">
            <button :class="{ active: gen.wallMode === 'fill' }" @click="gen.wallMode = 'fill'">{{ $t('mmo.tileset.genWallFill') }}</button>
            <button :class="{ active: gen.wallMode === 'edge' }" @click="gen.wallMode = 'edge'">{{ $t('mmo.tileset.genWallEdge') }}</button>
          </div>
          <template v-if="gen.wallMode === 'edge'">
            <label>{{ $t('mmo.tileset.genVoid') }}</label>
            <div class="seg gen-seg">
              <button :class="{ active: gen.voidTile === 0 }" @click="gen.voidTile = 0">{{ $t('mmo.tileset.genVoidEmpty') }}</button>
              <button :class="{ active: gen.voidTile === 1536 }" @click="gen.voidTile = 1536">{{ $t('mmo.tileset.genVoidDark') }}</button>
            </div>
          </template>
        </div>

        <div class="gen-row">
          <label>{{ $t('mmo.tileset.genWallPair') }}</label>
          <div class="seg gen-seg">
            <button :class="{ active: gen.wallPairMode === 'single' }" @click="gen.wallPairMode = 'single'">{{ $t('mmo.tileset.genPairSingle') }}</button>
            <button :class="{ active: gen.wallPairMode === 'topFace' }" @click="gen.wallPairMode = 'topFace'">{{ $t('mmo.tileset.genPairTopFace') }}</button>
            <button :class="{ active: gen.wallPairMode === 'outerInner' }" @click="gen.wallPairMode = 'outerInner'">{{ $t('mmo.tileset.genPairOuterInner') }}</button>
            <button :class="{ active: gen.wallPairMode === 'mix' }" @click="gen.wallPairMode = 'mix'">{{ $t('mmo.tileset.genPairMix') }}</button>
          </div>
        </div>

        <div class="gen-pick">
          <div class="gen-pick-label">{{ $t('mmo.tileset.genWallA') }} <span class="gen-id">#{{ gen.wallA }}</span></div>
          <div class="gen-grid">
            <span v-for="o in genWalls" :key="o.id" class="gen-tile" :class="{ sel: gen.wallA === o.id }"
              :style="o.style" :title="'#' + o.id" @click="gen.wallA = o.id"></span>
          </div>
        </div>

        <div class="gen-pick" v-if="gen.wallPairMode !== 'single'">
          <div class="gen-pick-label">{{ $t('mmo.tileset.genWallB') }} <span class="gen-id">#{{ gen.wallB }}</span></div>
          <div class="gen-grid">
            <span v-for="o in genWalls" :key="o.id" class="gen-tile" :class="{ sel: gen.wallB === o.id }"
              :style="o.style" :title="'#' + o.id" @click="gen.wallB = o.id"></span>
          </div>
        </div>

        <div class="gen-pick">
          <div class="gen-pick-label">{{ $t('mmo.tileset.genFloor') }} <span class="gen-id">#{{ gen.floorId }}</span></div>
          <div class="gen-grid">
            <span v-for="o in genFloors" :key="o.id" class="gen-tile" :class="{ sel: gen.floorId === o.id }"
              :style="o.style" :title="'#' + o.id" @click="gen.floorId = o.id"></span>
          </div>
        </div>

        <div v-if="genErr" class="gen-err">{{ genErr }}</div>
      </div>
      <div class="gen-foot">
        <button class="btn ghost" @click="genOpen = false">{{ $t('mmo.tileset.genCancel') }}</button>
        <button class="btn" @click="applyGen">{{ $t('mmo.tileset.genConfirm') }}</button>
      </div>
    </div>
  </div>
  <!-- 拖拽文件遮罩 -->
  <div id="dragOverlay"><span>{{ $t('mmo.tileset.dropToLoad') }}</span></div>
  </div>
</template>

<style>
  :root {
    --bg: #14161c; --panel: #1d2129; --panel2: #232833; --border: #333a47;
    --text: #dce3ee; --muted: #8b95a5; --accent: #4aa3ff; --sel: #2a5c8f;
  }
  * { box-sizing: border-box; margin: 0; }
  .ts-page {
    height: 100vh;
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: var(--bg); color: var(--text);
    display: flex; flex-direction: column; overflow: hidden;
  }
  header {
    display: flex; align-items: center; gap: 12px; padding: 8px 16px;
    background: var(--panel); border-bottom: 1px solid var(--border); flex-shrink: 0; flex-wrap: wrap;
  }
  header h1 { font-size: 15px; font-weight: 600; margin-right: 6px; }
  .seg { display: flex; gap: 3px; background: var(--panel2); border-radius: 6px; padding: 3px; }
  .seg button {
    border: 0; background: transparent; color: var(--muted);
    padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;
  }
  .seg button.active { background: var(--sel); color: #fff; }
  .seg button:disabled { opacity: .35; cursor: not-allowed; }
  #familySeg select {
    width: 100%; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border);
    background: var(--panel2); color: var(--text); font-size: 13px; cursor: pointer;
    outline: none;
  }
  #familySeg select:focus { border-color: var(--accent); }
  .hint { font-size: 12px; color: var(--muted); }
  .num { width: 52px; padding: 4px 6px; border-radius: 4px; border: 1px solid var(--border);
    background: var(--panel2); color: var(--text); font-size: 12px; }
  .tool { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
  .btn { 
    border: 0; border-radius: 6px; padding: 6px 14px; font-size: 12px; cursor: pointer;
    background: var(--accent); color: #fff;
  }
  .btn.ghost { background: var(--panel2); color: var(--text); border: 1px solid var(--border); }
  .btn.warn { background: #e6a23c; color: #222; }
  .btn.active { background: var(--sel); color: #fff; box-shadow: inset 0 0 0 2px var(--accent); }
  #brushInfo { font-size: 12px; color: var(--text); background: var(--panel2);
    border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; }
  #posInfo { font-size: 12px; color: #ffd66b; background: var(--panel2);
    border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px;
    font-family: ui-monospace, Menlo, Consolas, monospace; }
  #dragOverlay {
    position: fixed; inset: 0; z-index: 999; pointer-events: none; opacity: 0;
    background: rgba(74, 163, 255, .12); border: 3px dashed #4aa3ff;
    display: flex; align-items: center; justify-content: center;
    transition: opacity .15s;
  }
  #dragOverlay.show { opacity: 1; }
  #dragOverlay span { font-size: 18px; color: #fff; background: rgba(0,0,0,.6);
    padding: 10px 22px; border-radius: 10px; }
  main { flex: 1; min-height: 0; display: flex; overflow: hidden; }
  /* 左侧调色板 */
  #left {
    width: 300px; background: var(--panel); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; flex-shrink: 0;
  }
  #left .block { padding: 8px 10px; border-bottom: 1px solid var(--border); }
  .label { font-size: 11px; color: var(--muted); margin-bottom: 5px; }
  #paletteWrap { flex: 1; overflow: auto; padding: 10px; }
  #palette {
    display: grid; gap: 3px;
    grid-template-columns: repeat(8, 1fr);
    align-content: start;
    user-select: none; -webkit-user-select: none; touch-action: none;
    overflow-anchor: none;
  }
  .ptile {
    position: relative; border: 2px solid var(--border); border-radius: 6px;
    background: #10141c; padding: 0; cursor: pointer; aspect-ratio: 1;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .ptile canvas { width: 100%; height: 100%; image-rendering: pixelated; display: block; }
  .ptile .ptag {
    position: absolute; left: 1px; top: 1px; font-size: 7px; color: #fff;
    background: rgba(0,0,0,.55); padding: 0 2px; border-radius: 3px; z-index: 2;
    max-width: calc(100% - 2px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ptile.active { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(74,163,255,.35); }
  .psection {
    grid-column: 1 / -1; font-size: 11px; color: var(--muted);
    border-top: 1px solid var(--border); padding-top: 6px; margin-top: 2px;
  }
  .psection:first-child { border-top: 0; padding-top: 0; margin-top: 0; }
  /* 右侧绘制区：可滚动，画布水平居中 */
  #view { flex: 1; min-height: 0; display: flex; flex-direction: column;
    position: relative; padding: 14px; gap: 10px; overflow: auto; }
  .frame {
    flex-shrink: 0;
    background: linear-gradient(135deg, #20242e 25%, transparent 25%) 0 0/24px 24px,
                linear-gradient(225deg, #20242e 25%, transparent 25%) 0 0/24px 24px,
                linear-gradient(315deg, #20242e 25%, transparent 25%) 0 0/24px 24px,
                linear-gradient(45deg, #20242e 25%, transparent 25%) 0 0/24px 24px,
                #181c24;
    border: 1px solid var(--border); border-radius: 10px; padding: 8px; line-height: 0;
    margin: 0 auto;
  }
  #cv { image-rendering: pixelated; display: block; cursor: crosshair; }
  /* 随机地牢对话框 */
  .gen-mask { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.55);
    display: flex; align-items: center; justify-content: center; padding: 20px; }
  .gen-modal { width: min(760px, 96vw); max-height: 90vh; display: flex; flex-direction: column;
    background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
    box-shadow: 0 18px 50px rgba(0,0,0,.5); overflow: hidden; }
  .gen-head { display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 14px; }
  .gen-x { border: 0; background: transparent; color: var(--muted); font-size: 16px; cursor: pointer; }
  .gen-x:hover { color: var(--text); }
  .gen-body { padding: 12px 14px; overflow: auto; display: flex; flex-direction: column; gap: 10px; }
  .gen-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    font-size: 12px; color: var(--muted); }
  .gen-row > label { display: flex; align-items: center; gap: 5px; }
  .gen-seg button { white-space: nowrap; }
  .gen-pick { display: flex; flex-direction: column; gap: 5px; }
  .gen-pick-label { font-size: 12px; color: var(--muted); }
  .gen-id { color: #ffd66b; font-family: ui-monospace, Menlo, Consolas, monospace; }
  .gen-grid { display: flex; flex-wrap: wrap; gap: 4px; max-height: 108px; overflow: auto;
    padding: 4px; background: var(--panel2); border: 1px solid var(--border); border-radius: 6px; }
  .gen-tile { display: inline-block; border: 2px solid var(--border); border-radius: 4px;
    background-color: #10141c; cursor: pointer; flex-shrink: 0; }
  .gen-tile.sel { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(74,163,255,.35); }
  .gen-err { color: #ff8a8a; font-size: 12px; }
  .gen-foot { display: flex; justify-content: flex-end; gap: 8px;
    padding: 12px 14px; border-top: 1px solid var(--border); }
  ::-webkit-scrollbar { height: 8px; width: 8px; }
  ::-webkit-scrollbar-thumb { background: #3a4252; border-radius: 4px; }
</style>
