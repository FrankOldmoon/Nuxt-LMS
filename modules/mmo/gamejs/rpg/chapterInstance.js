/* chapterInstance.js —— 把 LMS 章节内容编译成 MMO 副本（每个二级标题 = 一层地牢）
 *
 * 设计目标：复用 LMS 既有的章节进度口径（modules/lms/composables/useChapterTask.ts），
 * 让游戏内的一切完成动作都能直接落回 chapter.progress：
 *   - 题目/作业/评论/测验等可提交组件 → 游戏里弹出 LMS 原生渲染弹窗作答
 *   - 标题 / codeBlock / blockquote 等「可阅读块」 → 以 NPC 对话形式呈现，读完即标记已读
 *   - 其余纯文字（段落/图片/列表…） → 以 NPC 对话形式呈现，可选、不阻塞出口
 *
 * 键位与 LMS 严格对齐（否则 markBlockRead / reportNodeDone 无法命中 heading）：
 *   - 可阅读块 key = 顶层块下标（String(index)），与 blockLayout.blockToHeading 一致
 *   - 可提交任务 key = `${type}:${cid}`
 *   - heading id 取 attrs.id / attrs['data-toc-id']
 *
 * 层数 = 二级标题数量（第一层额外包含章节标题 heading 及其上方的前置内容）。
 * 出口瓦片在生成时抹掉，待本层全部 heading 完成后由场景动态「出现」。
 *
 * 地牢随机种子 = chapterId（层号参与），墙面/地面按 chapterId 对候选集取模选取。
 */
import { generateDungeon, listFloorTiles, listWallBases } from "./dungeonGen.js";
import { t } from "../i18n.js";

const SUBMITTABLE = new Set(["question", "homework", "comment", "quiz", "race"]);
const READABLE = new Set(["codeBlock", "blockquote"]);
// 最后一层出口的哨兵目标：不切场景，而是离开副本、回到章节页面
export const CHAPTER_EXIT = "__chapter_exit__";
const TASK_LABEL_KEY = {
  question: "chapterInst.taskQuestion",
  homework: "chapterInst.taskHomework",
  comment: "chapterInst.taskComment",
  quiz: "chapterInst.taskQuiz",
  race: "chapterInst.taskRace",
};

const headingIdOf = (node) => (node && node.attrs && (node.attrs.id || node.attrs["data-toc-id"])) || "";
const levelOf = (node) => Number(node && node.attrs && node.attrs.level) || 1;

/** 纯文本提取；段落之间补换行，代码块保留原始换行 */
function textOf(node) {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";
  const parts = [];
  if (Array.isArray(node.content)) for (const c of node.content) parts.push(textOf(c));
  const sep = node.type === "doc" || node.type === "codeBlock" ? "\n" : "";
  return parts.join(sep);
}

/** 把长文本切成对话分页：按行分组、超长行折行、总量封顶 */
function paginate(text, maxLines = 4, maxPages = 20) {
  const raw = String(text || "").replace(/\r/g, "").split("\n");
  const lines = [];
  for (const l of raw) {
    if (l.length <= 50) { lines.push(l); continue; }
    for (let i = 0; i < l.length; i += 50) lines.push(l.slice(i, i + 50));
  }
  const pages = [];
  let cur = [];
  for (const l of lines) {
    if (!l.trim() && cur.length === 0) continue;
    cur.push(l);
    if (cur.length >= maxLines) { pages.push(cur.join("\n")); cur = []; }
  }
  if (cur.length) pages.push(cur.join("\n"));
  const out = pages.filter((p) => p.trim());
  if (out.length === 0) return [""];
  if (out.length > maxPages) return [...out.slice(0, maxPages - 1), t("chapterInst.more")];
  return out;
}

/**
 * 解析章节内容 → 层结构（纯函数，可单测）。
 * @param content tiptap JSON doc
 * @param chapterId 章节 id（章节标题 heading 的 id）
 * @returns { layers: Array<{ index, kind, title, headingIds, reads, tasks }> }
 */
