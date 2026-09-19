/**
 * 商店分类单元测试
 *
 * 规则：武器/服饰/配件（非 consumable）每个分类最多展示 SHOP_LIMIT_PER_CAT 件，
 * 且按购买价升序；消耗品种类保持原有全部商品。
 */
import { describe, it, expect } from "vitest";
import { ITEMS, SHOP_CATS, SHOP_STOCK, SHOP_LIMIT_PER_CAT, shopCategories } from "../../gamejs/shared/items.js";

const cats = shopCategories();
const byKey = (k: string) => cats.find((c) => c.key === k);

describe("商店分类 - 每类上限", () => {
  it("非消耗品分类每类最多 3 件", () => {
    for (const c of cats) {
      if (c.key === "consumable") continue;
      expect(c.ids.length, `${c.key} 超过上限`).toBeLessThanOrEqual(SHOP_LIMIT_PER_CAT);
      expect(c.ids.length).toBeGreaterThan(0);
    }
  });

  it("每个分类内价格依次递增（升序）", () => {
    for (const c of cats) {
      const prices = c.ids.map((id) => ITEMS[id].buy || 0);
      const sorted = [...prices].sort((a, b) => a - b);
      expect(prices, `${c.key} 未按价格升序`).toEqual(sorted);
    }
  });

  it("保留的是最便宜的三件", () => {
    const weaponDef = SHOP_CATS.find((c) => c.key === "weapon")!;
    const allWeapons = SHOP_STOCK.filter((id) => weaponDef.match(ITEMS[id]))
      .sort((a, b) => ITEMS[a].buy - ITEMS[b].buy);
    expect(byKey("weapon")!.ids).toEqual(allWeapons.slice(0, SHOP_LIMIT_PER_CAT));
  });

  it("消耗品不受上限影响（保留全部）", () => {
    const consDef = SHOP_CATS.find((c) => c.key === "consumable")!;
    const allConsumables = SHOP_STOCK.filter((id) => consDef.match(ITEMS[id]));
    expect(byKey("consumable")!.ids).toEqual(allConsumables);
    expect(allConsumables.length).toBeGreaterThan(SHOP_LIMIT_PER_CAT); // 4 件(bread/herb/potion/gem)
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

  it("传入性别时同款优先该性别的版本（兽耳/尾巴/翅膀/面纹分男女）", () => {
    const male = shopCategories("Male");
    const female = shopCategories("Female");
    for (const key of ["ears", "tail", "wing", "facial"]) {
      const m = male.find((c) => c.key === key)!;
      const f = female.find((c) => c.key === key)!;
      expect(m.ids.every((id) => ITEMS[id].mv?.gender === "Male"), `${key} 男性版`).toBe(true);
      expect(f.ids.every((id) => ITEMS[id].mv?.gender === "Female"), `${key} 女性版`).toBe(true);
      expect(f.ids).not.toEqual(m.ids);
    }
  });
});
