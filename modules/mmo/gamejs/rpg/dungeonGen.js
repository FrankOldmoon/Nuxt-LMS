/* dungeonGen.js —— 程序化生成 RPG Maker MV「地牢」地图（纯逻辑，无 fs / DOM）
 *
 * 供两处共用：
 *   - scripts/gen-dungeon-map.mjs（Node，读磁盘上的 Tilesets.json / semantic meta）
 *   - modules/mmo/pages/tileset.vue（浏览器，传已加载的 flags）
 *
 * 生成约定与 modules/mmo/gamejs/rpg/rpgMap.js 一致：
 *   墙面用 A4 墙自动瓦片，shape 按官方四邻公式（rpg_core.js 的 WALL/FLOOR 表同源）烘焙进 tileId：
 *     shape = 左1 + 上2 + 右4 + 下8（邻格为同一种墙则不加）
 *   地面用可通行的普通瓦片（平坦铺满，不做自动连接，避免算法差异）。
 * 选材范围对齐官方「地图生成」：墙只取 A4 的上/中/下三组；地面只取 A5 的第 3/5/7 行。
 *   装饰摆在 layer2（B，id<256）/ layer3（C，id>=256），只选 flags 允许的，
 *   实心摆设摆放后会做连通性校验，破坏通路则回退移除。
 */
const TILE_ID_A1 = 2048;
const TILE_ID_A4 = 5888;
const TILE_ID_A5 = 1536;

/* 主题：只是「地面 + 墙」的常用组合，方便命令行一把梭；模态框可单独指定 */
export const THEMES = {
  stone:  { floor: 1554, wall: 6368 }, // 地面 + 上组石墙
  brick:  { floor: 1555, wall: 6512 }, // 地面 + 上组砖墙
  cobble: { floor: 1568, wall: 6416 }, // 鹅卵石A + 上组墙
  marble: { floor: 1588, wall: 7808 }, // 装饰砖 + 下组墙
  ice:    { floor: 1590, wall: 7280 }, // 鹅卵石J + 中组墙
  crypt:  { floor: 1585, wall: 7376 }, // 地板 + 中组墓室墙
};

/* 装饰候选（会被 flags 过滤；details=可走地面细节，props=实心摆设） */
const DECO_DETAILS = [50, 51, 53, 54, 55, 15];
const DECO_PROPS = [184, 188, 189, 190, 216, 217, 220, 221, 238, 239, 240, 242, 250, 256, 257, 258, 334, 342];

/* 地牢出入口固定用 Dungeon_B 的两格。
 * 官方 B/C 映射是「8 列一块、左右两块」：sx = (⌊id/128⌋%2*8 + id%8)*48，sy = ⌊(id%256)/8⌋*48
 * （rpg_core.js 的 Tilemap._drawNormalTile），所以图像第 r 行第 c 列（c ≤ 8）→ id = (r-1)*8 + (c-1)。
 *   出口 = 第 3 行第 3 个 → id 18；入口 = 第 4 行第 3 个 → id 26 */
export const ENTRANCE_TILE = 26;
export const EXIT_TILE = 18;

const blockedDirs = (flags, id) => (flags[id] || 0) & 0x0f;
const isOverhead = (flags, id) => !!((flags[id] || 0) & 0x10);
const absKind = id => Math.floor((id - TILE_ID_A1) / 48);
/* A4 里 ty 为奇数 → rpgMap 用 WALL 表（可作墙）；偶数 → FLOOR 表（多作地面/可走） */
const usesWallTable = id => Math.floor(absKind(id) / 8) % 2 === 1;

/* 官方「地图生成」选材范围：墙=A4 的上/中/下三组(kind 8-15 / 24-31 / 40-47)；地面=A5 第 3/5/7 行 */
const A4_BANDS = [["top", 8, 15], ["middle", 24, 31], ["bottom", 40, 47]];
const A5_FLOOR_ROWS = [3, 5, 7];