export function buildChapterLayers(content, chapterId) {
  const blocks = Array.isArray(content && content.content) ? content.content : [];
  const rootId = String(chapterId);
  const layers = [];

  // 预扫：每个顶层标题下方是否有内容（无内容的标题不作为必读块，与 blockLayout 一致）
  const belowHasAny = new Map();
  let lastHeadIdx = -1;
  blocks.forEach((b, i) => {
    if (!b) return;
    if (b.type === "heading") {
      if (headingIdOf(b)) lastHeadIdx = i;
      return;
    }
    if (lastHeadIdx >= 0) belowHasAny.set(lastHeadIdx, true);
  });

  // 前置内容（首个二级标题之前）：归属章节标题 heading，最终并入第一层
  const intro = { headingIds: [rootId], items: [] };
  let cur = null; // 当前层
  let curHeadingId = rootId; // 当前所属 heading（用于记录每个阅读块/任务归属，供游戏内 ❗ 提示判断）
  // items 严格按「文档顺序」追加；reads/tasks 为派生视图（用于门控/统计）
  const pushRead = (item) => (cur || intro).items.push({ cat: "read", headingId: curHeadingId, ...item });
  const pushTask = (item) => (cur || intro).items.push({ cat: "task", headingId: curHeadingId, ...item });
  const startLayer = (title, headingId) => {
    const first = layers.length === 0;
    cur = {
      index: layers.length, kind: "section", title: title || "",
      headingIds: first ? [...intro.headingIds, ...(headingId ? [headingId] : [])] : (headingId ? [headingId] : []),
      items: first ? [...intro.items] : [],
    };
    layers.push(cur);
    return cur;
  };

  // 连续纯文字块合并为一个「笔记」对话（避免每个段落都生成一个 NPC）
  let softBuf = [];
  let softIdx = 0;
  const flushSoft = () => {
    if (!softBuf.length) return;
    const text = softBuf.join("\n").trim();
    softBuf = [];
    if (text) pushRead({ key: `soft:${softIdx++}`, kind: "soft", soft: true, label: t("chapterInst.textBlock"), lines: paginate(text) });
  };

  blocks.forEach((b, i) => {
    if (!b) return;
    if (b.type === "heading") {
      flushSoft();
      const hid = headingIdOf(b);
      const lv = levelOf(b);
      const text = textOf(b).trim();
      if (hid) curHeadingId = hid;
      if (lv <= 2) {
        // 二级标题 → 新的一层。无 id 的标题仍作为层边界，但不参与门控（服务端也不认它）
        startLayer(text, hid || null);
      } else if (cur) {
        if (hid) cur.headingIds.push(hid); // 三级及更深 → 并入当前层
      } else {
        startLayer(text, hid || null); // 三级标题出现在任何二级标题之前：兜底建层
      }
      // 标题自身作为必读块（其下方确实有内容、且标题带 id 时才需要）
      if (hid && belowHasAny.get(i)) {
        pushRead({ key: String(i), kind: "heading", label: text, lines: paginate(text) });
      }
      return;
    }

    if (b.type === "vue" && SUBMITTABLE.has(b.attrs && b.attrs.type)) {
      flushSoft();
      const type = b.attrs.type;
      const cid = Number(b.attrs.content) || 0;
      if (!cid) return;
      const label = t(TASK_LABEL_KEY[type] || "chapterInst.taskNpc");
      pushTask({
        key: `${type}:${cid}`, type, cid, label,
        lines: [t("chapterInst.taskTip", { name: label })],
      });
      return;
    }

    if (READABLE.has(b.type)) {
      flushSoft();
      const text = textOf(b).trim();
      pushRead({
        key: String(i), kind: "block",
        label: t("chapterInst.readBlock"),
        lines: text ? paginate(text) : [t("chapterInst.emptyBlock")],
      });
      return;
    }

    // 其余图文块（段落/图片/列表…）：LMS 不计入完成条件，合并为可选「笔记」对话，不阻塞出口
    const text = textOf(b).trim();
    if (text) softBuf.push(text);
  });
  flushSoft();

  // 整章没有任何标题：兜底把前置内容作为唯一一层
  if (layers.length === 0) {
    layers.push({ index: 0, kind: "section", title: "", headingIds: [...intro.headingIds], items: [...intro.items] });
  }

  // 派生 reads / tasks 视图（保持文档顺序；items 为权威顺序）
  for (const l of layers) {
    l.reads = l.items.filter((i) => i.cat === "read");
    l.tasks = l.items.filter((i) => i.cat === "task");
  }

  return { layers };
}

/** 该层是否完成（子树内所有 heading 均已通过）；无 id 可门控时视为完成，避免软锁 */
export function isLayerDone(layer, taskStatus) {
  const ids = layer.headingIds || [];
  if (ids.length === 0) return true;
  return ids.every((id) => taskStatus && taskStatus[id] === true);
}

/** 层进度（已完成 heading / 总 heading） */
export function layerProgress(layer, taskStatus) {
  const ids = layer.headingIds || [];
  const done = ids.filter((id) => taskStatus && taskStatus[id] === true).length;
  return { done, total: ids.length };
}

/** 收集地图上所有可通行格（用于摆放交互体） */
function walkableCells(map, flags) {
  const cells = [];
  const W = map.width, H = map.height;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const id = Number(map.data[y * W + x]) || 0;
      if (!id) continue;
      const f = flags[id] || 0;
      if ((f & 0x0f) !== 0 || (f & 0x10)) continue; // 不可通行 / 头顶装饰
      cells.push([x, y]);
    }
  }
  return cells;
}

