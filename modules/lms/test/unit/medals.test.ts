import { describe, it, expect, vi } from "vitest";

/**
 * lms/server/utils/medals.ts 中 shouldAwardMedal / DEFAULT_MEDALS 为纯函数与常量，
 * 但模块顶层 import { db, schema } from '@nuxthub/db'（虚拟模块），需 vi.mock。
 * collectUserMetrics / checkAndAwardMedals 涉及 DB，由集成测试覆盖。
 */
vi.mock("@nuxthub/db", () => ({
  db: {},
  schema: {},
}));

import {
  shouldAwardMedal,
  DEFAULT_MEDALS,
  type MedalContent,
  type UserMetrics,
} from "../../server/utils/medals";

/** 构造空指标（全部为 0） */
function emptyMetrics(): UserMetrics {
  return {
    courseScore: 0,
    exp: 0,
    level: 1,
    questionScore: 0,
    homeworkScore: 0,
    commentScore: 0,
    quizScore: 0,
    raceScore: 0,
    questionCount: 0,
    homeworkCount: 0,
    commentCount: 0,
    chapterPassCount: 0,
  };
}

describe("DEFAULT_MEDALS", () => {
  it("contains 10 default medals", () => {
    expect(DEFAULT_MEDALS).toHaveLength(10);
  });

  it("each medal has required content fields", () => {
    for (const medal of DEFAULT_MEDALS) {
      expect(medal.name).toBeTruthy();
      expect(medal.content.icon).toBeTruthy();
      expect(medal.content.color).toBeTruthy();
      expect(medal.content.tier).toBeGreaterThanOrEqual(1);
      expect(medal.content.description).toBeTruthy();
      expect(medal.content.conditions.length).toBeGreaterThan(0);
      expect(["all", "any"]).toContain(medal.content.logic);
    }
  });

  it("includes First Steps medal for questionCount >= 1", () => {
    const first = DEFAULT_MEDALS.find((m) => m.name === "First Steps");
    expect(first).toBeDefined();
    expect(first!.content.conditions[0]).toEqual({
      metric: "questionCount",
      op: ">=",
      value: 1,
    });
  });

  it("includes Diamond Scholar medal with 2 conditions and all logic", () => {
    const diamond = DEFAULT_MEDALS.find((m) => m.name === "Diamond Scholar");
    expect(diamond).toBeDefined();
    expect(diamond!.content.conditions).toHaveLength(2);
    expect(diamond!.content.logic).toBe("all");
  });
});

describe("shouldAwardMedal", () => {
  it("returns false when conditions array is empty", () => {
    const content: MedalContent = {
      icon: "x", color: "primary", tier: 1, description: "",
      conditions: [], logic: "all",
    };
    expect(shouldAwardMedal(content, emptyMetrics())).toBe(false);
  });

  it("returns true for satisfied >= condition with logic all", () => {
    const content: MedalContent = {
      icon: "x", color: "primary", tier: 1, description: "",
      conditions: [{ metric: "questionCount", op: ">=", value: 5 }],
      logic: "all",
    };
    const metrics = { ...emptyMetrics(), questionCount: 10 };
    expect(shouldAwardMedal(content, metrics)).toBe(true);
  });

  it("returns false when >= condition not met", () => {
    const content: MedalContent = {
      icon: "x", color: "primary", tier: 1, description: "",
      conditions: [{ metric: "questionCount", op: ">=", value: 100 }],
      logic: "all",
    };
    expect(shouldAwardMedal(content, { ...emptyMetrics(), questionCount: 50 })).toBe(false);
  });

  it("returns true when value exactly equals threshold for >=", () => {
    const content: MedalContent = {
      icon: "x", color: "primary", tier: 1, description: "",
      conditions: [{ metric: "level", op: ">=", value: 5 }],
      logic: "all",
    };
    expect(shouldAwardMedal(content, { ...emptyMetrics(), level: 5 })).toBe(true);
  });

  it("supports > operator (strict greater)", () => {
    const content: MedalContent = {
      icon: "x", color: "primary", tier: 1, description: "",
      conditions: [{ metric: "exp", op: ">", value: 100 }],
      logic: "all",
    };
    expect(shouldAwardMedal(content, { ...emptyMetrics(), exp: 101 })).toBe(true);
    expect(shouldAwardMedal(content, { ...emptyMetrics(), exp: 100 })).toBe(false);
    expect(shouldAwardMedal(content, { ...emptyMetrics(), exp: 99 })).toBe(false);
  });

  it("supports <= operator", () => {
    const content: MedalContent = {
      icon: "x", color: "primary", tier: 1, description: "",
      conditions: [{ metric: "exp", op: "<=", value: 100 }],
      logic: "all",
    };
    expect(shouldAwardMedal(content, { ...emptyMetrics(), exp: 100 })).toBe(true);
    expect(shouldAwardMedal(content, { ...emptyMetrics(), exp: 99 })).toBe(true);
    expect(shouldAwardMedal(content, { ...emptyMetrics(), exp: 101 })).toBe(false);
  });

  it("supports < operator", () => {
    const content: MedalContent = {
      icon: "x", color: "primary", tier: 1, description: "",
      conditions: [{ metric: "exp", op: "<", value: 100 }],
      logic: "all",
    };
    expect(shouldAwardMedal(content, { ...emptyMetrics(), exp: 99 })).toBe(true);
    expect(shouldAwardMedal(content, { ...emptyMetrics(), exp: 100 })).toBe(false);
  });

  it("supports == operator", () => {
    const content: MedalContent = {
      icon: "x", color: "primary", tier: 1, description: "",
      conditions: [{ metric: "level", op: "==", value: 5 }],
      logic: "all",
    };
    expect(shouldAwardMedal(content, { ...emptyMetrics(), level: 5 })).toBe(true);
    expect(shouldAwardMedal(content, { ...emptyMetrics(), level: 4 })).toBe(false);
    expect(shouldAwardMedal(content, { ...emptyMetrics(), level: 6 })).toBe(false);
  });

  it("returns false for unknown operator", () => {
    const content: MedalContent = {
      icon: "x", color: "primary", tier: 1, description: "",
      conditions: [{ metric: "exp", op: "!=", value: 100 } as any],
      logic: "all",
    };
    expect(shouldAwardMedal(content, { ...emptyMetrics(), exp: 50 })).toBe(false);
  });

  it("returns false when metric is undefined on metrics object", () => {
    const content: MedalContent = {
      icon: "x", color: "primary", tier: 1, description: "",
      conditions: [{ metric: "nonExistentMetric", op: ">=", value: 1 }],
      logic: "all",
    };
    expect(shouldAwardMedal(content, emptyMetrics())).toBe(false);
  });

  it("returns false when metric value is null", () => {
    const content: MedalContent = {
      icon: "x", color: "primary", tier: 1, description: "",
      conditions: [{ metric: "courseScore", op: ">=", value: 1 }],
      logic: "all",
    };
    const metrics = { ...emptyMetrics(), courseScore: null as unknown as number };
    expect(shouldAwardMedal(content, metrics)).toBe(false);
  });
});

