import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * doc/server/utils/index.ts 中的 normalize* 函数将 DB 记录归一化为 LMS DTO。
 * 注意：normalizeChapterPageData 调用 mergeCourseLmsConfig，这是 Nitro 自动导入
 * 的全局函数（base/server/utils/lmsConfig.ts），这里通过 vi.stubGlobal 注入 mock。
 */
beforeEach(() => {
  vi.stubGlobal("mergeCourseLmsConfig", () => ({
    course: { showDanmaku: true },
    chapterBtns: { showPlay: true },
    courseBtns: { showProgress: true },
  }));
});

import {
  normalizeCategory,
  normalizeCourseSummary,
  normalizeChapterSummary,
  normalizeCourseDetail,
  normalizeChapterDetail,
  normalizeChapterPageData,
} from "../../server/utils/index";

describe("normalizeCategory", () => {
  it("maps DB category fields to LmsSeries", () => {
    const cat = { id: 1, name: "Math", code: "MATH", order: 5, orders: [{ id: "o1" }] };
    const result = normalizeCategory(cat);
    expect(result).toEqual({
      id: 1,
      title: "Math",
      code: "MATH",
      icon: "i-lucide-folder",
      order: 5,
      orders: [{ id: "o1" }],
    });
  });

  it("defaults order to 0 when missing", () => {
    const result = normalizeCategory({ id: 2, name: "Sci", code: "SCI" });
    expect(result.order).toBe(0);
  });

  it("defaults orders to empty array when missing", () => {
    const result = normalizeCategory({ id: 3, name: "X", code: "X" });
    expect(result.orders).toEqual([]);
  });

  it("always uses i-lucide-folder icon", () => {
    const result = normalizeCategory({ id: 4, name: "Y", code: "Y" });
    expect(result.icon).toBe("i-lucide-folder");
  });
});

describe("normalizeCourseSummary", () => {
  it("maps course fields with defaults from config", () => {
    const course = {
      id: 10,
      name: "Physics 101",
      code: "PHY101",
      config: { icon: "i-lucide-atom", color: "info", level: "advanced" },
      tags: ["science", "stem"],
      categoryId: 2,
      chapters: [{ id: 1 }, { id: 2 }, { id: 3 }],
    };
    const result = normalizeCourseSummary(course);
    expect(result.id).toBe(10);
    expect(result.title).toBe("Physics 101");
    expect(result.code).toBe("PHY101");
    expect(result.icon).toBe("i-lucide-atom");
    expect(result.color).toBe("info");
    expect(result.level).toBe("advanced");
    expect(result.tags).toEqual(["science", "stem"]);
    expect(result.categoryId).toBe(2);
    expect(result.chapterCount).toBe(3);
    expect(result.coverImg).toBeNull();
    expect(result.teachers).toEqual([]);
  });

  it("uses default icon/color/level when config missing", () => {
    const course = { id: 1, name: "C", code: "C" };
    const result = normalizeCourseSummary(course);
    expect(result.icon).toBe("i-lucide-book-open");
    expect(result.color).toBe("primary");
    expect(result.level).toBe("入门");
  });

  it("uses explicit chapterCount param over chapters.length", () => {
    const course = { id: 1, name: "C", code: "C", chapters: [{ id: 1 }] };
    const result = normalizeCourseSummary(course, 42);
    expect(result.chapterCount).toBe(42);
  });

  it("defaults chapterCount to 0 when no chapters", () => {
    const result = normalizeCourseSummary({ id: 1, name: "C", code: "C" });
    expect(result.chapterCount).toBe(0);
  });

  it("defaults tags to empty array when missing", () => {
    const result = normalizeCourseSummary({ id: 1, name: "C", code: "C" });
    expect(result.tags).toEqual([]);
  });

  it("passes through teachers param", () => {
    const teachers = [{ id: 1, name: "Mr. Smith" }];
    const result = normalizeCourseSummary({ id: 1, name: "C", code: "C" }, 0, teachers as any);
    expect(result.teachers).toBe(teachers);
  });

  it("reads coverImg from config", () => {
    const result = normalizeCourseSummary({
      id: 1, name: "C", code: "C", config: { coverImg: "https://img.png" },
    });
    expect(result.coverImg).toBe("https://img.png");
  });
});

describe("normalizeChapterSummary", () => {
  it("maps chapter fields", () => {
    const ch = { id: 100, name: "Intro", isOpen: true };
    const result = normalizeChapterSummary(ch);
    expect(result).toEqual({ id: 100, title: "Intro", isOpen: true });
  });

  it("coerces isOpen to boolean", () => {
    expect(normalizeChapterSummary({ id: 1, name: "A", isOpen: 1 }).isOpen).toBe(true);
    expect(normalizeChapterSummary({ id: 1, name: "A", isOpen: 0 }).isOpen).toBe(false);
    expect(normalizeChapterSummary({ id: 1, name: "A", isOpen: undefined }).isOpen).toBe(false);
  });

  it("includes isPass when userChapter provided", () => {
    const result = normalizeChapterSummary({ id: 1, name: "A", isOpen: true }, { isPass: true });
    expect(result.isPass).toBe(true);
  });

  it("omits isPass when no userChapter", () => {
    const result = normalizeChapterSummary({ id: 1, name: "A", isOpen: true });
    expect(result).not.toHaveProperty("isPass");
  });
});

