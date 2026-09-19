/* chapterInstance.js —— 把 LMS 章节内容编译成 MMO 副本（每个二级标题 = 一层）
 *
 * 设计目标：
 *  1) 复用 LMS 既有的章节进度口径（modules/lms/composables/useChapterTask.ts），
 *     游戏内的完成动作直接落回 chapter.progress（含持久化与奖励结算）
 *  2) 每层布局是「一条直线走廊」：内容严格按文档顺序从入口排到出口（不再随机生成地牢）
 *  3) 章节里的**每个顶层内容块**在游戏里都有对应交互体，不忽略任何内容：
 *       - 必读块（标题 / codeBlock / blockquote）→ 带 ❗ 的 NPC；
 *         标题用对话框渲染文字，codeBlock / blockquote 用 LMS 原始组件渲染；读完即标记已读（LMS 完成条件）
 *       - 纯文字（paragraph）        → NPC 对话框直接渲染文字（连续纯文字合并成一个对话，文本不丢）
 *       - 其它（图片/表格/列表/各种自定义扩展框）→ NPC 触发，用 LMS 原始组件原样渲染
 *       - 可提交互动（question/homework/comment/quiz/race）→ 敌人，答对即消灭
 *
 * 键位与 LMS 严格对齐（否则 markBlockRead / reportNodeDone 无法命中 heading）：
 *   - 可阅读块 key = 顶层块下标（String(index)），与 blockLayout.blockToHeading 一致
 *   - 可提交任务 key = `${type}:${cid}`
 *   - heading id 取 attrs.id / attrs['data-toc-id']
 *
 * 层数 = 二级标题数量（第一层额外包含章节标题 heading 及其上方的前置内容）。
 * 出口瓦片在生成时抹掉，待本层全部 heading 完成后由场景动态「出现」。
 *
 * 墙面/地面：直接用 chapterId 对全部候选取模确定（用户指定）。
 */
import { generateStraightMap, listFloorTiles, listWallBases } from "./dungeonGen.js";
import { t } from "../i18n.js";