/** 从出生点做 BFS，把可通行格按距离排序（越远越靠后） */
function orderByDistance(cells, map, spawn) {
  const W = map.width;
  const dist = new Map();
  const key = (x, y) => y * W + x;
  const walk = new Set(cells.map(([x, y]) => key(x, y)));
  const start = key(spawn[0], spawn[1]);
  if (!walk.has(start)) return cells;
  dist.set(start, 0);
  const q = [[spawn[0], spawn[1]]];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (!walk.has(k) || dist.has(k)) continue;
      dist.set(k, dist.get(key(x, y)) + 1);
      q.push([nx, ny]);
    }
  }
  return cells.slice().sort((a, b) => (dist.get(key(a[0], a[1])) ?? 1e9) - (dist.get(key(b[0], b[1])) ?? 1e9));
}

/**
 * 生成章节副本的所有层。
 * @param opts { content, chapterId, flags, courseId, width, height, rooms }
 * @returns { layers: Array<{ index, layer, mapId, map, info, spawn, npcs, doors, isLast, cfg }> }
 */
export function generateChapterLayers(opts = {}) {
  const flags = opts.flags || [];
  const chapterId = Number(opts.chapterId) || 0;
  const floors = listFloorTiles(flags);
  const walls = listWallBases(flags);
  const { layers } = buildChapterLayers(opts.content, chapterId);

  // 墙面/地面：直接用 chapterId 对全部候选取模（用户指定）
  const floorId = floors.length ? floors[((chapterId % floors.length) + floors.length) % floors.length] : undefined;
  const wallId = walls.length ? walls[((chapterId % walls.length) + walls.length) % walls.length] : undefined;

  const built = layers.map((layer, i) => {
    const seed = (chapterId * 131 + i * 7919 + 7) >>> 0;
    const { map, info } = generateDungeon({
      width: opts.width || 37,
      height: opts.height || 27,
      rooms: opts.rooms || 7,
      seed,
      deco: 0, // 章节副本先不加装饰
      floorId,
      wallA: wallId,
      wallB: wallId,
      tilesetId: 4,
    }, { flags, meta: null });

    const mapId = `chap_${chapterId}_${i}`;
    const spawn = info.spawn;
    const n = map.width * map.height;
    const ex = info.exit;
    // 出口瓦片先抹掉（B 层，z2）：本层 heading 全部完成后由场景动态「出现」
    map.data[2 * n + ex[1] * map.width + ex[0]] = 0;

    // 交互体落点：严格按 chapter content 的文档顺序（layer.items），
    // 沿「入口 → 出口」的 BFS 距离梯度铺开 —— 越靠近入口 = 内容越靠前。
    // 可阅读块 → NPC（对话）；可提交任务 → 敌人（答对即消灭）。
    const items = layer.items || [];
    const cells = orderByDistance(walkableCells(map, flags), map, spawn)
      .filter(([x, y]) => !(x === spawn[0] && y === spawn[1]) && !(x === ex[0] && y === ex[1]));
    const npcs = [], enemies = [];
    items.forEach((it, k) => {
      const cell = cells.length ? cells[Math.floor(((k + 1) * cells.length) / (items.length + 1))] : spawn;
      if (it.cat === "task") {
        enemies.push({
          key: `${mapId}_e${k}`,
          map: mapId,
          name: it.label || t("chapterInst.taskNpc"),
          tile: [cell[0], cell[1]],
          lines: it.lines || [""],
          taskType: it.type,
          taskCid: it.cid,
          taskKey: it.key,
        });
        return;
      }
      npcs.push({
        key: `${mapId}_${it.soft ? "s" : "r"}${k}`,
        map: mapId,
        name: it.label || layer.title || "",
        tile: [cell[0], cell[1]],
        lines: it.lines || [""],
        readKey: it.soft ? "" : (it.key || ""),
        headingId: it.headingId || "",
      });
    });

    // 出口：中间层 → 下一层；最后一层 → 直接离开副本（回到章节页面并退出游戏）
    const isLast = i === layers.length - 1;
    const doors = [{
      tile: [ex[0], ex[1]],
      to: isLast ? CHAPTER_EXIT : `chap_${chapterId}_${i + 1}`,
      spawn: null,
      exit: isLast,       // 标记：通过此门 = 通关整个副本
      lock: { layer: i }, // 本层完成后解锁
    }];

    return {
      index: i, layer, mapId, map, info, spawn, npcs, enemies, doors, isLast,
      cfg: {
        type: "chapter",
        file: "",
        _mapObj: map,
        tex: "rpgChapter",
        spawn,
        features: { npc: true, monsters: false },
        doors,
        chapter: { chapterId, layer: i, kind: layer.kind, headingIds: layer.headingIds },
      },
      name: layer.title || t("chapterInst.layer", { n: i + 1 }),
    };
  });

  return { layers: built };
}
