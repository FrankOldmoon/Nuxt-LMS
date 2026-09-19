/* rpgMap.js —— RPG Maker MV 地图渲染器(供 multi/indoor 场景复用)
 * 移植自 new_tilesets/js/render.js:加载地图 JSON + Tilesets.json + 图集,
 * 用官方自动瓦片算法合成底图,支持水动画,并输出碰撞通行网格。
 * 素材根 ../rpg(public/mmo/rpg)由 BASE_RPG 提供。
 */
import { fetchBitmap } from "../lpc/imageLoader.js";
import { TILE, isA1, drawTile, buildPassGrid } from "./tileDraw.js";

export const BASE_RPG = "/api/game-assets/mmo/";

export class RpgMap {
  /* scene: Phaser 场景; mapFile: maps/xxx.json(相对 BASE_RPG) */
  constructor(scene, mapFile, opts = {}) {
    this.scene = scene;
    this.mapFile = mapFile;
    this.deep = opts.depth ?? 1;      // 底图绘制深度
    this.texKey = opts.texKey || "rpgmap";
    this.waterSpeed = opts.waterSpeed ?? 150;
    this.passGrid = null;             // [y][x] 4位方向掩码
    this.map = null;
    this._waterTimer = null;
  }

  /* 异步加载并返回此实例(底图已注册为场景纹理) */
  async load() {
    const scene = this.scene;
    // 先取地图与图集清单 JSON,解析出本图实际用到的图集名后再按需下载图集。
    // 之前把所有图集与 JSON 一次性并发拉取(数十个请求),关键 JSON 易被浏览器
    // 以 ERR_ABORTED 中止、图集超时返回 null,导致整张地图空白。此处改为串行分批。
    // map.file 支持绝对 http(s) URL（外部副本的远端地图 JSON），否则视为 BASE_RPG 下的本地路径。
    const isAbsUrl = (s) => /^https?:\/\//i.test(s || "");
    const mapUrl = isAbsUrl(this.mapFile) ? this.mapFile : (BASE_RPG + this.mapFile);
    const [map, tilesets] = await Promise.all([
      this.loadJson(mapUrl),
      this.loadJson(BASE_RPG + "tilesets/Tilesets.json"),
    ]);
    if (!map || !tilesets) throw new Error("地图或图集清单加载失败 - " + this.mapFile);
    this.map = map;
    this.MAP_W = map.width;
    this.MAP_H = map.height;
    const ts = tilesets[map.tilesetId];
    if (!ts) throw new Error("tileset 缺失 id=" + map.tilesetId);

    this.passGrid = buildPassGrid(map, ts.flags);

    // 该地图用到的 7 个图集槽位(按 tilesetNames 顺序)
    const names = ts.tilesetNames || [];
    const srcImages = await this.loadTilesetImages(scene, names);
    for (let i = 0; i < 7; i++) {
      const nm = names[i];
      const img = nm ? srcImages[nm] : null;
      // fetchBitmap 返回 HTMLCanvasElement(canvas),据此判断其是否有效(兼容 <img> 的 naturalWidth)
      srcImages[i] = img && (img.naturalWidth || img.width) ? img : null;
    }

    // 合成底图: 静态层(非水瓦片 + 阴影)只画一次; 水面单独成层, 仅水面每帧重绘(评审 #6)
    const staticCv = document.createElement("canvas");
    staticCv.width = this.MAP_W * TILE;
    staticCv.height = this.MAP_H * TILE;
    const sctx = staticCv.getContext("2d");
    const waterCv = document.createElement("canvas");
    waterCv.width = staticCv.width;
    waterCv.height = staticCv.height;
    const wctx = waterCv.getContext("2d");

    const waterList = [];
    const at = (i) => Number.isFinite(map.data[i]) ? map.data[i] : 0; // 越界(层不足)按空处理,避免黑屏
    for (let y = 0; y < this.MAP_H; y++) {
      for (let x = 0; x < this.MAP_W; x++) {
        const id0 = at(y * this.MAP_W + x);
        const id1 = at((this.MAP_H + y) * this.MAP_W + x);
        const id2 = at((2 * this.MAP_H + y) * this.MAP_W + x);
        const id3 = at((3 * this.MAP_H + y) * this.MAP_W + x);
        if (isA1(id0) || isA1(id1)) waterList.push({ x, y });
        if (!isA1(id0)) drawTile(sctx, srcImages, id0, x, y, 0);
        if (!isA1(id1)) drawTile(sctx, srcImages, id1, x, y, 0);
        drawTile(sctx, srcImages, id2, x, y, 0);
        drawTile(sctx, srcImages, id3, x, y, 0);
      }
    }
    // 静态层阴影(含水域单元的阴影, 一次性绘制)
    this.drawShadows(sctx, map);

    // 水面层: 仅水域单元, 每帧重绘动画帧(不再每帧重绘整张静态底图, 省去数千次 drawImage, 评审 #6)
    const paintWater = (frame) => {
      wctx.clearRect(0, 0, waterCv.width, waterCv.height);
      for (const { x, y } of waterList) {
        drawTile(wctx, srcImages, map.data[y * this.MAP_W + x], x, y, frame);
        drawTile(wctx, srcImages, map.data[(this.MAP_H + y) * this.MAP_W + x], x, y, frame);
        this.drawShadows(wctx, map, { x, y });
      }
    };
    paintWater(0);

    // 静态层纹理(只注册一次, 不再每帧 refresh)
    if (scene.textures.exists(this.texKey)) scene.textures.remove(this.texKey);
    const tex = scene.textures.addCanvas(this.texKey, staticCv);
    const img = scene.add.image(0, 0, this.texKey).setOrigin(0).setDepth(this.deep);
    scene.cameras.main.setBounds(0, 0, staticCv.width, staticCv.height);

    // 水面层纹理(透明画布, 置于静态层之上、角色之下), 每帧 refresh 重绘动画
    if (scene.textures.exists(this.texKey + "_water")) scene.textures.remove(this.texKey + "_water");
    const waterTex = scene.textures.addCanvas(this.texKey + "_water", waterCv);
    scene.add.image(0, 0, this.texKey + "_water").setOrigin(0).setDepth(this.deep + 0.5);

    this._paintWater = paintWater;
    this._waterTex = waterTex;
    let frame = 0;
    this._waterTimer = scene.time.addEvent({
      delay: this.waterSpeed, loop: true,
      callback: () => { frame++; paintWater(frame); waterTex.refresh(); },
    });
    if (scene.events) scene.events.once("shutdown", () => this._waterTimer && this._waterTimer.remove());

    this.width = staticCv.width;
    this.height = staticCv.height;
    return this;
  }