/* 墙候选（按官方三组）：只要「实心 + 走 WALL 表」 */
export function listWallGroups(flags) {
  return A4_BANDS.map(([key, a, b]) => {
    const ids = [];
    for (let k = a; k <= b; k++) {
      const id = TILE_ID_A4 + k * 48;
      if (blockedDirs(flags, id) !== 0 && usesWallTable(id)) ids.push(id);
    }
    return { key, ids };
  });
}
export function listWallBases(flags) {
  return listWallGroups(flags).flatMap(g => g.ids);
}
/* 地面候选（按官方第 3/5/7 行分组）：只要「可通行 + 非头顶」 */
export function listFloorGroups(flags) {
  return A5_FLOOR_ROWS.map(row => {
    const ids = [];
    for (let c = 0; c < 8; c++) {
      const id = TILE_ID_A5 + (row - 1) * 8 + c;
      if (blockedDirs(flags, id) === 0 && !isOverhead(flags, id)) ids.push(id);
    }
    return { row, ids };
  }).filter(g => g.ids.length);
}
export function listFloorTiles(flags) {
  return listFloorGroups(flags).flatMap(g => g.ids);
}
/* 兼容旧接口 */
export function deriveMaterials(meta, flags) {
  return { walls: listWallBases(flags), flats: listFloorTiles(flags) };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 生成一张地牢地图。
 * @param opts {
 *   width, height, rooms, seed, deco,
 *   floorId,                 地面瓦片
 *   wallA, wallB,            两种墙瓦片基准
 *   wallPairMode,            'topFace'(顶面+正面) | 'outerInner'(外框+内部) | 'mix'(随机混用) | 'single'(只用 A)
 *   wallMode,                'fill'(非地面全铺墙) | 'edge'(只铺与地面相邻的边缘，其余留空)
 *   tilesetId, theme
 * }
 * @param env { flags:number[], meta:object|null }
 * @returns { map, info }
 */
export function generateDungeon(opts = {}, env = {}) {
  const flags = env.flags || [];
  const W = Math.max(8, Math.min(120, opts.width || 41));
  const H = Math.max(8, Math.min(120, opts.height || 30));
  const ROOMS = Math.max(1, opts.rooms || 8);
  const DECO = Math.max(0, opts.deco ?? 2);
  const SEED = (opts.seed ?? 20260919) >>> 0;
  const rnd = mulberry32(SEED);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  // ---- 材料解析（显式指定优先，非法则回退到 meta 候选 → 主题 → 常量） ----
  const mats = deriveMaterials(env.meta, flags);
  const th = THEMES[opts.theme] || THEMES.stone;
  const pickFloor = id => (id && mats.flats.includes(id)) ? id : (mats.flats[0] || 1554);
  const pickWall = id => (id && mats.walls.includes(id)) ? id : (mats.walls[0] || 6368);
  const FLOOR = pickFloor(opts.floorId || th.floor);
  const WALL_A = pickWall(opts.wallA || th.wall);
  const WALL_B = pickWall(opts.wallB || opts.wallA || th.wall);
  const wallMode = opts.wallMode === "edge" ? "edge" : "fill";
  const VOID_ID = Number(opts.voidTile) || 0; // 留空格子填充：0=透明空(via 0)，1536=Darkness(实心不挡路感)
  const pairMode = ["topFace", "outerInner", "mix", "single"].includes(opts.wallPairMode)
    ? opts.wallPairMode
    : (opts.wallB && opts.wallB !== opts.wallA ? "mix" : "single");

  const detailPool = DECO_DETAILS.filter(id => flags[id] !== undefined && blockedDirs(flags, id) === 0 && !isOverhead(flags, id));
  const propPool = DECO_PROPS.filter(id => flags[id] !== undefined && blockedDirs(flags, id) !== 0);

  // ---- 全墙 → 挖房间 → 连走廊 ----
  const floor = Array.from({ length: H }, () => Array(W).fill(false));
  const rects = [];
  const tryRoom = (x, y, w, h) => {
    if (x < 1 || y < 1 || x + w > W - 1 || y + h > H - 1) return false;
    for (const r of rects) {
      if (x - 1 < r.x + r.w && x + w + 1 > r.x && y - 1 < r.y + r.h && y + h + 1 > r.y) return false;
    }
    rects.push({ x, y, w, h });
    return true;
  };
  for (let guard = 0; rects.length < ROOMS && guard < ROOMS * 80; guard++) {
    const w = ri(4, 9), h = ri(3, 7);
    tryRoom(ri(1, W - w - 2), ri(1, H - h - 2), w, h);
  }
  for (const r of rects) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) floor[y][x] = true;

  const corridorCell = new Set(); // 走廊格（1 格宽），实心摆设要避开，否则会堵死通路
  const corridor = (x1, y1, x2, y2) => {
    const [ax, bx] = x1 < x2 ? [x1, x2] : [x2, x1];
    const [ay, by] = y1 < y2 ? [y1, y2] : [y2, y1];
    for (let x = ax; x <= bx; x++) { floor[y1][x] = true; corridorCell.add(y1 * W + x); }
    for (let y = ay; y <= by; y++) { floor[y][x2] = true; corridorCell.add(y * W + x2); }
  };
  const sorted = [...rects].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1], b = sorted[i];
    corridor(a.x + (a.w >> 1), a.y + (a.h >> 1), b.x + (b.w >> 1), b.y + (b.h >> 1));
  }
  for (let i = 0; i < Math.max(0, opts.loops ?? Math.floor(rects.length / 4)); i++) {
    const a = rects[ri(0, rects.length - 1)], b = rects[ri(0, rects.length - 1)];
    corridor(a.x + (a.w >> 1), a.y + (a.h >> 1), b.x + (b.w >> 1), b.y + (b.h >> 1));
  }

  const isFloor = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? false : floor[y][x];
  const nearFloor = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && isFloor(x + dx, y + dy)) return true;
    }
    return false;
  };

  // ---- 铺墙：按 wallMode 决定哪些格是墙；按 pairMode 决定用 A 还是 B ----
  const wallBase = Array.from({ length: H }, () => Array(W).fill(0));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (floor[y][x]) continue;
      if (wallMode === "edge" && !nearFloor(x, y)) continue; // 只铺边缘：远离地面的格子留空
      let base = WALL_A;
      if (pairMode === "topFace") base = isFloor(x, y + 1) ? WALL_B : WALL_A; // 南邻是地面 → 正面(B)；否则顶面(A)
      else if (pairMode === "outerInner") base = (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) ? WALL_A : WALL_B; // 外框(A) / 内部(B)
      else if (pairMode === "mix") base = rnd() < 0.5 ? WALL_A : WALL_B; // 随机混用
      wallBase[y][x] = base;
    }
  }
  const shapeOf = (x, y) => {
    const b = wallBase[y][x];
    const same = (nx, ny) => (nx < 0 || ny < 0 || nx >= W || ny >= H) ? true : wallBase[ny][nx] === b;
    return (same(x - 1, y) ? 0 : 1) + (same(x, y - 1) ? 0 : 2) + (same(x + 1, y) ? 0 : 4) + (same(x, y + 1) ? 0 : 8);
  };

  // ---- 装饰（先摆，再校验连通性；破坏通路则回退实心摆设） ----
  const deco = Array.from({ length: H }, () => Array(W).fill(0));
  const spawn = rects.length ? [rects[0].x + (rects[0].w >> 1), rects[0].y + (rects[0].h >> 1)] : [1, 1];
  const solidProps = [];
  let propsDrawn = 0;
  if (DECO > 0 && (detailPool.length || propPool.length)) {
    for (const r of rects) {
      for (let k = 0; k < DECO; k++) {
        const x = ri(r.x, r.x + r.w - 1), y = ri(r.y, r.y + r.h - 1);
        if (floor[y][x] === false || deco[y][x] || (x === spawn[0] && y === spawn[1])) continue;
        // 实心摆设只放非走廊格（走廊 1 格宽，放上去会堵路）；地面细节可放任意地板格
        const canProp = propPool.length > 0 && !corridorCell.has(y * W + x);
        const useProp = canProp && (rnd() < 0.4 || detailPool.length === 0);
        let id;
        if (useProp) id = propPool[ri(0, propPool.length - 1)];
        else if (detailPool.length) id = detailPool[ri(0, detailPool.length - 1)];
        else continue;
        deco[y][x] = id;
        if (blockedDirs(flags, id) !== 0) { solidProps.push([x, y]); propsDrawn++; }
      }
    }
  }
  const walkable = (x, y) => floor[y][x] && blockedDirs(flags, deco[y][x]) === 0;
  const countReachable = () => {
    const seen = new Set(); const key = (x, y) => y * W + x;
    if (!floor[spawn[1]][spawn[0]] || blockedDirs(flags, deco[spawn[1]][spawn[0]]) !== 0) return 0;
    const st = [[spawn[0], spawn[1]]]; seen.add(key(spawn[0], spawn[1]));
    while (st.length) {
      const [x, y] = st.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || !walkable(nx, ny)) continue;
        const k = key(nx, ny);
        if (!seen.has(k)) { seen.add(k); st.push([nx, ny]); }
      }
    }
    return seen.size;
  };
  const totalFloor = floor.flat().filter(Boolean).length;
  const walkableCount = () => {
    let c = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (floor[y][x] && blockedDirs(flags, deco[y][x]) === 0) c++;
    return c;
  };
  // 实心摆设自身占用地板格，只要「剩余可走格」全部可达即算连通；否则随机撤掉摆设
  let guard = solidProps.length * 3;
  while (countReachable() < walkableCount() && guard-- > 0) {
    const i = Math.floor(rnd() * solidProps.length);
    const [x, y] = solidProps.splice(i, 1)[0] || [];
    if (x === undefined) break;
    deco[y][x] = 0;
  }

  // ---- 出入口（摆在连通性结算之后，确保不被摆设回收覆盖）：每个地牢都必须有 ----
  // 入口 = 出生格；出口 = BFS 最远的地板格（最远即出生格时退而取 BFS 末位）
  let exitCell = [spawn[0], spawn[1]];
  {
    const dist = Array.from({ length: H }, () => Array(W).fill(-1));
    if (floor[spawn[1]][spawn[0]] && blockedDirs(flags, deco[spawn[1]][spawn[0]]) === 0) {
      dist[spawn[1]][spawn[0]] = 0;
      const q = [[spawn[0], spawn[1]]];
      for (let i = 0; i < q.length; i++) {
        const [x, y] = q[i];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || dist[ny][nx] >= 0 || !walkable(nx, ny)) continue;
          dist[ny][nx] = dist[y][x] + 1;
          q.push([nx, ny]);
        }
      }
      let far = q[0];
      for (const c of q) if (dist[c[1]][c[0]] > dist[far[1]][far[0]]) far = c;
      if (far[0] === spawn[0] && far[1] === spawn[1] && q.length > 1) far = q[q.length - 1];
      // 出口 = 距入口最远的地板格；在「最远附近」优先选右侧贴墙的格子（tol 逐步放宽）。
      // 既保证「在地图最远处」，又能满足出口贴墙的观感；附近确实无墙时才回退到纯最远格。
      const wallRight = (x, y) => x + 1 < W && wallBase[y][x + 1] !== 0;
      const notSpawn = ([x, y]) => !(x === spawn[0] && y === spawn[1]);
      const maxD = dist[far[1]][far[0]];
      let best = far;
      for (let tol = 0; tol <= 4; tol++) {
        const band = q.filter((c) => notSpawn(c) && dist[c[1]][c[0]] >= maxD - tol && wallRight(c[0], c[1]));
        if (band.length) { best = band.reduce((a, b) => (dist[b[1]][b[0]] > dist[a[1]][a[0]] ? b : a), band[0]); break; }
      }
      exitCell = best;
    }
  }
  deco[spawn[1]][spawn[0]] = ENTRANCE_TILE;
  if (!(exitCell[0] === spawn[0] && exitCell[1] === spawn[1])) deco[exitCell[1]][exitCell[0]] = EXIT_TILE;

  // ---- 写 6 层 data（0=地面/墙, 2=B 装饰, 3=C 装饰） ----
  const n = W * H;
  const data = new Array(n * 6).fill(0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (floor[y][x]) data[y * W + x] = FLOOR;
      else if (wallBase[y][x]) data[y * W + x] = wallBase[y][x] + shapeOf(x, y);
      else if (VOID_ID) data[y * W + x] = VOID_ID; // 留空格填充（透明则保持 0）
      const d = deco[y][x];
      if (d) { const z = d < 256 ? 2 : 3; data[z * n + y * W + x] = d; }
    }
  }

  const map = {
    autoplayBgm: false, autoplayBgs: false, battleback1Name: '', battleback2Name: '',
    bgm: { name: '', pan: 0, pitch: 100, volume: 90 },
    bgs: { name: '', pan: 0, pitch: 100, volume: 90 },
    disableDashing: false, displayName: '', encounterList: [], encounterStep: 30,
    height: H, note: '', parallaxLoopX: false, parallaxLoopY: false, parallaxName: '',
    parallaxShow: true, parallaxSx: 0, parallaxSy: 0, scrollType: 0, specifyBattleback: false,
    tilesetId: opts.tilesetId || 4, width: W, data, events: [],
  };
  const info = {
    theme: opts.theme || 'custom', floorId: FLOOR, wallId: WALL_A, wallA: WALL_A, wallB: WALL_B,
    wallMode, wallPairMode: pairMode, voidTile: VOID_ID, spawn, seed: SEED,
    entrance: [spawn[0], spawn[1]], entranceTile: ENTRANCE_TILE, exit: exitCell, exitTile: EXIT_TILE,
    rooms: rects.length, floors: totalFloor, walkable: walkableCount(), reachable: countReachable(),
    deco: { details: detailPool.length, props: propPool.length, propsDrawn, propsKept: solidProps.length },
  };
  return { map, info };
}
