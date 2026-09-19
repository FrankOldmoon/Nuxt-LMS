/**
 * 地牢生成器单元测试
 *
 * 生成逻辑在 modules/mmo/gamejs/rpg/dungeonGen.js（Node 脚本与 /mmo-tileset 按钮共用）。
 * 这里用真实的 Dungeon(4) flags / semantic meta 复核：
 *   - 6 层 data 结构正确、tileId 合法且落在图集范围内
 *   - 墙面实心、地面可通行（用游戏自身的 buildPassGrid 复核）
 *   - 从 spawn 出发所有「可走格」全连通（实心摆设不会堵死）
 *   - 相同种子可复现
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDungeon, THEMES, deriveMaterials, listWallBases, listFloorTiles } from "../../gamejs/rpg/dungeonGen.js";
import { isAutotile, autotileQuads, normalTileSource, buildPassGrid } from "../../gamejs/tile-draw.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const ASSETS = path.join(ROOT, "game_assets/mmo");
const TILESET_ID = 4;

const tilesets = JSON.parse(fs.readFileSync(path.join(ASSETS, "tilesets/Tilesets.json"), "utf8"));
const meta = JSON.parse(fs.readFileSync(path.join(ASSETS, "tilesets/meta/4_地牢.semantic.json"), "utf8"));
const flags = tilesets[TILESET_ID].flags;
const names = tilesets[TILESET_ID].tilesetNames;

function pngSize(p: string) {
  const b = fs.readFileSync(p);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const atlas: Record<number, { w: number; h: number }> = {};
for (let i = 0; i < 7; i++) {
  if (!names[i]) continue;
  try { atlas[i] = pngSize(path.join(ASSETS, "tilesets", names[i] + ".png")); } catch { /* 缺图集则跳过校验 */ }
}

const blocked = (id: number) => (flags[id] || 0) & 0x0f;
const gen = (opts: Record<string, unknown>) =>
  generateDungeon({ width: 41, height: 30, rooms: 8, seed: 20260919, deco: 4, ...opts }, { flags, meta });

