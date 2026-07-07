import { describe, test, expect, beforeAll } from "vitest";
import { setup, $fetch, fetch, url, createPage } from "@nuxt/test-utils/e2e";
import postgres from "postgres";

/**
 * lms 模块 API + 浏览器测试
 *
 * 依赖本地 PostgreSQL（.env 的 POSTGRES_URL）+ seed 数据。
 * 测试只断言结构 / 状态码 / 相对值，不依赖具体数据值。
 *
 * 注：每个测试文件 setup 一次 Nuxt 实例（~100s），故 API 与浏览器测试合并于此。
 * 注：lms 多数端点 requireAuth，未登录会抛 401；公开端点（home/courses/list/lms/courses/show）
 *     可直接断言 success 响应。需登录端点用 fetch(url(...)) 检查 401。
 */
describe("lms module", async () => {
  // setupTimeout 必须显式传递：@nuxt/test-utils 用它作为 beforeAll 的超时（默认 120s），
  // 会覆盖 vitest 全局 hookTimeout。fontless/unifont 字体元数据联网失败需 ~90s，故放宽至 10 分钟。
  await setup({ browser: true, setupTimeout: 600000 });

  // 动态获取真实 courseId / chapterId 用于详情与浏览器测试
  let courseId: number | null = null;
  let chapterId: number | null = null;
  let chapterCourseId: number | null = null;

  beforeAll(async () => {
    try {
      const sql = postgres(
        process.env.POSTGRES_URL ||
          "postgresql://postgres:REDACTED@localhost:5432/nuxt_hub",
      );
      // 取一个章节及其所属课程，保证 chapter 页测试用对 courseId
      const chapterRows =
        await sql`SELECT id, course_id FROM chapters LIMIT 1`;
      if (chapterRows[0]) {
        chapterId = chapterRows[0].id;
        chapterCourseId = chapterRows[0].course_id;
      }
      // 取任意课程用于课程级测试
      const courseRows = await sql`SELECT id FROM courses LIMIT 1`;
      courseId = courseRows[0]?.id ?? chapterCourseId;
      await sql.end();
    } catch (e) {
      console.warn("[lms test] 获取测试数据失败，依赖真实 id 的测试将跳过", e);
    }
  });

  // ====================== API: home（lms 覆盖版）======================
  describe("API: GET /api/home", () => {
    test("returns aggregated home data with success:true", async () => {
      const res = (await $fetch("/api/home")) as any;
      expect(res.success).toBe(true);
      expect(res.data).toBeTruthy();
      expect(Array.isArray(res.data.categories)).toBe(true);
      expect(Array.isArray(res.data.courses)).toBe(true);
      expect(res.data.categories.length).toBeGreaterThan(0);
      expect(res.data.courses.length).toBeGreaterThan(0);
      expect(res.data).toHaveProperty("config");
      expect(res.data).toHaveProperty("notifyUnread");
      expect(res.data).toHaveProperty("msgUnread");
    });
  });

  // ====================== API: courses/list ======================
  describe("API: GET /api/courses/list", () => {
    test("returns courses array with id/name/code", async () => {
      const res = (await $fetch("/api/courses/list")) as any;
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
      const course = res.data[0];
      expect(course).toHaveProperty("id");
      expect(course).toHaveProperty("name");
      expect(course).toHaveProperty("code");
    });
  });

  // ====================== API: lms/courses/show（增强版详情）======================
  describe("API: GET /api/lms/courses/show", () => {
    test("returns success:false when id is missing", async () => {
      const res = (await $fetch("/api/lms/courses/show")) as any;
      expect(res.success).toBe(false);
    });

    test("returns success:false for non-existent id", async () => {
      const res = (await $fetch("/api/lms/courses/show?id=9999999")) as any;
      expect(res.success).toBe(false);
    });

    test("returns course detail with teachers/studentCount/chapters.accessible", async () => {
      if (!courseId) return; // 查不到课程则跳过
      const res = (await $fetch(`/api/lms/courses/show?id=${courseId}`)) as any;
      expect(res.success).toBe(true);
      expect(res.data).toBeTruthy();
      expect(res.data.id).toBe(courseId);
      expect(res.data).toHaveProperty("title");
      expect(Array.isArray(res.data.chapters)).toBe(true);
      expect(res.data).toHaveProperty("teachers");
      expect(res.data).toHaveProperty("studentCount");
      // 章节元素应含 accessible 字段（lms 增强字段）
      if (res.data.chapters.length > 0) {
        expect(res.data.chapters[0]).toHaveProperty("accessible");
      }
    });
  });

  // ====================== API: classes/list（需登录）======================
  describe("API: GET /api/classes/list", () => {
    test("returns 401 when not authenticated", async () => {
      const res = await fetch(url("/api/classes/list"));
      expect(res.status).toBe(401);
    });
  });

  // ====================== API: courses/me（需登录）======================
  describe("API: GET /api/courses/me", () => {
    test("returns 401 when not authenticated", async () => {
      if (!courseId) return;
      const res = await fetch(url(`/api/courses/me?courseId=${courseId}`));
      expect(res.status).toBe(401);
    });
  });

  // ====================== API: courses/members（需登录 + 教师）======================
  describe("API: GET /api/courses/members", () => {
    test("returns 401 when not authenticated", async () => {
      if (!courseId) return;
      // members.get.ts 先调 requireQueryId（读 `id` 参数），再调 requireCourseTeacher → 401
      const res = await fetch(url(`/api/courses/members?id=${courseId}`));
      expect(res.status).toBe(401);
    });
  });

  // ====================== API: courses/grades（需登录）======================
  describe("API: GET /api/courses/grades", () => {
    test("returns 401 when not authenticated", async () => {
      if (!courseId) return;
      const res = await fetch(url(`/api/courses/grades?courseId=${courseId}`));
      expect(res.status).toBe(401);
    });
  });

  // ====================== API: courses/leaderboard（需登录）======================
  describe("API: GET /api/courses/leaderboard", () => {
    test("returns 401 when not authenticated", async () => {
      if (!courseId) return;
      const res = await fetch(
        url(`/api/courses/leaderboard?courseId=${courseId}`),
      );
      expect(res.status).toBe(401);
    });
  });

  // ====================== API: announcements/list（需登录）======================
  describe("API: GET /api/announcements/list", () => {
    test("returns 401 when not authenticated", async () => {
      if (!courseId) return;
      const res = await fetch(
        url(`/api/announcements/list?courseId=${courseId}`),
      );
      expect(res.status).toBe(401);
    });
  });

  // ====================== API: chapters/classes（需登录 + 教师）======================
  describe("API: GET /api/chapters/classes", () => {
    test("returns 401 when not authenticated", async () => {
      if (!chapterId) return;
      const res = await fetch(url(`/api/chapters/classes?chapterId=${chapterId}`));
      expect(res.status).toBe(401);
    });
  });

  // ====================== API: comments/list（需登录）======================
  describe("API: GET /api/comments/list", () => {
    test("returns 401 when not authenticated", async () => {
      const res = await fetch(url("/api/comments/list?course_id=1&cid=1"));
      expect(res.status).toBe(401);
    });
  });

  // ====================== 浏览器：页面渲染 ======================
  describe("Browser: pages", () => {
    test("homepage / renders content", async () => {
      const page = await createPage();
      await page.goto(url("/"), { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      const bodyText = (await page.textContent("body")) || "";
      expect(bodyText.length).toBeGreaterThan(0);
    });

    test("course detail /course/<id> renders content", async () => {
      if (!courseId) return;
      const page = await createPage();
      await page.goto(url(`/course/${courseId}`), {
        waitUntil: "domcontentloaded",
      });
      await page.waitForLoadState("networkidle");
      const bodyText = (await page.textContent("body")) || "";
      expect(bodyText.length).toBeGreaterThan(0);
    });

    test("chapter page /course/<id>/<cid> renders without crash", async () => {
      if (!chapterCourseId || !chapterId) return;
      const page = await createPage();
      await page.goto(url(`/course/${chapterCourseId}/${chapterId}`), {
        waitUntil: "domcontentloaded",
      });
      await page.waitForLoadState("networkidle");
      const bodyText = (await page.textContent("body")) || "";
      expect(bodyText.length).toBeGreaterThan(0);
    });
  });
});
