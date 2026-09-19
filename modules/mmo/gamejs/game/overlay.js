// overlay.js —— 背包 / 商店 的 DOM 覆盖层渲染(HTML 网格 + 点击回调)
import { ITEMS, EQUIP_SLOTS, shopCategories } from "../shared/items.js";
import { fetchBitmap } from "../lpc/imageLoader.js";
import { BASE_GEN } from "../rpg/buildMvCharacter.js";
import { t } from "../i18n.js";

const g = (id) => document.getElementById(id);
const clear = (n) => { if (n) n.innerHTML = ""; };

// 物品图标地址（assets/mmo/items/*.png）
const itemImg = (id) => `/api/game-assets/mmo/items/${id}.png`;

// 服饰/配件 icon: 从 MV 行走图(TV_{layer}_p{NN}.png, 3列×4行)里截一帧当作图标。
// 注意：不同图层"有内容"的行并不相同（翅膀/披风/后发只在最后一行，衣裤在中间行），
// 所以不能写死取第一行第二列，改为挑「不透明像素最多」的那一帧。
const MV_TV = { Beard: "Beard1", Tail: "Tail1", Wing: "Wing1" };
const mvIconCache = new Map();
function pickBestCell(cv) {
  const w = Math.floor(cv.width / 48), h = Math.floor(cv.height / 48);
  if (w <= 0 || h <= 0) return { x: 0, y: 0 };
  const t = document.createElement("canvas");
  t.width = cv.width; t.height = cv.height;
  const tx = t.getContext("2d");
  tx.drawImage(cv, 0, 0);
  let best = { x: 0, y: 0 }, bestN = -1;
  for (let cy = 0; cy < h; cy++) {
    for (let cx = 0; cx < w; cx++) {
      const d = tx.getImageData(cx * 48, cy * 48, 48, 48).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++;
      if (n > bestN) { bestN = n; best = { x: cx * 48, y: cy * 48 }; }
    }
  }
  return bestN > 0 ? best : { x: 48, y: 0 };
}
async function mvIconSrc(it) {
  const mv = it && it.mv;
  if (!mv || !mv.layer || !mv.num) return null;
  const tv = MV_TV[mv.layer] || mv.layer;
  const p = String(mv.num).padStart(2, "0");
  // 旧数据里披风等缺 gender，按男性素材取图标即可
  const gender = mv.gender || "Male";
  const cv = await fetchBitmap(`${BASE_GEN}${gender}/TV_${tv}_p${p}.png`);
  if (!cv) return null;
  const c = document.createElement("canvas");
  c.width = 48; c.height = 48;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;
  const cell = pickBestCell(cv);
  x.drawImage(cv, cell.x, cell.y, 48, 48, 0, 0, 48, 48);
  return c.toDataURL();
}
async function fillMvIcon(img) {
  const id = img.dataset.mv;
  const it = ITEMS[id] || {};
  const key = it.mv ? `${id}:${it.mv.gender || "Male"}` : id;
  let src = mvIconCache.get(key);
  if (src === undefined) {
    src = await mvIconSrc(it);
    mvIconCache.set(key, src);
  }
  if (src) { img.src = src; img.style.visibility = "visible"; }
  else { img.outerHTML = `<span class="iicon icontxt">&#9831;</span>`; }
}
async function fillMvIcons(root) {
  if (!root) return;
  for (const img of root.querySelectorAll("img[data-mv]")) fillMvIcon(img);
}

// 缺少独立图标的物品（如服饰/配件）加载失败时降级为文本占位，避免破图
const iconHtml = (id) => {
  const it = ITEMS[id] || {};
  if (it.mv) {
    return `<img class="iicon" alt="${id}" data-mv="${id}" style="visibility:hidden">`;
  }
  return `<img class="iicon" src="${itemImg(id)}" alt="${id}" loading="lazy" ` +
    `onerror="if(!this.dataset.fb){this.dataset.fb=1;this.outerHTML='<span class=&quot;iicon icontxt&quot;>&#9831;</span>'}">`;
};

// 构建一行物品: 图标 + 名称 + 数量 + 可选价格 + 可选按钮
function itemRow(id, count, opts = {}) {
  const row = document.createElement("div");
  row.className = "irow" + (opts.rowClass ? " " + opts.rowClass : "");
  row.innerHTML =
    `${iconHtml(id)}<span class="iname">${ITEMS[id].name}</span>` +
    (count != null ? `<span class="icount">${opts.countText ?? ("×" + count)}</span>` : "") +
    (opts.price != null ? `<span class="iprice">💰${opts.price}</span>` : "");
  if (opts.btnText) {
    const b = document.createElement("button");
    b.className = "ibtn" + (opts.btnClass ? " " + opts.btnClass : "");
    b.textContent = opts.btnText;
    b.addEventListener("click", opts.onClick);
    if (opts.disabled) {
      b.disabled = true;
      b.classList.add("disabled");
      b.title = opts.disabledTitle || "";
    }
    row.appendChild(b);
  }
  return row;
}