describe("地牢生成器", () => {
  it("material 推导：Dungeon 图集应能推出地面与墙候选", () => {
    const mats = deriveMaterials(meta, flags);
    expect(mats.flats.length).toBeGreaterThan(0);
    expect(mats.walls.length).toBeGreaterThan(0);
    for (const id of mats.flats) expect(blocked(id), `地面 ${id} 应可通行`).toBe(0);
    for (const id of mats.walls) expect(blocked(id), `墙 ${id} 应实心`).not.toBe(0);
  });

  it("6 层结构与尺寸正确", () => {
    const { map } = gen({});
    const n = map.width * map.height;
    expect(map.width).toBe(41);
    expect(map.height).toBe(30);
    expect(map.data.length).toBe(6 * n);
    expect(map.tilesetId).toBe(TILESET_ID);
    expect(map.events).toEqual([]);
  });

  it("相同种子可复现", () => {
    const a = gen({ seed: 42 }).map.data;
    const b = gen({ seed: 42 }).map.data;
    expect(a).toEqual(b);
    const c = gen({ seed: 43 }).map.data;
    expect(a).not.toEqual(c);
  });

  it("墙面实心、地面（未被实心摆设占用）可通行，且从 spawn 全连通", () => {
    for (const seed of [20260919, 12345, 777, 20260101]) {
      const { map, info } = gen({ seed });
      const grid = buildPassGrid(map, flags);
      expect(grid[info.spawn[1]][info.spawn[0]], `seed ${seed} spawn 应可通行`).toBe(0);
      let walkable = 0;
      for (let y = 0; y < map.height; y++)
        for (let x = 0; x < map.width; x++) if (grid[y][x] === 0) walkable++;
      // buildPassGrid 统计的可走格 = 生成器统计的可走格（== 连通的格数）
      expect(walkable, `seed ${seed} 可走格数`).toBe(info.walkable);
      expect(info.reachable, `seed ${seed} 应全连通`).toBe(info.walkable);
    }
  });

  it("所有 tileId 合法、落在图集范围（自动瓦片 quad / 普通瓦片坐标不越界）", () => {
    const { map } = gen({ theme: "stone" });
    const n = map.width * map.height;
    for (let z = 0; z < 6; z++) {
      for (let i = 0; i < n; i++) {
        const id = map.data[z * n + i];
        if (!id) continue;
        expect(id).toBeLessThan(8192);
        if (isAutotile(id)) {
          const { setNumber, quads } = autotileQuads(id, 0);
          const a = atlas[setNumber];
          expect(a, `tileId ${id} 缺少图集 ${setNumber}`).toBeTruthy();
          for (const q of quads) {
            expect(q.sx).toBeGreaterThanOrEqual(0);
            expect(q.sy).toBeGreaterThanOrEqual(0);
            expect(q.sx + q.sw).toBeLessThanOrEqual(a.w);
            expect(q.sy + q.sh).toBeLessThanOrEqual(a.h);
          }
        } else {
          const { setNumber, sx, sy } = normalTileSource(id);
          const a = atlas[setNumber];
          expect(a, `tileId ${id} 缺少图集 ${setNumber}`).toBeTruthy();
          expect(sx + 48).toBeLessThanOrEqual(a.w);
          expect(sy + 48).toBeLessThanOrEqual(a.h);
        }
      }
    }
  });

  it("每个主题都能生成，且地面/墙按主题解析", () => {
    for (const [name, th] of Object.entries(THEMES)) {
      const { map, info } = gen({ theme: name });
      expect(info.floorId, `主题 ${name}`).toBe(th.floor);
      expect(info.wallId).toBe(th.wall);
      const n = map.width * map.height;
      // 层 0 只出现「地面 id」或「墙基准 + shape(0..15)」
      for (let i = 0; i < n; i++) {
        const id = map.data[i];
        if (id === info.floorId) continue;
        expect(id - info.wallId).toBeGreaterThanOrEqual(0);
        expect(id - info.wallId).toBeLessThanOrEqual(15);
      }
    }
  });

  it("关闭装饰时无随机装饰，但出入口仍在", () => {
    const { map, info } = gen({ deco: 0 });
    const n = map.width * map.height;
    const ids = map.data.slice(2 * n, 4 * n).filter((v: number) => v);
    expect([...ids].sort()).toEqual([info.entranceTile, info.exitTile].sort());
  });

  it("每个地牢都有入口和出口（Dungeon_B 固定两格，且都可通行）", () => {
    for (const seed of [1, 20260919, 777]) {
      const { map, info } = gen({ seed });
      const n = map.width * map.height;
      const at = (x: number, y: number) => map.data[2 * n + y * map.width + x];
      expect(info.entranceTile).toBe(26); // 第4行第3个
      expect(info.exitTile).toBe(18);     // 第3行第3个
      expect(at(info.entrance[0], info.entrance[1])).toBe(26);
      expect(at(info.exit[0], info.exit[1])).toBe(18);
      const grid = buildPassGrid(map, flags);
      expect(grid[info.entrance[1]][info.entrance[0]], `seed ${seed} 入口应可通行`).toBe(0);
      expect(grid[info.exit[1]][info.exit[0]], `seed ${seed} 出口应可通行`).toBe(0);
    }
  });

  it("开启装饰时装饰摆在地板格上，且不破坏连通性", () => {
    const { map, info } = gen({ deco: 6 });
    const n = map.width * map.height;
    const decoIds = map.data.slice(2 * n, 4 * n).filter((v: number) => v);
    expect(decoIds.length).toBeGreaterThan(0);
    expect(info.reachable).toBe(info.walkable);
  });

  it("edge 模式：远离地面的格子留空(透明)，地板数与连通性不变", () => {
    const fill = gen({ wallMode: "fill" });
    const edge = gen({ wallMode: "edge" });
    const n = fill.map.width * fill.map.height;
    const zeros = (m: { data: number[] }) => m.data.slice(0, n).filter((v: number) => v === 0).length;
    expect(zeros(fill.map)).toBe(0);
    expect(zeros(edge.map)).toBeGreaterThan(0);
    expect(edge.info.floors).toBe(fill.info.floors);
    expect(edge.info.reachable).toBe(edge.info.walkable);
  });

  it("edge + 暗块留空：无 0 格，暗块不可通行", () => {
    const { map, info } = gen({ wallMode: "edge", voidTile: 1536 });
    const n = map.width * map.height;
    expect(map.data.slice(0, n).filter((v: number) => v === 0).length).toBe(0);
    const grid = buildPassGrid(map, flags);
    let walk = 0;
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) if (grid[y][x] === 0) walk++;
    expect(walk).toBe(info.walkable);
  });

  it("两个墙 tile：外框/内部、随机混用分别落到 A/B", () => {
    const walls = listWallBases(flags, meta);
    expect(walls.length).toBeGreaterThan(1);
    const outer = gen({ wallA: walls[0], wallB: walls[1], wallPairMode: "outerInner" }).map;
    // (0,0) 属于外框 → 用墙 A（base + shape 0..15）
    expect(outer.data[0] - walls[0]).toBeGreaterThanOrEqual(0);
    expect(outer.data[0] - walls[0]).toBeLessThanOrEqual(15);
    const mixed = gen({ wallA: walls[0], wallB: walls[1], wallPairMode: "mix" }).map;
    const ids = [...new Set(mixed.data.slice(0, mixed.width * mixed.height).filter((v: number) => v))];
    const inRange = (base: number) => ids.some(v => v >= base && v <= base + 15);
    expect(inRange(walls[0]) && inRange(walls[1])).toBe(true);
  });

  it("显式指定地面/墙 tile 会被采用", () => {
    const floors = listFloorTiles(flags, meta);
    const walls = listWallBases(flags, meta);
    const { info } = gen({ floorId: floors[3], wallA: walls[2] });
    expect(info.floorId).toBe(floors[3]);
    expect(info.wallA).toBe(walls[2]);
  });

  it("出口右侧是墙（贴墙生成，fill 模式）", () => {
    for (const seed of [1, 777, 12345, 20260919]) {
      const { map, info } = gen({ seed });
      const right = map.data[info.exit[1] * map.width + info.exit[0] + 1];
      expect(isAutotile(right), `seed ${seed} 出口右侧应为墙`).toBe(true);
      expect((flags[right] || 0) & 0x0f, `seed ${seed} 右侧应为实心墙`).not.toBe(0);
    }
  });

  it("出口位于距入口最远处（为贴墙允许在附近微调）", () => {
    for (const seed of [1, 777, 12345, 20260919]) {
      const { map, info } = gen({ seed });
      const grid = buildPassGrid(map, flags);
      const W = map.width, H = map.height;
      const dist = Array.from({ length: H }, () => Array(W).fill(-1));
      const s = [info.spawn[0], info.spawn[1]];
      dist[s[1]][s[0]] = 0;
      const q = [s];
      let maxD = 0;
      for (let i = 0; i < q.length; i++) {
        const [x, y] = q[i];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || dist[ny][nx] >= 0 || grid[ny][nx] !== 0) continue;
          dist[ny][nx] = dist[y][x] + 1;
          if (dist[ny][nx] > maxD) maxD = dist[ny][nx];
          q.push([nx, ny]);
        }
      }
      const e = info.exit;
      expect(dist[e[1]][e[0]], `seed ${seed} 出口应可达`).toBeGreaterThan(0);
      expect(dist[e[1]][e[0]], `seed ${seed} 出口应在最远处`).toBeGreaterThanOrEqual(maxD - 4);
    }
  });
});