const SUBMITTABLE = new Set(["question", "homework", "comment", "quiz", "race"]);
// LMS 只把 codeBlock / blockquote 视为「需要 hover 读完」的块（见 useChapterTask.blockLayout）
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
// 图文/组件类内容的标签（未列出的统一用 richBlock）
const RICH_LABEL_KEY = {
  image: "chapterInst.richImage",
  inlineImage: "chapterInst.richImage",
  vue: "chapterInst.richWidget",
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

/** 纯文字块：段落且只含文本/换行（没有图片、公式、互动等其它内联内容） */
function isPureTextBlock(node) {
  if (!node || node.type !== "paragraph") return false;
  const kids = Array.isArray(node.content) ? node.content : [];
  return kids.every((c) => c && (c.type === "text" || c.type === "hardBreak"));
}

/** 无任何可展示内容的空块（空段落/仅空白）→ 不生成交互体 */
function isEmptyBlock(node) {
  if (!node) return true;
  if (node.type !== "paragraph") return false;
  return !textOf(node).trim();
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
 *
 * items 是权威顺序（严格 = 文档顺序），每个元素的形态：
 *   { cat: "read"|"text"|"rich"|"task", key, kind, label, lines, nodeIndex, headingId,
 *     render: "dialog"|"component",  // 游戏内呈现方式
 *     type, cid }                    // 仅 task
 * @param content tiptap JSON doc
 * @param chapterId 章节 id（章节标题 heading 的 id）
 * @returns { layers: Array<{ index, kind, title, headingIds, items, reads, tasks }> }
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
  let curHeadingId = rootId; // 当前所属 heading（记录每个交互体归属，供游戏内 ❗ 判断）
  const pushItem = (item) => (cur || intro).items.push({ headingId: curHeadingId, ...item });
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

  // 连续纯文字块合并为一个「笔记」对话（避免每个段落都生成一个 NPC，文本仍全量展示）
  let softBuf = [];
  let softIdx = 0;
  const flushSoft = () => {
    if (!softBuf.length) return;
    const text = softBuf.join("\n").trim();
    softBuf = [];
    if (!text) return;
    pushItem({
      cat: "text", key: `soft:${softIdx++}`, kind: "soft", soft: true,
      label: t("chapterInst.textBlock"), lines: paginate(text), render: "dialog",
    });
  };

  blocks.forEach((b, i) => {
    if (!b || !b.type) return;

    // ---- 标题：二级 → 新层；三级及更深 → 并入当前层；标题自身作为必读块 ----
    if (b.type === "heading") {
      flushSoft();
      const hid = headingIdOf(b);
      const lv = levelOf(b);
      const text = textOf(b).trim();
      if (hid) curHeadingId = hid;
      if (lv <= 2) {
        // 无 id 的标题仍作为层边界，但不参与门控（服务端也不认它）
        startLayer(text, hid || null);
      } else if (cur) {
        if (hid) cur.headingIds.push(hid);
      } else {
        startLayer(text, hid || null); // 三级标题出现在任何二级标题之前：兜底建层
      }
      // 带 id 且下方确有内容的标题 = 必读块（纯文字 → 对话框）
      if (hid && belowHasAny.get(i)) {
        pushItem({
          cat: "read", key: String(i), kind: "heading", label: text,
          lines: paginate(text), nodeIndex: i, render: "dialog",
        });
      } else if (text) {
        // 不参与门控的标题：仍以对话形式展示，不忽略
        pushItem({
          cat: "text", key: `soft:${softIdx++}`, kind: "soft",
          label: t("chapterInst.textBlock"), lines: paginate(text), render: "dialog",
        });
      }
      return;
    }

    // ---- 可提交互动组件（question/homework/comment/quiz/race）→ 敌人 ----
    if (b.type === "vue" && SUBMITTABLE.has(b.attrs && b.attrs.type)) {
      flushSoft();
      const type = b.attrs.type;
      const cid = Number(b.attrs.content) || 0;
      if (!cid) return;
      const label = t(TASK_LABEL_KEY[type] || "chapterInst.taskNpc");
      pushItem({
        cat: "task", key: `${type}:${cid}`, kind: "task", type, cid, label,
        lines: [t("chapterInst.taskTip", { name: label })], nodeIndex: i,
      });
      return;
    }

    // ---- 必读块（codeBlock / blockquote）→ 带 ❗ 的 NPC，用原始组件渲染 ----
    if (READABLE.has(b.type)) {
      flushSoft();
      pushItem({
        cat: "read", key: String(i), kind: "block", label: t("chapterInst.readBlock"),
        lines: [], nodeIndex: i, render: "component",
      });
      return;
    }

    // ---- 纯文字：合并为一个对话；空段落跳过（无内容可展示）----
    if (isEmptyBlock(b)) return;
    if (isPureTextBlock(b)) {
      softBuf.push(textOf(b).trim());
      return;
    }

    // ---- 其它一切内容（图片/表格/列表/公式/各种自定义扩展框…）→ 原始组件渲染 ----
    flushSoft();
    const text = textOf(b).trim();
    pushItem({
      cat: "rich", key: `rich:${i}`, kind: "rich",
      label: t(RICH_LABEL_KEY[b.type] || "chapterInst.richBlock"),
      lines: text ? paginate(text) : [], nodeIndex: i, render: "component",
    });
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

/**
 * 生成章节副本的所有层。
 * @param opts { content, chapterId, flags, courseId }
 * @returns { layers: Array<{ index, layer, mapId, map, info, spawn, npcs, enemies, doors, isLast, cfg }> }
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
    const items = layer.items || [];
    // 直线走廊：内容点数量 = 本层交互体数量（按文档顺序从左到右）
    const { map, info } = generateStraightMap({
      count: Math.max(1, items.length),
      floorId,
      wallA: wallId,
      tilesetId: 4,
    }, { flags, meta: null });

    const mapId = `chap_${chapterId}_${i}`;
    const spawn = info.spawn;
    const n = map.width * map.height;
    const ex = info.exit;
    // 出口瓦片先抹掉（B 层，z2）：本层 heading 全部完成后由场景动态「出现」
    map.data[2 * n + ex[1] * map.width + ex[0]] = 0;

    const spots = info.spots || [];
    const npcs = [], enemies = [];
    items.forEach((it, k) => {
      const cell = spots[k] || spawn;
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
        key: `${mapId}_${it.soft ? "s" : (it.cat === "rich" ? "x" : "r")}${k}`,
        map: mapId,
        name: it.label || layer.title || "",
        tile: [cell[0], cell[1]],
        lines: it.lines || [""],
        // 只有必读块（标题 / codeBlock / blockquote）带 readKey → 头顶 ❗ 且计入 LMS 完成条件
        readKey: it.cat === "read" ? (it.key || "") : "",
        headingId: it.headingId || "",
        nodeIndex: Number.isInteger(it.nodeIndex) ? it.nodeIndex : null,
        render: it.render || "dialog",
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