describe("shouldAwardMedal - multi-condition logic", () => {
  const cond1 = { metric: "courseScore", op: ">=", value: 1000 };
  const cond2 = { metric: "level", op: ">=", value: 10 };

  it("logic 'all' requires every condition satisfied", () => {
    const all: MedalContent = {
      icon: "x", color: "primary", tier: 4, description: "",
      conditions: [cond1, cond2], logic: "all",
    };
    expect(shouldAwardMedal(all, { ...emptyMetrics(), courseScore: 1500, level: 12 })).toBe(true);
    expect(shouldAwardMedal(all, { ...emptyMetrics(), courseScore: 1500, level: 5 })).toBe(false);
    expect(shouldAwardMedal(all, { ...emptyMetrics(), courseScore: 500, level: 12 })).toBe(false);
  });

  it("logic 'any' requires at least one condition satisfied", () => {
    const any: MedalContent = {
      icon: "x", color: "primary", tier: 4, description: "",
      conditions: [cond1, cond2], logic: "any",
    };
    expect(shouldAwardMedal(any, { ...emptyMetrics(), courseScore: 1500, level: 12 })).toBe(true);
    expect(shouldAwardMedal(any, { ...emptyMetrics(), courseScore: 1500, level: 5 })).toBe(true);
    expect(shouldAwardMedal(any, { ...emptyMetrics(), courseScore: 500, level: 12 })).toBe(true);
    expect(shouldAwardMedal(any, { ...emptyMetrics(), courseScore: 500, level: 5 })).toBe(false);
  });
});

describe("shouldAwardMedal - 与 DEFAULT_MEDALS 集成", () => {
  it("awards First Steps when questionCount >= 1", () => {
    const first = DEFAULT_MEDALS.find((m) => m.name === "First Steps")!;
    expect(shouldAwardMedal(first.content, { ...emptyMetrics(), questionCount: 1 })).toBe(true);
    expect(shouldAwardMedal(first.content, { ...emptyMetrics(), questionCount: 0 })).toBe(false);
  });

  it("awards Scholar when courseScore >= 500", () => {
    const scholar = DEFAULT_MEDALS.find((m) => m.name === "Scholar")!;
    expect(shouldAwardMedal(scholar.content, { ...emptyMetrics(), courseScore: 500 })).toBe(true);
    expect(shouldAwardMedal(scholar.content, { ...emptyMetrics(), courseScore: 499 })).toBe(false);
  });

  it("awards Diamond Scholar only when both conditions met", () => {
    const diamond = DEFAULT_MEDALS.find((m) => m.name === "Diamond Scholar")!;
    expect(
      shouldAwardMedal(diamond.content, { ...emptyMetrics(), courseScore: 1000, level: 10 }),
    ).toBe(true);
    expect(
      shouldAwardMedal(diamond.content, { ...emptyMetrics(), courseScore: 1000, level: 9 }),
    ).toBe(false);
    expect(
      shouldAwardMedal(diamond.content, { ...emptyMetrics(), courseScore: 999, level: 10 }),
    ).toBe(false);
  });
});
