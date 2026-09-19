/**
 * 商店分类单元测试
 *
 * 规则：商店全量上架 —— 每个分类（含武器/服饰/配件）列出**所有**可售卖商品，按购买价升序；
 * 同名款式（男女两版）合并为一种，传入性别时优先该性别的版本。
 */
import { describe, it, expect } from "vitest";
import { ITEMS, SHOP_CATS, SHOP_STOCK, shopCategories } from "../../gamejs/shared/items.js";

const cats = shopCategories();
const byKey = (k: string) => cats.find((c) => c.key === k);

describe("商店分类 - 全量上架", () => {
  it("每个非消耗品分类列出全部可售卖商品（不再限量）", () => {
    for (const c of cats) {
      if (c.key === "consumable") continue;
      const def = SHOP_CATS.find((d) => d.key === c.key)!;
      const all = SHOP_STOCK.filter((id) => def.match(ITEMS[id]));
      const uniqueNames = new Set(all.map((id) => ITEMS[id].name));
      expect(c.ids.length, `${c.key} 应列出全部（同名合并后）`).toBe(uniqueNames.size);
      expect(c.ids.length, `${c.key} 不再被截断为 3 件`).toBeGreaterThan(3);
    }
  });

  it("每个分类内价格依次递增（升序）", () => {
    for (const c of cats) {
      const prices = c.ids.map((id) => ITEMS[id].buy || 0);
      const sorted = [...prices].sort((a, b) => a - b);
      expect(prices, `${c.key} 未按价格升序`).toEqual(sorted);
    }
  });

  it("武器分类包含全部可售武器（不止最便宜的三件）", () => {
    const def = SHOP_CATS.find((c) => c.key === "weapon")!;
    const allWeapons = SHOP_STOCK.filter((id) => def.match(ITEMS[id]))
      .sort((a, b) => ITEMS[a].buy - ITEMS[b].buy);
    expect(byKey("weapon")!.ids).toEqual(allWeapons);
    expect(byKey("weapon")!.ids.length).toBeGreaterThan(3);
  });

  it("服饰分类包含全部可售服饰", () => {
    const def = SHOP_CATS.find((c) => c.key === "clothing")!;
    const all = SHOP_STOCK.filter((id) => def.match(ITEMS[id]));
    expect(byKey("clothing")!.ids.length).toBe(new Set(all.map((id) => ITEMS[id].name)).size);
    expect(byKey("clothing")!.ids.length).toBeGreaterThan(3);
  });

  it("消耗品不受上限影响（保留全部）", () => {
    const consDef = SHOP_CATS.find((c) => c.key === "consumable")!;
    const allConsumables = SHOP_STOCK.filter((id) => consDef.match(ITEMS[id]));
    expect(byKey("consumable")!.ids).toEqual(allConsumables);
  });

  it("武器商店与服装商店的分类都在（武器/盾/甲/头盔 + 服饰配件）", () => {
    for (const k of ["weapon", "shield", "armor", "helmet", "clothing", "outer", "cloak", "glasses", "ears", "tail", "wing", "facial"]) {
      expect(byKey(k), `缺少分类 ${k}`).toBeTruthy();
    }
  });
});

describe("商店分类 - 同名款式合并 / 性别优先", () => {
  it("每个分类内不出现同名商品", () => {
    for (const c of cats) {
      const names = c.ids.map((id: string) => ITEMS[id].name);
      expect(new Set(names).size, `${c.key} 存在同名商品: ${names.join(",")}`).toBe(names.length);
    }
  });

  it("不传性别时同样合并同名（保留更便宜的一版）", () => {
    const names = byKey("ears")!.ids.map((id) => ITEMS[id].name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("传入性别时，同款若存在本性别版本则优先该版本", () => {
    for (const gender of ["Male", "Female"]) {
      const catsG = shopCategories(gender);
      for (const key of ["ears", "tail", "wing", "facial"]) {
        const c = catsG.find((x) => x.key === key)!;
        for (const id of c.ids) {
          const nm = ITEMS[id].name;
          // 该名字在商店里是否存在本性别版本
          const want = SHOP_STOCK.find((sid) => ITEMS[sid].name === nm && ITEMS[sid].mv?.gender === gender);
          if (want) expect(id, `${gender}/${key}/${nm} 应选本性别版本`).toBe(want);
        }
      }
    }
  });
});
