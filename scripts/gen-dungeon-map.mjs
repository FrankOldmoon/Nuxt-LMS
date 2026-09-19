#!/usr/bin/env node
/**
 * gen-dungeon-map.mjs —— 命令行生成 RPG Maker MV 地牢地图 JSON
 *
 * 生成逻辑在 modules/mmo/gamejs/rpg/dungeonGen.js（与 /mmo-tileset 的「随机生成地牢」按钮共用）。
 * 本脚本只负责：读 tilesets/Tilesets.json(flags) + semantic meta → 调 generateDungeon → 写文件 + 打印预览。
 *
 * 用法：
 *   node scripts/gen-dungeon-map.mjs
 *   node scripts/gen-dungeon-map.mjs --w 48 --h 34 --rooms 10 --seed 1234 \
 *     --theme brick --deco 3 --out game_assets/mmo/maps/Map_New_Dungeon.json
 * 参数：--w --h --rooms --seed --theme(stone|brick|cobble|marble|ice|crypt)
 *       --deco(每房间装饰数,0=关) --tileset --meta <semantic.json 相对 game_assets/mmo>
 *       --out --preview(no 关闭 ASCII 预览)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateDungeon, THEMES } from '../modules/mmo/gamejs/rpg/dungeonGen.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = path.join(ROOT, 'game_assets/mmo')

function arg(name, def) {
  const i = process.argv.indexOf('--' + name)
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def
}
const TILESET_ID = Number(arg('tileset', 4))
const META_REL = arg('meta', 'tilesets/meta/4_地牢.semantic.json')
const OUT = path.join(ROOT, arg('out', 'game_assets/mmo/maps/Map_New_Dungeon.json'))
const THEME = arg('theme', 'stone')

const tilesets = JSON.parse(fs.readFileSync(path.join(ASSETS, 'tilesets/Tilesets.json'), 'utf8'))
const flags = tilesets[TILESET_ID].flags || []
const meta = JSON.parse(fs.readFileSync(path.join(ASSETS, META_REL), 'utf8'))

const { map, info } = generateDungeon({
  width: Number(arg('w', 41)),
  height: Number(arg('h', 30)),
  rooms: Number(arg('rooms', 8)),
  seed: Number(arg('seed', 20260919)),
  theme: THEME,
  deco: Number(arg('deco', 2)),
  floorId: Number(arg('floor', 0)) || 0,
  wallA: Number(arg('wallA', 0)) || 0,
  wallB: Number(arg('wallB', 0)) || 0,
  wallMode: arg('wall-mode', 'fill'),
  wallPairMode: arg('wall-pair', ''),
  voidTile: Number(arg('void', 0)) || 0,
  tilesetId: TILESET_ID,
}, { flags, meta })

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(map))

const n = map.width * map.height
const decoCount = map.data.slice(2 * n, 3 * n).filter(v => v).length + map.data.slice(3 * n, 4 * n).filter(v => v).length
console.log(`tileset=${TILESET_ID}  ${map.width}x${map.height}  theme=${THEME}  rooms=${info.rooms}  seed=${info.seed}`)
console.log(`可用主题：${Object.keys(THEMES).join(' / ')}`)
console.log(`地面 FLOOR_ID=${info.floorId}  墙 A=${info.wallA} / B=${info.wallB}(${info.wallPairMode})  铺墙模式=${info.wallMode}  装饰 ${decoCount} 个`)
console.log(`地板格 ${info.floors}（可走 ${info.walkable}，实心摆设 ${info.deco.propsKept}），可达 ${info.reachable} ${info.reachable === info.walkable ? '✓ 全连通' : '✗ 有孤岛'}`)
console.log(`建议 spawn（写入 maps.json / 副本 json 的 map.spawn）：[${info.spawn[0]}, ${info.spawn[1]}]`)
console.log(`入口 [${info.entrance}] tile#${info.entranceTile}   出口 [${info.exit}] tile#${info.exitTile}`)
console.log(`已写出：${path.relative(ROOT, OUT)}`)

if (arg('preview', 'yes') !== 'no') {
  const W = map.width, H = map.height
  console.log('\n预览（# 墙 / . 地面 / o 装饰 / S 入口 / X 出口）：')
  for (let y = 0; y < H; y++) {
    let line = ''
    for (let x = 0; x < W; x++) {
      if (x === info.exit[0] && y === info.exit[1]) { line += 'X'; continue }
      if (x === info.spawn[0] && y === info.spawn[1]) { line += 'S'; continue }
      const d = map.data[2 * n + y * W + x] || map.data[3 * n + y * W + x]
      line += d ? 'o' : (map.data[y * W + x] >= 5888 && (flags[map.data[y * W + x]] & 0x0f) ? '#' : '.')
    }
    console.log(line)
  }
}
