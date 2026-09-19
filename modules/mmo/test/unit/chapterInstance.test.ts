/**
 * 章节副本生成器单元测试
 *
 * 逻辑在 modules/mmo/gamejs/rpg/chapterInstance.js：
 *   - 层数 = 二级标题数量（第一层额外并入章节标题 heading 与其上方前置内容）
 *   - 每层是「一条直线走廊」：交互体严格按文档顺序从左到右排列（不再随机生成地牢）
 *   - 章节里**每个顶层内容块**都有对应交互体，不忽略任何内容：
 *       必读块（标题/codeBlock/blockquote）→ 带 ❗ 的 NPC（readKey 计入 LMS 完成条件）
 *       纯文字 → 对话框；图片/表格/自定义扩展框 → LMS 原始组件渲染；可提交互动 → 敌人
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

// 章节内容：前置说明 + 2 个二级标题（含 codeBlock/question/H3/图片/自定义扩展框/引用），共 2 层
const content = {
  type: "doc",
  content: [
    para("intro"),                                              // 0 纯文字
    heading(2, "h2a", "A"),                                     // 1 必读（标题 → 对话框）
    { type: "codeBlock", content: [text("code line")] },        // 2 必读（代码块 → 原组件）
    { type: "vue", attrs: { type: "question", content: 11 } },  // 3 任务 → 敌人
    heading(3, "h3a", "A.1"),                                   // 4 必读（标题）
    para("detail"),                                             // 5 纯文字
    { type: "image", attrs: { src: "/a.png" } },                // 6 图片 → 原组件
    { type: "vue", attrs: { type: "mindmap", content: "{}" } }, // 7 自定义扩展框 → 原组件
    heading(2, "h2b", "B"),                                     // 8 必读（标题）
    { type: "blockquote", content: [para("quote")] },           // 9 必读（引用 → 原组件）
  ],
};

describe("章节副本：内容 → 层结构", () => {
  it("层数 = 二级标题数；第一层并入章节标题 heading 与前置内容", () => {
    const { layers } = buildChapterLayers(content, CHAPTER_ID);
    expect(layers).toHaveLength(2);
    expect(layers[0].headingIds).toEqual([String(CHAPTER_ID), "h2a", "h3a"]);
    expect(layers[1].headingIds).toEqual(["h2b"]);
  });

  it("必读块（标题/codeBlock/blockquote）key = 顶层块下标（与 LMS blockLayout 对齐）", () => {
    const { layers } = buildChapterLayers(content, CHAPTER_ID);
    // 第一层：h2a 标题(1)、codeBlock(2)、h3a 标题(4)
    expect(layers[0].reads.map((r: any) => r.key).sort()).toEqual(["1", "2", "4"]);
    // 第二层：h2b 标题(8)、blockquote(9)
    expect(layers[1].reads.map((r: any) => r.key).sort()).toEqual(["8", "9"]);
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

  it("items 严格保持 content 文档顺序（决定走廊内的先后）", () => {
    const { layers } = buildChapterLayers(content, CHAPTER_ID);
    expect(layers[0].items.map((i: any) => i.cat)).toEqual([
      "text", "read", "read", "task", "read", "text", "rich", "rich",
    ]);
    expect(layers[0].items.map((i: any) => i.key)).toEqual([
      "soft:0", "1", "2", "question:11", "4", "soft:1", "rich:6", "rich:7",
    ]);
    expect(layers[1].items.map((i: any) => i.key)).toEqual(["8", "9"]);
  });

  it("空段落不生成交互体（无内容可展示）", () => {
    const withEmpty = {
      type: "doc",
      content: [heading(2, "h", "H"), { type: "paragraph" }, para("real")],
    };
    const { layers } = buildChapterLayers(withEmpty, CHAPTER_ID);
    // 只有 标题(必读) + 纯文字(real) 两个交互体
    expect(layers[0].items).toHaveLength(2);
    expect(layers[0].items[1].lines.join("")).toContain("real");
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

describe("章节副本：直线走廊布局", () => {
  const built = generateChapterLayers({ content, chapterId: CHAPTER_ID, flags });
  const floors = listFloorTiles(flags);
  const walls = listWallBases(flags);

  it("每层一张地图，mapId 规则正确", () => {
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

  it("内容点沿一条直线等距排列：入口在最左、出口在最右", () => {
    for (const L of built.layers) {
      const items = L.layer.items;
      const spots = L.info.spots;
      expect(spots).toHaveLength(items.length);
      // 同一条直线（同一行）
      for (const s of spots) expect(s[1]).toBe(spots[0][1]);
      // 严格从左到右
      for (let k = 1; k < spots.length; k++) expect(spots[k][0]).toBeGreaterThan(spots[k - 1][0]);
      // 入口在内容点左侧、出口在内容点右侧
      expect(L.spawn[0]).toBeLessThan(spots[0][0]);
      expect(L.info.exit[0]).toBeGreaterThan(spots[spots.length - 1][0]);
    }
  });

  it("NPC / 敌人严格按文档顺序落在对应内容点上", () => {
    const L = built.layers[0];
    const spots = L.info.spots;
    L.layer.items.forEach((it: any, k: number) => {
      const hit = [...L.npcs, ...L.enemies].find((d: any) => d.tile[0] === spots[k][0] && d.tile[1] === spots[k][1]);
      expect(hit, `第 ${k} 个内容点应有交互体`).toBeTruthy();
    });
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
});

describe("章节副本：内容块 → 游戏内交互体（不忽略任何内容）", () => {
  const built = generateChapterLayers({ content, chapterId: CHAPTER_ID, flags });
  const L = built.layers[0];

  it("交互体总数 = 内容项数（敌人 + NPC）", () => {
    expect(L.npcs.length + L.enemies.length).toBe(L.layer.items.length);
    expect(L.enemies).toHaveLength(L.layer.tasks.length);
    const en = L.enemies[0];
    expect(en.taskType).toBe("question");
    expect(en.taskCid).toBe(11);
    expect(en.taskKey).toBe("question:11");
    expect(en.map).toBe(L.mapId);
  });

  it("可提交互动 → 敌人；必读块 → 带 ❗（readKey）的 NPC", () => {
    // 只有必读块带 readKey（游戏内头顶 ❗，并计入 LMS 完成条件）
    expect(L.npcs.filter((n: any) => n.readKey).map((n: any) => n.readKey).sort()).toEqual(["1", "2", "4"]);
    // 必读块 codeBlock（key '2'）归属 heading h2a，用原始组件渲染
    const code = L.npcs.find((n: any) => n.readKey === "2");
    expect(code.headingId).toBe("h2a");
    expect(code.render).toBe("component");
    // 必读标题（key '1'）用对话框渲染
    const h2 = L.npcs.find((n: any) => n.readKey === "1");
    expect(h2.render).toBe("dialog");
    // 引用（第二层）也是必读块
    const quote = built.layers[1].npcs.find((n: any) => n.readKey === "9");
    expect(quote.render).toBe("component");
  });

  it("图片 / 各种自定义扩展框 → 用 LMS 原始组件渲染（nodeIndex 指回原内容块）", () => {
    const img = L.npcs.find((n: any) => n.nodeIndex === 6);
    expect(img).toBeTruthy();
    expect(img.render).toBe("component");
    expect(img.readKey).toBe("");
    const widget = L.npcs.find((n: any) => n.nodeIndex === 7);
    expect(widget).toBeTruthy();
    expect(widget.render).toBe("component");
  });

  it("纯文字 → 对话框渲染，且不阻塞进度（无 readKey）", () => {
    const textNpc = L.npcs.find((n: any) => n.render === "dialog" && !n.readKey && n.nodeIndex == null);
    expect(textNpc).toBeTruthy();
    expect(String(textNpc.lines.join("")).includes("intro")).toBe(true);
  });
});
