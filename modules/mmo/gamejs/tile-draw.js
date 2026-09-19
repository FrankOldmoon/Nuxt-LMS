/* 共享瓦片渲染模块 —— 供 render.js(地图查看器) 与 tileset.js(图集编辑器) 复用
 * 采用官方 rpg_core.js 精确算法：常量、自动瓦片表、单个瓦片绘制、碰撞通行网格。
 */

export const TILE = 48;
export const TILE_ID_B = 0, TILE_ID_A5 = 1536, TILE_ID_A1 = 2048;
export const TILE_ID_A2 = 2816, TILE_ID_A3 = 4352, TILE_ID_A4 = 5888, TILE_ID_MAX = 8192;

export const isA1 = id => id >= TILE_ID_A1 && id < TILE_ID_A2;
export const isA2 = id => id >= TILE_ID_A2 && id < TILE_ID_A3;
export const isA3 = id => id >= TILE_ID_A3 && id < TILE_ID_A4;
export const isA4 = id => id >= TILE_ID_A4 && id < TILE_ID_MAX;
export const isA5 = id => id >= TILE_ID_A5 && id < TILE_ID_A1;
export const isAutotile = id => id >= TILE_ID_A1;
export const isVisible = id => id > 0 && id < TILE_ID_MAX;
export const autotileKind = id => Math.floor((id - TILE_ID_A1) / 48);
export const autotileShape = id => (id - TILE_ID_A1) % 48;

