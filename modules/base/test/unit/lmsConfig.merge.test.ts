import { describe, it, expect } from "vitest";

/**
 * mergeConfig 深合并对新增字段的兼容性测试
 * - 验证新增的 user/home/courseList/chapter/storage 分组在合并中保留默认值
 * - 验证部分覆盖不会回写其他子字段为 undefined
 */
import { mergeConfig, DEFAULT_LMS_CONFIG } from "../../server/utils/lmsConfig";

describe("mergeConfig with new groups (user/home/courseList/chapter/storage)", () => {
  it("merges empty overrides preserves all default sub-fields", () => {
    const result = mergeConfig(DEFAULT_LMS_CONFIG, {});
    // user: 5 flags
    expect(result.user.allowSelfAvatarUpload).toBe(true);
    expect(result.user.allowChangePassword).toBe(true);
    expect(result.user.allowChangeEmail).toBe(true);
    expect(result.user.allowChangeLocale).toBe(true);
    expect(result.user.allowExportData).toBe(true);
    // home: 4 flags
    expect(result.home.showHero).toBe(true);
    expect(result.home.showStats).toBe(true);
    expect(result.home.showRecentCourses).toBe(true);
    expect(result.home.showLeaderboard).toBe(true);
    // courseList
    expect(result.courseList.showSearch).toBe(true);
    expect(result.courseList.showFilter).toBe(true);
    expect(result.courseList.showSort).toBe(true);
    expect(result.courseList.defaultView).toBe("grid");
    // chapterPage
    expect(result.chapterPage.showOutline).toBe(true);
    expect(result.chapterPage.showNote).toBe(true);
    expect(result.chapterPage.showDanmakuPanel).toBe(true);
    expect(result.chapterPage.enableFullscreen).toBe(true);
    // storage
    expect(result.storage.driveSize).toBe(1073741824);
    expect(result.storage.teacherMultiplier).toBe(1);
  });

  it("partial user override preserves other user fields", () => {
    const result = mergeConfig(DEFAULT_LMS_CONFIG, { user: { allowChangePassword: false } });
    expect(result.user.allowChangePassword).toBe(false);
    // 其他 user 字段不应被回写为 undefined
    expect(result.user.allowSelfAvatarUpload).toBe(true);
    expect(result.user.allowChangeEmail).toBe(true);
    expect(result.user.allowChangeLocale).toBe(true);
    expect(result.user.allowExportData).toBe(true);
  });

  it("partial courseList override preserves show flags when only defaultView is overridden", () => {
    const result = mergeConfig(DEFAULT_LMS_CONFIG, { courseList: { defaultView: "list" } });
    expect(result.courseList.defaultView).toBe("list");
    expect(result.courseList.showSearch).toBe(true);
    expect(result.courseList.showFilter).toBe(true);
    expect(result.courseList.showSort).toBe(true);
  });

  it("ai.enabled = false override does not reset other ai fields", () => {
    const result = mergeConfig(DEFAULT_LMS_CONFIG, { ai: { enabled: false } });
    expect(result.ai.enabled).toBe(false);
    expect(result.ai.mode).toBe("api");
    expect(result.ai.ttsGender).toBe("female");
  });

  it("storage.teacherMultiplier numeric override", () => {
    const result = mergeConfig(DEFAULT_LMS_CONFIG, { storage: { teacherMultiplier: 5 } });
    expect(result.storage.teacherMultiplier).toBe(5);
    expect(result.storage.driveSize).toBe(1073741824); // 保持默认
  });
});
