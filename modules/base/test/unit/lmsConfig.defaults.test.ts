import { describe, it, expect } from "vitest";

/**
 * DEFAULT_LMS_CONFIG 新增分组的默认值校验
 * - user 分组扩展至 5 个开关（头像/密码/邮箱/语言/导出）
 * - home/courseList/chapter 新分组默认值
 * - ai.enabled 总开关默认 true
 * - storage 默认值（驱动 LmsConfigEditor UI 暴露）
 */
import { DEFAULT_LMS_CONFIG } from "../../server/utils/lmsConfig";

describe("DEFAULT_LMS_CONFIG.user (extended feature flags)", () => {
  it("has all 5 user-end feature flags", () => {
    expect(DEFAULT_LMS_CONFIG.user).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.user.allowSelfAvatarUpload).toBe(true);
    expect(DEFAULT_LMS_CONFIG.user.allowChangePassword).toBe(true);
    expect(DEFAULT_LMS_CONFIG.user.allowChangeEmail).toBe(true);
    expect(DEFAULT_LMS_CONFIG.user.allowChangeLocale).toBe(true);
    expect(DEFAULT_LMS_CONFIG.user.allowExportData).toBe(true);
  });
});

describe("DEFAULT_LMS_CONFIG.home (home page visibility)", () => {
  it("has 4 home visibility flags, all true by default", () => {
    expect(DEFAULT_LMS_CONFIG.home).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.home.showHero).toBe(true);
    expect(DEFAULT_LMS_CONFIG.home.showStats).toBe(true);
    expect(DEFAULT_LMS_CONFIG.home.showRecentCourses).toBe(true);
    expect(DEFAULT_LMS_CONFIG.home.showLeaderboard).toBe(true);
  });
});

describe("DEFAULT_LMS_CONFIG.courseList (course list visibility & view)", () => {
  it("has show flags and defaultView", () => {
    expect(DEFAULT_LMS_CONFIG.courseList).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.courseList.showSearch).toBe(true);
    expect(DEFAULT_LMS_CONFIG.courseList.showFilter).toBe(true);
    expect(DEFAULT_LMS_CONFIG.courseList.showSort).toBe(true);
    expect(DEFAULT_LMS_CONFIG.courseList.defaultView).toBe("grid");
  });
});

describe("DEFAULT_LMS_CONFIG.chapterPage (chapter page visibility)", () => {
  it("has 4 chapter page visibility flags, all true by default", () => {
    expect(DEFAULT_LMS_CONFIG.chapterPage).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.chapterPage.showOutline).toBe(true);
    expect(DEFAULT_LMS_CONFIG.chapterPage.showNote).toBe(true);
    expect(DEFAULT_LMS_CONFIG.chapterPage.showDanmakuPanel).toBe(true);
    expect(DEFAULT_LMS_CONFIG.chapterPage.enableFullscreen).toBe(true);
  });
});

describe("DEFAULT_LMS_CONFIG.ai (with enabled flag)", () => {
  it("has enabled flag defaulting to true", () => {
    expect(DEFAULT_LMS_CONFIG.ai).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.ai.enabled).toBe(true);
  });

  it("preserves all existing ai fields", () => {
    expect(DEFAULT_LMS_CONFIG.ai.mode).toBe("api");
    expect(DEFAULT_LMS_CONFIG.ai.ttsGender).toBe("female");
    expect(DEFAULT_LMS_CONFIG.ai.apiUrl).toBe("/api/aichat/chat");
  });
});

describe("DEFAULT_LMS_CONFIG.storage (drive limits)", () => {
  it("driveSize is a positive integer (default 1GB)", () => {
    expect(DEFAULT_LMS_CONFIG.storage).toBeDefined();
    expect(DEFAULT_LMS_CONFIG.storage.driveSize).toBeGreaterThan(0);
    expect(DEFAULT_LMS_CONFIG.storage.driveSize).toBe(1073741824);
  });

  it("teacherMultiplier is >= 1", () => {
    expect(DEFAULT_LMS_CONFIG.storage.teacherMultiplier).toBeGreaterThanOrEqual(1);
  });
});
