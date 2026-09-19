/**
 * 章节副本生成器单元测试
 *
 * 逻辑在 modules/mmo/gamejs/rpg/chapterInstance.js：
 *   - 层数 = 二级标题数量（第一层额外并入章节标题 heading 与其上方前置内容）
 *   - 键位与 LMS useChapterTask 对齐（可阅读块=顶层块下标；任务=`type:cid`）
 *   - 出口瓦片生成时抹掉（本层完成后由场景动态出现），门带 lock.layer
 *   - 墙面/地面直接由 chapterId 对候选集取模
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildChapterLayers, generateChapterLayers, isLayerDone, layerProgress, CHAPTER_EXIT } from "../../gamejs/rpg/chapterInstance.js";
import { listFloorTiles, listWallBases } from "../../gamejs/rpg/dungeonGen.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const ASSETS = path.join(ROOT, "game_assets/mmo");
const TILESET_ID = 4;

const tilesets = JSON.parse(fs.readFileSync(path.join(ASSETS, "tilesets/Tilesets.json"), "utf8"));
const flags = tilesets[TILESET_ID].flags;

const text = (t: string) => ({ type: "text", text: t });
const para = (t: string) => ({ type: "paragraph", content: [text(t)] });
const heading = (level: number, id: string, t: string) => ({ type: "heading", attrs: { level, id }, content: [text(t)] });

const CHAPTER_ID = 92;

// 章节内容：1 段前置说明 + 2 个二级标题（其一含 codeBlock/question/H3），共 2 层
const content = {
  type: "doc",
  content: [
    para("intro"),                                            // 0
    heading(2, "h2a", "A"),                                   // 1
    { type: "codeBlock", content: [text("code line")] },      // 2
    { type: "vue", attrs: { type: "question", content: 11 } },// 3
    heading(3, "h3a", "A.1"),                                 // 4
    para("detail"),                                           // 5
    heading(2, "h2b", "B"),                                   // 6
    { type: "blockquote", content: [para("quote")] },         // 7
  ],
};

describe("章节副本：内容 → 层结构", () => {
  it("层数 = 二级标题数；第一层并入章节标题 heading 与前置内容", () => {
    const { layers } = buildChapterLayers(content, CHAPTER_ID);
    expect(layers).toHaveLength(2);
    expect(layers[0].headingIds).toEqual([String(CHAPTER_ID), "h2a", "h3a"]);
    expect(layers[1].headingIds).toEqual(["h2b"]);
  });

  it("可阅读块 key = 顶层块下标（与 LMS blockLayout 对齐）", () => {
    const { layers } = buildChapterLayers(content, CHAPTER_ID);
    const blockingReadKeys = (l: (typeof layers)[number]) =>
      l.reads.filter((r: any) => !r.soft).map((r: any) => r.key).sort();
    // 第一层：h2a 标题(1)、codeBlock(2)、h3a 标题(4)
    expect(blockingReadKeys(layers[0])).toEqual(["1", "2", "4"]);
    // 第二层：h2b 标题(6)、blockquote(7)
    expect(blockingReadKeys(layers[1])).toEqual(["6", "7"]);
    // 段落(0/5)为 soft、不阻塞；连续纯文字合并为一个笔记 NPC
    expect(layers[0].reads.filter((r: any) => r.soft).map((r: any) => r.key)).toEqual(["soft:0", "soft:1"]);
  });

  it("可提交任务 key = `type:cid`，归属所在层", () => {
    const { layers } = buildChapterLayers(content, CHAPTER_ID);
    expect(layers[0].tasks.map((t: any) => t.key)).toEqual(["question:11"]);
    expect(layers[1].tasks).toEqual([]);
  });

  it("无二级标题时兜底为单层", () => {
    const flat = { type: "doc", content: [para("only"), heading(3, "x", "X"), para("y")] };
    const { layers } = buildChapterLayers(flat, CHAPTER_ID);
    expect(layers).toHaveLength(1);
    expect(layers[0].headingIds).toContain(String(CHAPTER_ID));
    expect(layers[0].headingIds).toContain("x");
  });
});

describe("章节副本：层完成判定", () => {
  const { layers } = buildChapterLayers(content, CHAPTER_ID);

  it("全部 heading 完成才算完成", () => {
    expect(isLayerDone(layers[0], {})).toBe(false);
    expect(isLayerDone(layers[0], { "92": true, h2a: true })).toBe(false);
    expect(isLayerDone(layers[0], { "92": true, h2a: true, h3a: true })).toBe(true);
  });

  it("进度 = 已完成 heading / 总 heading", () => {
    expect(layerProgress(layers[0], { "92": true })).toEqual({ done: 1, total: 3 });
    expect(layerProgress(layers[1], { h2b: true })).toEqual({ done: 1, total: 1 });
  });
});

describe("章节副本：地牢生成", () => {
  const built = generateChapterLayers({ content, chapterId: CHAPTER_ID, flags });
  const floors = listFloorTiles(flags);
  const walls = listWallBases(flags);

  it("每层一张地牢，mapId 规则正确", () => {
    expect(built.layers).toHaveLength(2);
    expect(built.layers[0].mapId).toBe(`chap_${CHAPTER_ID}_0`);
    expect(built.layers[1].mapId).toBe(`chap_${CHAPTER_ID}_1`);
    expect(built.layers[0].cfg.type).toBe("chapter");
    expect(built.layers[0].cfg._mapObj).toBe(built.layers[0].map);
  });

  it("墙面/地面直接由 chapterId 对候选集取模", () => {
    const f = floors[((CHAPTER_ID % floors.length) + floors.length) % floors.length];
    const w = walls[((CHAPTER_ID % walls.length) + walls.length) % walls.length];
    for (const L of built.layers) {
      expect(L.info.floorId).toBe(f);
      expect(L.info.wallId).toBe(w);
    }
  });

  it("出口瓦片生成时被抹掉（z2 为空）", () => {
    for (const L of built.layers) {
      const n = L.map.width * L.map.height;
      const ex = L.info.exit;
      expect(L.map.data[2 * n + ex[1] * L.map.width + ex[0]]).toBe(0);
    }
  });

  it("门带 lock.layer；中间层通向下一层，最后一层出口 = 通关离开副本", () => {
    expect(built.layers[0].doors[0].lock).toEqual({ layer: 0 });
    expect(built.layers[0].doors[0].to).toBe(`chap_${CHAPTER_ID}_1`);
    expect(built.layers[0].doors[0].exit).toBeFalsy();
    expect(built.layers[1].doors[0].lock).toEqual({ layer: 1 });
    expect(built.layers[1].doors[0].to).toBe(CHAPTER_EXIT);
    expect(built.layers[1].doors[0].exit).toBe(true);
  });

  it("items 严格保持 content 文档顺序（决定 NPC/敌人在副本中的先后）", () => {
    const { layers } = buildChapterLayers(content, CHAPTER_ID);
    // 第一层文档顺序：soft(intro) → h2a 标题 → codeBlock → question → h3a 标题 → soft(detail)
    expect(layers[0].items.map((i: any) => i.cat)).toEqual(["read", "read", "read", "task", "read", "read"]);
    expect(layers[0].items.map((i: any) => i.key)).toEqual(["soft:0", "1", "2", "question:11", "4", "soft:1"]);
    // 第二层：h2b 标题 → blockquote
    expect(layers[1].items.map((i: any) => i.key)).toEqual(["6", "7"]);
  });

  it("可阅读块 → NPC；可提交任务 → 敌人，键位正确", () => {
    const L = built.layers[0];
    expect(L.npcs).toHaveLength(L.layer.reads.length);
    expect(L.enemies).toHaveLength(L.layer.tasks.length);
    const en = L.enemies[0];
    expect(en.taskType).toBe("question");
    expect(en.taskCid).toBe(11);
    expect(en.taskKey).toBe("question:11");
    expect(en.map).toBe(L.mapId);
    // 可阅读块 NPC（codeBlock key '2'）—— 归属 heading h2a（供游戏内 ❗ 提示判断）
    const readNpc = L.npcs.find((n: any) => n.readKey === "2");
    expect(readNpc).toBeTruthy();
    expect(readNpc.headingId).toBe("h2a");
    // soft 块不携带 readKey（不阻塞）
    expect(L.npcs.find((n: any) => n.readKey === "" && !n.taskKey)).toBeTruthy();
  });
});