  drawShadows(ctx, map, cell) {
    const w = map.width, h = map.height;
    if (cell) {
      const { x, y } = cell;
      const bits = map.data[(4 * h + y) * w + x];
      if (bits & 0x0f) this.paintShadowQuad(ctx, x, y, bits);
      return;
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const bits = map.data[(4 * h + y) * w + x];
        if (bits & 0x0f) this.paintShadowQuad(ctx, x, y, bits);
      }
    }
  }
  paintShadowQuad(ctx, x, y, bits) {
    const ox = x * TILE, oy = y * TILE, w1 = TILE / 2;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    for (let i = 0; i < 4; i++) {
      if (bits & (1 << i)) {
        ctx.fillRect(ox + (i % 2) * w1, oy + Math.floor(i / 2) * w1, w1, w1);
      }
    }
  }

  /* 某格(瓦片坐标)是否完全不可通行 */
  solidAt(tx, ty) {
    if (!this.passGrid) return false;
    if (tx < 0 || tx >= this.MAP_W || ty < 0 || ty >= this.MAP_H) return true;
    return this.passGrid[ty][tx] !== 0;
  }
  walkableAt(tx, ty) {
    return !this.solidAt(tx, ty);
  }
  /* 找离 (tx,ty) 最近的可行走瓦片中心像素;返回 {x,y} */
  findWalkable(tx, ty) {
    if (this.walkableAt(tx, ty)) return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
    for (let r = 1; r <= Math.max(this.MAP_W, this.MAP_H); r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.walkableAt(tx + dx, ty + dy))
            return { x: (tx + dx) * TILE + TILE / 2, y: (ty + dy) * TILE + TILE / 2 };
        }
      }
    }
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }
  /* 整张图玩家的可行走出生点(靠近给定目标,默认地图中心) */
  spawnNear(tx, ty) {
    return this.findWalkable(tx, ty);
  }
  /* 将像素坐标钳制在地图内 */
  clamp(x, y) {
    return { x: Math.max(0, Math.min(this.MAP_W * TILE - 1, x)), y: Math.max(0, Math.min(this.MAP_H * TILE - 1, y)) };
  }
  /* 某像素是否落在可通行格上 */
  pixelWalkable(x, y) {
    return this.walkableAt(Math.floor(x / TILE), Math.floor(y / TILE));
  }
  /* 以 (x,y) 为圆心、半径 R 的碰撞圆是否与任何不可通行格相交 */
  canPlace(x, y, R) {
    if (!this.passGrid) return true;
    const minTx = Math.floor((x - R) / TILE), maxTx = Math.floor((x + R) / TILE);
    const minTy = Math.floor((y - R) / TILE), maxTy = Math.floor((y + R) / TILE);
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (this.solidAt(tx, ty)) {
          // 粗略判定: 该格矩形是否与圆心圆相交
          const l = tx * TILE, t = ty * TILE, r = l + TILE, b = t + TILE;
          const cx = Math.max(l, Math.min(x, r));
          const cy = Math.max(t, Math.min(y, b));
          if (Math.hypot(x - cx, y - cy) < R) return false;
        }
      }
    }
    return true;
  }
  /* 沿两轴分段移动;返回实际可到达的 {x,y} */
  moveWithCollision(x, y, dx, dy, R) {
    let nx = x, ny = y;
    if (dx !== 0 && this.canPlace(x + dx, y, R)) nx = x + dx;
    if (dy !== 0 && this.canPlace(nx, y + dy, R)) ny = y + dy;
    return { x: nx, y: ny };
  }

  destroy() {
    if (this._waterTimer) this._waterTimer.remove();
    this._waterTimer = null;
  }

  /* ---------- 内部加载工具 ---------- */
  loadJson(url) {
    // cache:no-store 确保地图/图集 JSON 始终读取磁盘最新版, 避免浏览器缓存旧数据
    return fetch(url, { cache: "no-store" }).then((r) => r.json()).catch((e) => { console.warn("[rpgMap] load json fail", url, e); return null; });
  }
  async loadTilesetImages(scene, names) {
    const images = {};
    // 只下载本地图实际用到的图集(前 7 个槽位)，避免一次性并发拉取全部图集导致超时/中止
    const wanted = [];
    for (let i = 0; i < Math.min(7, names.length); i++) {
      const nm = names[i];
      if (nm && !wanted.includes(nm)) wanted.push(nm);
    }
    await Promise.all(wanted.map(async (nm) => {
      const key = "rts_" + nm;
      if (scene.textures.exists(key)) { images[nm] = scene.textures.get(key).getSourceImage(); return; }
      // cache-busting: 图集是静态图片, 追加时间戳绕过浏览器 HTTP 强缓存
      const cv = await fetchBitmap(BASE_RPG + "tilesets/" + nm + ".png?v=" + Date.now());
      if (!cv) return;
      // 并发加载同名图集时 addCanvas 可能因 key 已被占用而抛错: 复用已注册纹理即可
      try { scene.textures.addCanvas(key, cv); }
      catch (e) { if (scene.textures.exists(key)) cv = scene.textures.get(key).getSourceImage(); }
      images[nm] = cv;
    }));
    return images;
  }
}