describe("normalizeCourseDetail", () => {
  it("maps full course detail with chapters", () => {
    const course = {
      id: 5,
      name: "Course",
      code: "C5",
      config: { icon: "i-lucide-star", color: "warning", level: "intermediate" },
      tags: ["a"],
      categoryId: 3,
      content: { foo: "bar" },
      chapters: [{ id: 1, name: "Ch1", isOpen: true }, { id: 2, name: "Ch2", isOpen: false }],
      orders: [{ id: "o1", label: "L1", order: 0 }],
    };
    const result = normalizeCourseDetail(course);
    expect(result.id).toBe(5);
    expect(result.title).toBe("Course");
    expect(result.icon).toBe("i-lucide-star");
    expect(result.color).toBe("warning");
    expect(result.level).toBe("intermediate");
    expect(result.content).toEqual({ foo: "bar" });
    expect(result.config).toEqual(course.config);
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]).toEqual({ id: 1, title: "Ch1", isOpen: true });
    expect(result.orders).toEqual([{ id: "o1", label: "L1", order: 0 }]);
    expect(result.teachers).toEqual([]);
    expect(result.studentCount).toBe(0);
  });

  it("defaults content to empty object when missing", () => {
    const result = normalizeCourseDetail({ id: 1, name: "C", code: "C" });
    expect(result.content).toEqual({});
  });

  it("defaults chapters to empty array when missing", () => {
    const result = normalizeCourseDetail({ id: 1, name: "C", code: "C" });
    expect(result.chapters).toEqual([]);
  });

  it("defaults orders to empty array when missing", () => {
    const result = normalizeCourseDetail({ id: 1, name: "C", code: "C" });
    expect(result.orders).toEqual([]);
  });
});

describe("normalizeChapterDetail", () => {
  it("maps chapter detail fields", () => {
    const ch = {
      id: 7,
      name: "Chapter 7",
      content: { blocks: [] },
      questionIds: [1, 2],
      homeworkIds: [10],
      commentIds: [20, 21],
    };
    const result = normalizeChapterDetail(ch);
    expect(result.id).toBe(7);
    expect(result.title).toBe("Chapter 7");
    expect(result.content).toEqual({ blocks: [] });
    expect(result.questionIds).toEqual([1, 2]);
    expect(result.homeworkIds).toEqual([10]);
    expect(result.commentIds).toEqual([20, 21]);
  });

  it("defaults arrays to empty when missing", () => {
    const result = normalizeChapterDetail({ id: 1, name: "C" });
    expect(result.questionIds).toEqual([]);
    expect(result.homeworkIds).toEqual([]);
    expect(result.commentIds).toEqual([]);
    expect(result.content).toEqual({});
  });

  it("includes taskStatus and isPass when userChapter provided", () => {
    const ch = { id: 1, name: "C" };
    const userChapter = { taskStatus: { "question:1": true }, isPass: false };
    const result = normalizeChapterDetail(ch, userChapter);
    expect(result.taskStatus).toEqual({ "question:1": true });
    expect(result.isPass).toBe(false);
  });

  it("omits taskStatus/isPass when no userChapter", () => {
    const result = normalizeChapterDetail({ id: 1, name: "C" });
    expect(result).not.toHaveProperty("taskStatus");
    expect(result).not.toHaveProperty("isPass");
  });

  it("defaults taskStatus to empty object when userChapter has none", () => {
    const result = normalizeChapterDetail({ id: 1, name: "C" }, {});
    expect(result.taskStatus).toEqual({});
    expect(result.isPass).toBe(false);
  });
});

describe("normalizeChapterPageData", () => {
  it("combines chapter detail with course-level info", () => {
    const ch = { id: 1, name: "Ch", content: {}, questionIds: [], homeworkIds: [], commentIds: [] };
    const course = {
      id: 10,
      name: "Course",
      config: { icon: "i-lucide-book", color: "primary" },
      chapters: [{ id: 1, name: "Ch", isOpen: true }],
    };
    const result = normalizeChapterPageData(ch, course);
    expect(result.chapter.id).toBe(1);
    expect(result.chapter.title).toBe("Ch");
    expect(result.course.id).toBe(10);
    expect(result.course.title).toBe("Course");
    expect(result.course.icon).toBe("i-lucide-book");
    expect(result.course.color).toBe("primary");
    expect(result.course.chapters).toHaveLength(1);
  });

  it("uses default icon when config missing", () => {
    const ch = { id: 1, name: "Ch" };
    const course = { id: 10, name: "Course", chapters: [] };
    const result = normalizeChapterPageData(ch, course);
    expect(result.course.icon).toBe("i-lucide-book-open");
    expect(result.course.color).toBe("primary");
  });

  it("reads showDanmaku from mergeCourseLmsConfig result", () => {
    const ch = { id: 1, name: "Ch" };
    const course = { id: 10, name: "Course", chapters: [] };
    const result = normalizeChapterPageData(ch, course);
    // mock 的 mergeCourseLmsConfig 返回 course.showDanmaku = true
    expect(result.course.showDanmaku).toBe(true);
  });

  it("passes userChapter through to chapter detail", () => {
    const ch = { id: 1, name: "Ch" };
    const course = { id: 10, name: "Course", chapters: [] };
    const userChapter = { isPass: true, taskStatus: {} };
    const result = normalizeChapterPageData(ch, course, userChapter);
    expect(result.chapter.isPass).toBe(true);
  });
});