export const Overlay = {
  bp: null, sh: null,
  tooltip: null, // 背包格子悬浮信息
  init() {
    this.bp = {
      root: g("backpack"), list: g("bpList"), gold: g("bpGold"),
      title: g("bpTitle"), close: g("bpClose"),
    };
    this.sh = {
      root: g("shop"), gold: g("shGold"),
      title: g("shTitle"), close: g("shClose"),
      buyList: g("shBuyList"), sellList: g("shSellList"),
    };
    this.tooltip = document.createElement("div");
    this.tooltip.className = "bp-tip";
    this.tooltip.style.display = "none";
    this.bp.root.appendChild(this.tooltip);
  },
  setGold(n) {
    [this.bp.gold, this.sh.gold].forEach((e) => { if (e) e.textContent = n; });
  },
  // 背包: 左侧装备栏(4 槽) + 右侧 10x5 格子;拥有的物品按目录顺序紧凑填入最前面的格子
  renderBackpack(scene) {
    clear(this.bp.list);
    this.tooltip.style.display = "none";
    const owned = scene.bag.items || {};
    const equipped = scene.equipped || {};
    const ids = Object.keys(ITEMS).filter((id) => (owned[id] || 0) > 0);
    const body = document.createElement("div");
    body.className = "bp-body";

    // ---- 左: 装备栏(纸娃娃, 战斗/服饰分组) ----
    const eqCol = document.createElement("div");
    eqCol.className = "eq-col";
    const groups = [
      { label: t("backpack.combat"), keys: ["weapon", "helmet", "armor", "shield"] },
      { label: t("backpack.apparel"), keys: EQUIP_SLOTS.filter((s) => !["weapon", "helmet", "armor", "shield"].includes(s.key)).map((s) => s.key) },
    ];
    for (const g of groups) {
      const gTitle = document.createElement("div");
      gTitle.className = "eq-group-title";
      gTitle.textContent = g.label;
      eqCol.appendChild(gTitle);
      const gGrid = document.createElement("div");
      gGrid.className = "eq-grid";
      const slotMap = {};
      for (const s of EQUIP_SLOTS) slotMap[s.key] = s;
      for (const key of g.keys) {
        const itemId = equipped[key];
        const cell = document.createElement("div");
        cell.className = "eq-slot" + (itemId ? " filled" : "");
        cell.title = slotMap[key] ? t(slotMap[key].labelKey) : key;
        if (itemId) {
          cell.innerHTML = iconHtml(itemId);
          const ub = document.createElement("button");
          ub.className = "uneq";
          ub.textContent = "✕";
          ub.title = t("bag.unequip");
          ub.addEventListener("click", (ev) => { ev.stopPropagation(); if (scene.onUnequip) scene.onUnequip(key); });
          cell.appendChild(ub);
          Overlay.attachTip(cell, scene, itemId);
        } else {
          cell.innerHTML = `<span class="eq-ghost">${slotMap[key] ? t(slotMap[key].labelKey) : key}</span>`;
        }
        gGrid.appendChild(cell);
      }
      eqCol.appendChild(gGrid);
    }
    body.appendChild(eqCol);

    // ---- 右: 物品区(无论是否有物品, 均铺满 8 列网格, 空位用空格子补齐) ----
    const main = document.createElement("div");
    main.className = "bp-main";
    const grid = document.createElement("div");
    grid.className = "bp-grid";
    const COLS = 8;
    const rows = Math.max(6, Math.ceil(ids.length / COLS));
    const cap = rows * COLS; // 铺满网格，余位用空格子补齐
    for (let i = 0; i < cap; i++) {
      const cell = document.createElement("div");
      const id = i < ids.length ? ids[i] : null;
      cell.className = "bpc" + (id ? " filled" : "");
      if (id) {
        const count = owned[id];
        cell.dataset.id = id;
        cell.innerHTML = iconHtml(id) + (count > 1 ? `<span class="bcnt">${count}</span>` : "");
        Overlay.attachTip(cell, scene, id);
        cell.addEventListener("click", () => Overlay.selectItem(scene, id));
      }
      grid.appendChild(cell);
    }
    main.appendChild(grid);
    const actions = document.createElement("div");
    actions.className = "bp-actions";
    actions.innerHTML = `<span class="bp-actions-tip">${t("bag.selectTip")}</span>`;
    main.appendChild(actions);

    body.appendChild(main);
    this.bp.list.appendChild(body);
    fillMvIcons(this.bp.list);
  },
  // 选中物品格: 高亮 + 底部操作条显示 使用/装备/丢弃
  selectItem(scene, id) {
    this.selId = id;
    this.bp.list.querySelectorAll(".bpc").forEach((c) => c.classList.toggle("selected", c.dataset.id === id));
    const it = ITEMS[id] || {};
    const count = (scene.bag.items || {})[id] || 0;
    const actions = this.bp.list.querySelector(".bp-actions");
    if (!actions) return;
    actions.innerHTML = "";

    const info = document.createElement("div");
    info.className = "bp-selinfo";
    info.innerHTML = `${iconHtml(id)}<span class="bp-selname">${it.name}</span><span class="bp-selcount">×${count}</span>`;
    actions.appendChild(info);

    const btns = document.createElement("div");
    btns.className = "bp-btns";
    const mk = (label, cls, fn) => {
      const b = document.createElement("button");
      b.className = "act-btn" + (cls ? " " + cls : "");
      b.textContent = label;
      b.addEventListener("click", (ev) => { ev.stopPropagation(); fn && fn(); });
      btns.appendChild(b);
    };
    if (it.heal !== undefined || it.feed !== undefined) mk(t("bag.use"), "use", () => scene.onUse && scene.onUse(id));
    if (it.slot) mk(t("bag.equip"), "equip", () => scene.onEquip && scene.onEquip(id));
    mk(t("bag.drop"), "drop", () => scene.onDrop && scene.onDrop(id));
    mk(t("bag.close"), "close", () => { this.selId = null; this.renderBackpack(scene); });
    actions.appendChild(btns);
    fillMvIcons(actions);
  },
  attachTip(cell, scene, id) {
    const it = ITEMS[id] || {};
    const stat = it.slot
      ? `<div class="tip-stat">${t("eq." + it.slot)} · ${it.atk ? "ATK +" + it.atk : ""}${it.def ? "DEF +" + it.def : ""}</div>`
      : "";
    const html = () =>
      `<div class="tip-name">${it.name}</div>` +
      `<div class="tip-desc">${it.desc || ""}</div>` +
      stat +
      `<div class="tip-price">${t("tip.buy")} 💰${it.buy} · ${t("tip.sell")} 💰${it.sell}</div>`;
    cell.addEventListener("mouseenter", (e) => {
      const box = this.tooltip;
      box.style.display = "block";
      box.innerHTML = html();
      this.positionTip(box, e);
    });
    cell.addEventListener("mousemove", (e) => { if (this.tooltip.style.display !== "none") this.positionTip(this.tooltip, e); });
    cell.addEventListener("mouseleave", () => { this.tooltip.style.display = "none"; });
  },
  positionTip(box, e) {
    const w = box.offsetWidth;
    box.style.left = (e.clientX + 14 + w > window.innerWidth ? e.clientX - w - 14 : e.clientX + 14) + "px";
    box.style.top = (e.clientY + 14) + "px";
  },
  // 商店: 左栏 = 商店(只能买,按分类 tab 切换),右栏 = 背包(可卖)
  // cats 可选: 按分类 key 过滤商店商品(对应 NPC 的 cats 配置), 缺省展示全部分类
  renderShop(scene, cats) {
    // 传入玩家性别：同名服饰款式优先展示可穿戴的那一版
    let all = shopCategories(scene && scene.cfg && scene.cfg.gender);
    if (Array.isArray(cats) && cats.length) all = all.filter((c) => cats.includes(c.key));
    const shopCats = all;
    clear(this.sh.buyList);
    clear(this.sh.sellList);
    if (shopCats.length) {
      if (!this._shopCat || !shopCats.some((c) => c.key === this._shopCat)) this._shopCat = shopCats[0].key;
      const active = shopCats.find((c) => c.key === this._shopCat) || shopCats[0];

      const tabs = document.createElement("div");
      tabs.className = "shop-tabs";
      for (const c of shopCats) {
        const tb = document.createElement("button");
        tb.className = "shop-tab" + (c.key === active.key ? " active" : "");
        tb.textContent = `${t(c.labelKey)} ${c.ids.length}`;
        tb.addEventListener("click", () => { this._shopCat = c.key; this.renderShop(scene, cats); });
        tabs.appendChild(tb);
      }
      this.sh.buyList.appendChild(tabs);

      const list = document.createElement("div");
      list.className = "shop-list";
      for (const id of active.ids) {
        const price = ITEMS[id].buy;
        const afford = scene.bag.gold >= price;
        list.appendChild(itemRow(id, null, {
          price, btnText: t("shop.buy"), onClick: () => scene.onBuy(id),
          disabled: !afford, disabledTitle: t("shop.noGold"),
        }));
      }
      this.sh.buyList.appendChild(list);
      // 立即填充服饰/配件图标：否则"没有可出售物品"时会提前 return，购买栏图标将一直处于隐藏状态
      fillMvIcons(this.sh.buyList);
    }
    const entries = Object.entries(scene.bag.items).filter(([, c]) => c > 0);
    if (!entries.length) {
      this.sh.sellList.innerHTML = `<div class="empty">${t("shop.nothing")}</div>`;
      return;
    }
    for (const [id, count] of entries) {
      this.sh.sellList.appendChild(itemRow(id, count, {
        price: ITEMS[id].sell, btnText: t("shop.sell"), btnClass: "sell", onClick: () => scene.onSell(id),
      }));
    }
    fillMvIcons(this.sh.sellList);
  },
  open(id) { (id === "shop" ? this.sh.root : this.bp.root).hidden = false; },
  close(id) { (id === "shop" ? this.sh.root : this.bp.root).hidden = true; },
};