/* 官方自动瓦片表（来自 rpg_core.js） */
export const FLOOR_AUTOTILE_TABLE = [
    [[2,4],[1,4],[2,3],[1,3]],[[2,0],[1,4],[2,3],[1,3]],
    [[2,4],[3,0],[2,3],[1,3]],[[2,0],[3,0],[2,3],[1,3]],
    [[2,4],[1,4],[2,3],[3,1]],[[2,0],[1,4],[2,3],[3,1]],
    [[2,4],[3,0],[2,3],[3,1]],[[2,0],[3,0],[2,3],[3,1]],
    [[2,4],[1,4],[2,1],[1,3]],[[2,0],[1,4],[2,1],[1,3]],
    [[2,4],[3,0],[2,1],[1,3]],[[2,0],[3,0],[2,1],[1,3]],
    [[2,4],[1,4],[2,1],[3,1]],[[2,0],[1,4],[2,1],[3,1]],
    [[2,4],[3,0],[2,1],[3,1]],[[2,0],[3,0],[2,1],[3,1]],
    [[0,4],[1,4],[0,3],[1,3]],[[0,4],[3,0],[0,3],[1,3]],
    [[0,4],[1,4],[0,3],[3,1]],[[0,4],[3,0],[0,3],[3,1]],
    [[2,2],[1,2],[2,3],[1,3]],[[2,2],[1,2],[2,3],[3,1]],
    [[2,2],[1,2],[2,1],[1,3]],[[2,2],[1,2],[2,1],[3,1]],
    [[2,4],[3,4],[2,3],[3,3]],[[2,4],[3,4],[2,1],[3,3]],
    [[2,0],[3,4],[2,3],[3,3]],[[2,0],[3,4],[2,1],[3,3]],
    [[2,4],[1,4],[2,5],[1,5]],[[2,0],[1,4],[2,5],[1,5]],
    [[2,4],[3,0],[2,5],[1,5]],[[2,0],[3,0],[2,5],[1,5]],
    [[0,4],[3,4],[0,3],[3,3]],[[2,2],[1,2],[2,5],[1,5]],
    [[0,2],[1,2],[0,3],[1,3]],[[0,2],[1,2],[0,3],[3,1]],
    [[2,2],[3,2],[2,3],[3,3]],[[2,2],[3,2],[2,1],[3,3]],
    [[2,4],[3,4],[2,5],[3,5]],[[2,0],[3,4],[2,5],[3,5]],
    [[0,4],[1,4],[0,5],[1,5]],[[0,4],[3,0],[0,5],[1,5]],
    [[0,2],[3,2],[0,3],[3,3]],[[0,2],[1,2],[0,5],[1,5]],
    [[0,4],[3,4],[0,5],[3,5]],[[2,2],[3,2],[2,5],[3,5]],
    [[0,2],[3,2],[0,5],[3,5]],[[0,0],[1,0],[0,1],[1,1]]
];
export const WALL_AUTOTILE_TABLE = [
    [[2,2],[1,2],[2,1],[1,1]],[[0,2],[1,2],[0,1],[1,1]],
    [[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],
    [[2,2],[3,2],[2,1],[3,1]],[[0,2],[3,2],[0,1],[3,1]],
    [[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]],
    [[2,2],[1,2],[2,3],[1,3]],[[0,2],[1,2],[0,3],[1,3]],
    [[2,0],[1,0],[2,3],[1,3]],[[0,0],[1,0],[0,3],[1,3]],
    [[2,2],[3,2],[2,3],[3,3]],[[0,2],[3,2],[0,3],[3,3]],
    [[2,0],[3,0],[2,3],[3,3]],[[0,0],[3,0],[0,3],[3,3]]
];
export const WATERFALL_AUTOTILE_TABLE = [
    [[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],
    [[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]]
];

/* 官方：普通瓦片（A5/B/C）源坐标 */
export function normalTileSource(tileId) {
    let setNumber;
    if (isA5(tileId)) setNumber = 4;
    else setNumber = 5 + Math.floor(tileId / 256); // B=5, C=6
    const sx = (Math.floor(tileId / 128) % 2 * 8 + tileId % 8) * TILE;
    const sy = (Math.floor(tileId % 256 / 8) % 16) * TILE;
    return { setNumber, sx, sy };
}

/* 官方：自动瓦片，返回 4 段小瓦片 {sx,sy,dx,dy,sw,sh} */
export function autotileQuads(tileId, animFrame) {
    let table = FLOOR_AUTOTILE_TABLE;
    const kind = autotileKind(tileId);
    const shape = autotileShape(tileId);
    const tx = kind % 8, ty = Math.floor(kind / 8);
    let bx = 0, by = 0, setNumber = 0;

    if (isA1(tileId)) {
        const waterI = [0, 1, 2, 1][animFrame % 4];
        setNumber = 0;
        if (kind === 0) { bx = waterI * 2; by = 0; }
        else if (kind === 1) { bx = waterI * 2; by = 3; }
        else if (kind === 2) { bx = 6; by = 0; }
        else if (kind === 3) { bx = 6; by = 3; }
        else {
            bx = Math.floor(tx / 4) * 8;
            by = ty * 6 + Math.floor(tx / 2) % 2 * 3;
            if (kind % 2 === 0) {
                bx += waterI * 2;   // 水面：水平离散帧动画
            } else {
                // 瀑布：不做垂直动画，用完整 FLOOR 连接表
                // 保留下/上/左/右拓宽边界，横向相邻瀑布连成连续水流
                // （不做 `by += animFrame % 3` 滚动，避免越界渗出其它 tile）
                bx += 6;
                table = FLOOR_AUTOTILE_TABLE;
            }
        }
    } else if (isA2(tileId)) {
        setNumber = 1; bx = tx * 2; by = (ty - 2) * 3;
    } else if (isA3(tileId)) {
        setNumber = 2; bx = tx * 2; by = (ty - 6) * 2; table = WALL_AUTOTILE_TABLE;
    } else if (isA4(tileId)) {
        setNumber = 3; bx = tx * 2;
        by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
        if (ty % 2 === 1) table = WALL_AUTOTILE_TABLE;
    }

    const shapeTable = table[shape] || table[0];
    const w1 = TILE / 2, h1 = TILE / 2;
    const quads = [];
    for (let i = 0; i < 4; i++) {
        const qsx = shapeTable[i][0], qsy = shapeTable[i][1];
        quads.push({
            sx: (bx * 2 + qsx) * w1,
            sy: (by * 2 + qsy) * h1,
            sw: w1, sh: h1,
            dx: (i % 2) * w1, dy: Math.floor(i / 2) * h1
        });
    }
    return { setNumber, quads };
}

/* 把单块绘制到 ctx：srcImg 为源图集，tileId 为目标 */
export function drawTile(ctx, srcImages, tileId, px, py, animFrame) {
    if (!isVisible(tileId)) return;
    if (isAutotile(tileId)) {
        const { setNumber, quads } = autotileQuads(tileId, animFrame);
        const img = srcImages[setNumber];
        if (!img) return;
        const ox = px * TILE, oy = py * TILE;
        for (const q of quads) {
            ctx.drawImage(img, q.sx, q.sy, q.sw, q.sh, ox + q.dx, oy + q.dy, q.sw, q.sh);
        }
    } else {
        const { setNumber, sx, sy } = normalTileSource(tileId);
        const img = srcImages[setNumber];
        if (!img) return;
        ctx.drawImage(img, sx, sy, TILE, TILE, px * TILE, py * TILE, TILE, TILE);
    }
}

/* ===== 碰撞系统（官方 flags + isPassable 逻辑） ===== */
/* 方向位：0x01 下 / 0x02 左 / 0x04 右 / 0x08 上；=置位则此方向不可通行 */
export const D_DOWN = 0x01, D_LEFT = 0x02, D_RIGHT = 0x04, D_UP = 0x08;

/* 构建方向通行网格 passGrid[y][x]（4 位方向掩码，0=四向都通）。
 * map: {data, width, height}；flagsArr: tileset.flags（下标即 tileId）。
 * 从上层(z3)往下找第一个有碰撞语义的 tile。 */
export function buildPassGrid(map, flagsArr) {
    const w = map.width, h = map.height;
    const mask = (x, y) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return 0x0f; // 地图外=全封闭
        for (let z = 3; z >= 0; z--) {
            const t = map.data[(z * h + y) * w + x];
            if (!t) continue;
            const f = flagsArr[t] || 0;
            if (f & 0x10) continue;           // [★] 无通行影响（装饰层），跳过
            return f & 0x0f;                  // 只取方向位
        }
        return 0;                             // 空地面=四向可通行
    };
    const grid = [];
    for (let y = 0; y < h; y++) {
        grid[y] = [];
        for (let x = 0; x < w; x++) grid[y][x] = mask(x, y);
    }
    return grid;
}