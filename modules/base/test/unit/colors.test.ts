import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * colors.ts 中部分函数（levelColor / colorOptions / levelOptions）依赖
 * Nuxt 自动导入的 useI18n()。这里通过 vi.stubGlobal 注入一个最小 mock，
 * 使其返回的 t() 直接回传 key 作为文本，便于断言。
 */
const mockT = (key: string) => key;
beforeEach(() => {
  vi.stubGlobal("useI18n", () => ({ t: mockT }));
});

import {
  levelColor,
  colorTextClass,
  colorBgClass,
  colorHeroBgClass,
  colorOptions,
  levelOptions,
} from "../../utils/colors";

describe("colorTextClass", () => {
  it("returns mapped class for known color", () => {
    expect(colorTextClass("primary")).toBe("text-primary");
    expect(colorTextClass("success")).toBe("text-success");
    expect(colorTextClass("info")).toBe("text-info");
    expect(colorTextClass("warning")).toBe("text-warning");
    expect(colorTextClass("error")).toBe("text-error");
    expect(colorTextClass("neutral")).toBe("text-highlighted");
  });

  it("falls back to text-primary for unknown color", () => {
    expect(colorTextClass("unknown")).toBe("text-primary");
    expect(colorTextClass("")).toBe("text-primary");
  });
});

describe("colorBgClass", () => {
  it("returns mapped bg class for known color", () => {
    expect(colorBgClass("primary")).toBe("bg-primary/10");
    expect(colorBgClass("neutral")).toBe("bg-elevated");
  });

  it("falls back to bg-primary/10 for unknown color", () => {
    expect(colorBgClass("nope")).toBe("bg-primary/10");
  });
});

describe("colorHeroBgClass", () => {
  it("returns mapped hero bg class for known color", () => {
    expect(colorHeroBgClass("primary")).toBe("bg-primary");
    expect(colorHeroBgClass("neutral")).toBe("bg-neutral-700");
  });

  it("falls back to bg-primary for unknown color", () => {
    expect(colorHeroBgClass("foo")).toBe("bg-primary");
  });
});

describe("levelColor", () => {
  it("matches raw english level keys directly", () => {
    expect(levelColor("beginner")).toBe("success");
    expect(levelColor("intermediate")).toBe("warning");
    expect(levelColor("advanced")).toBe("error");
  });

  it("matches i18n-translated level text via useI18n", () => {
    // mockT 直接回传 key，所以传 i18n key 应能命中映射
    expect(levelColor("home.levels.beginner")).toBe("success");
    expect(levelColor("home.levels.intermediate")).toBe("warning");
    expect(levelColor("home.levels.advanced")).toBe("error");
  });

  it("returns neutral for unknown level", () => {
    expect(levelColor("expert")).toBe("neutral");
    expect(levelColor("")).toBe("neutral");
  });
});

describe("colorOptions", () => {
  it("returns 6 color options with label and value", () => {
    const opts = colorOptions();
    expect(opts).toHaveLength(6);
    for (const o of opts) {
      expect(o).toHaveProperty("label");
      expect(o).toHaveProperty("value");
    }
    expect(opts.map((o) => o.value)).toEqual([
      "primary",
      "success",
      "info",
      "warning",
      "error",
      "neutral",
    ]);
  });

  it("label uses i18n key via t()", () => {
    const opts = colorOptions();
    expect(opts[0].label).toBe("courseEditor.colors.primary");
  });
});

describe("levelOptions", () => {
  it("returns 3 level options", () => {
    const opts = levelOptions();
    expect(opts).toHaveLength(3);
    // label 与 value 相同（均为 i18n 文本）
    for (const o of opts) {
      expect(o.label).toBe(o.value);
    }
  });

  it("uses i18n keys for beginner/intermediate/advanced", () => {
    const opts = levelOptions();
    expect(opts[0].value).toBe("home.levels.beginner");
    expect(opts[1].value).toBe("home.levels.intermediate");
    expect(opts[2].value).toBe("home.levels.advanced");
  });
});
