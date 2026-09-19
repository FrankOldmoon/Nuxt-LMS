/**
 * 装备外观映射单元测试
 *
 * 换装能否正确反映到"行走图/头像"，取决于 applyEquippedAppearance 把
 * 装备槽 → 图层(mv.layer/num) 的映射；本测试锁定这份映射，
 * 并保证所有上架装备的 mv.layer 都是合成器认识(会真正渲染)的图层，
 * 避免"买了/穿了却没效果"。
 */
import { describe, it, expect } from "vitest";
import { ITEMS, applyEquippedAppearance } from "../../gamejs/shared/items.js";
import { MV_CATS } from "../../gamejs/rpg/buildMvCharacter.js";
import { facePartUrls } from "../../gamejs/shared/face.js";

const MV_KEYS = new Set((MV_CATS as any[]).map((c) => c.key));
const APPEARANCE_SLOTS = ["clothing", "outer", "cloak", "acca", "accb", "glasses", "ears", "tail", "wing", "facial"];

const ids = Object.keys(ITEMS);
const firstBySlot = (slot: string) => ids.find((id) => ITEMS[id].slot === slot && ITEMS[id].mv);
const firstAny = (slot: string) => ids.find((id) => ITEMS[id].slot === slot);
const bySlot = (slot: string) => ids.filter((id) => ITEMS[id].slot === slot && ITEMS[id].mv);

const base = () => ({ gender: "Male", skin: "#f9e3d0", colors: {}, layers: { Body: 1, Eyes: 2 } });

describe("装备 → 图层映射", () => {
  it("每种可穿戴装备都会写入对应的 mv.layer/num", () => {
    const equipped: Record<string, string> = {};
    for (const slot of APPEARANCE_SLOTS) {
      const id = firstBySlot(slot)!;
      expect(id, `缺少 slot=${slot} 的商品`).toBeTruthy();
      equipped[slot] = id;
    }
    const out = applyEquippedAppearance(base(), equipped);
    for (const slot of APPEARANCE_SLOTS) {
      const it = ITEMS[equipped[slot]];
      expect(out.layers[it.mv.layer], `${slot} → ${it.mv.layer}`).toBe(it.mv.num);
    }
  });

  it("所有可穿戴装备的 mv.layer 都在合成器的图层表内（否则穿了不显示）", () => {
    for (const id of ids) {
      const mv = ITEMS[id].mv;
      if (!mv) continue;
      expect(MV_KEYS.has(mv.layer), `${id} 的 layer=${mv.layer} 不在 MV_CATS 中`).toBe(true);
    }
  });

  it("武器/盾/甲/头盔等无 mv 的装备不影响外观", () => {
    const out = applyEquippedAppearance(base(), { weapon: firstAny("weapon")!, shield: firstAny("shield")!, armor: firstAny("armor")!, helmet: firstAny("helmet")! });
    expect(out.layers).toEqual({ Body: 1, Eyes: 2 });
  });

  it("性别不符的装备被忽略", () => {
    const femaleOnly = bySlot("ears").find((id) => ITEMS[id].mv.gender === "Female")!;
    expect(femaleOnly).toBeTruthy();
    const out = applyEquippedAppearance(base(), { ears: femaleOnly });
    expect(out.layers.Ears).toBeUndefined();
  });

  it("同名/中性装备（披风等）不分性别都能穿戴", () => {
    const cloak = ids.find((id) => ITEMS[id].slot === "cloak" && !ITEMS[id].mv.gender)!;
    expect(cloak).toBeTruthy();
    const male = applyEquippedAppearance(base(), { cloak });
    const female = applyEquippedAppearance({ ...base(), gender: "Female" }, { cloak });
    expect(male.layers[ITEMS[cloak].mv.layer]).toBe(ITEMS[cloak].mv.num);
    expect(female.layers[ITEMS[cloak].mv.layer]).toBe(ITEMS[cloak].mv.num);
  });

  it("基础外观(发型/眼睛等)在换装后保持不变", () => {
    const out = applyEquippedAppearance(base(), { ears: firstBySlot("ears")! });
    expect(out.layers.Body).toBe(1);
    expect(out.layers.Eyes).toBe(2);
    expect(out.gender).toBe("Male");
    expect(out.skin).toBe("#f9e3d0");
  });

  it("头像可见部件（面纹/耳朵）来自装备时写入对应图层", () => {
    const facial = firstBySlot("facial")!;
    const out = applyEquippedAppearance(base(), { facial });
    expect(out.layers[ITEMS[facial].mv.layer]).toBe(ITEMS[facial].mv.num);
    expect(["FacialMark", "Ears", "Beard"]).toContain(ITEMS[facial].mv.layer);
  });
});

describe("头像素材地址", () => {
  it("耳朵优先使用第二套素材 FG_BeastEars", () => {
    const urls = facePartUrls("Male", "BeastEars", 3);
    expect(urls[0]).toContain("FG_BeastEars_p03_c1_m006.png");
  });

  it("每个部件都提供'无 m 通道'回退地址（如女性面纹 p01/p02）", () => {
    const urls = facePartUrls("Female", "FacialMark", 1);
    expect(urls[0]).toContain("FG_FacialMark_p01_c1_m005.png");
    expect(urls[1]).toContain("FG_FacialMark_p01_c1.png");
    expect(urls[1]).not.toMatch(/_m\d+\.png$/);
  });

  it("编号补零为两位", () => {
    expect(facePartUrls("Male", "Ears", 2)[0]).toContain("_p02_");
  });
});
