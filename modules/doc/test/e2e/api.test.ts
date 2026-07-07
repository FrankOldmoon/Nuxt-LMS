import { describe, test, expect, beforeAll } from "vitest";
import { setup, $fetch, fetch, url, createPage } from "@nuxt/test-utils/e2e";
import postgres from "postgres";

/**
 * doc 模块 API + 浏览器测试
 *
 * 依赖本地 PostgreSQL（.env 的 POSTGRES_URL）+ seed 数据（13 课程 / 141 章节）。
 * NUXT_MODULE_LMS=true 时 lms 的 home.ts 会覆盖 doc 的 home.get.ts，
 * 但两者返回结构一致（{ categories, courses, config, notifyUnread, msgUnread }）。
 * lms 的 /api/lms/courses/show 提供增强版课程详情，但 doc 的 /api/courses/show 仍可访问。
 *
 * 关键实现细节（已读源码确认）：
 * - requireQueryId 读取 `id` query 参数（非 cid）。
 * - /api/courses/content 先调 requireRole(['teacher','admin'])，未登录 401。
 * - /api/courses/versions、/api/chapters/versions：无 id 返回 success:false；
 *   有 id 但未登录调 requireCourseTeacher/requireChapterTeacher → 401。
 * - /api/chapters/show 在 lms 模式下，未登录访问非开放章节 throw 403。
 * - /api/search 直接返回数组（不经 cResp 包装），读取 ./storage/search/*.json。
 *
 * 注：每个测试文件 setup 一次 Nuxt 实例（~100s），故 API 与浏览器测试合并于此。
 */
describe("doc module", async () => {
  // setupTimeout 必须显式传递：@nuxt/test-utils 用它作为 beforeAll 的超时（默认 120s），
  // 会覆盖 vitest 全局 hookTimeout。fontless/unifont 字体元数据联网失败需 ~90s，故放宽至 10 分钟。
  await setup({ browser: true, setupTimeout: 600000 });

  // 动态查库获取真实 id，避免硬编码依赖具体 seed 数据值
  let realCourseId: number | null = null;
  let realChapterId: number | null = null;
  let openChapterId: number | null = null;

  beforeAll(async () => {
    try {
      const sql = postgres(
        process.env.POSTGRES_URL ||
          "postgresql://postgres:REDACTED@localhost:5432/nuxt_hub",
      );
      const [courseRow] = await sql`SELECT id FROM courses LIMIT 1`;
      realCourseId = courseRow?.id ?? null;

      const [chapterRow] = await sql`SELECT id FROM chapters LIMIT 1`;
      realChapterId = chapterRow?.id ?? null;

      // 优先取一个 isOpen=true 的章节，避开 lms 班级 gating 的 403
      const [openRow] =
        await sql`SELECT id FROM chapters WHERE "isOpen" = true LIMIT 1`;
      openChapterId = openRow?.id ?? null;

      await sql.end();
    } catch (e) {
      console.warn("[doc test] 获取测试数据失败，依赖真实 id 的测试将跳过", e);
    }
  });

  // ====================== API: home ======================
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

    test("course summary has normalized shape", async () => {
      const res = (await $fetch("/api/home")) as any;
      const course = res.data.courses[0];
      expect(course).toHaveProperty("id");
      expect(course).toHaveProperty("title");
      expect(course).toHaveProperty("code");
      expect(course).toHaveProperty("chapterCount");
      expect(course).toHaveProperty("teachers");
    });
  });

  // ====================== API: courses/show ======================
  describe("API: GET /api/courses/show", () => {
    test("returns success:false without id", async () => {
      const res = (await $fetch("/api/courses/show")) as any;
      expect(res.success).toBe(false);
      expect(res.data).toBeNull();
    });

    test("returns success:false for non-existent id", async () => {
      const res = (await $fetch("/api/courses/show?id=9999999")) as any;
      expect(res.success).toBe(false);
      expect(res.data).toBeNull();
    });

    test("returns course detail with chapters for real id", async () => {
      if (!realCourseId) return; // 无课程数据则跳过
      const res = (await $fetch(`/api/courses/show?id=${realCourseId}`)) as any;
      expect(res.success).toBe(true);
      expect(res.data).toBeTruthy();
      expect(res.data.id).toBe(realCourseId);
      expect(res.data).toHaveProperty("title");
      expect(res.data).toHaveProperty("code");
      expect(Array.isArray(res.data.chapters)).toBe(true);
    });
  });

  // ====================== API: chapters/show ======================
  describe("API: GET /api/chapters/show", () => {
    test("returns success:false without id", async () => {
      // requireQueryId 读取 `id` 参数（非 cid）
      const res = (await $fetch("/api/chapters/show")) as any;
      expect(res.success).toBe(false);
      expect(res.data).toBeNull();
    });

    test("returns success:false for non-existent id", async () => {
      const res = (await $fetch("/api/chapters/show?id=9999999")) as any;
      expect(res.success).toBe(false);
      expect(res.data).toBeNull();
    });

    test("returns chapter detail or 403 for real id (lms gating)", async () => {
      // lms 启用时，未登录访问非开放章节 throw 403；开放章节返回 success:true
      const chapterId = openChapterId || realChapterId;
      if (!chapterId) return; // 无章节数据则跳过
      const res = await fetch(url(`/api/chapters/show?id=${chapterId}`));
      // 200（开放章节 / doc 模式）或 403（lms 班级 gating）
      expect([200, 403]).toContain(res.status);
      if (res.status === 200) {
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toBeTruthy();
        expect(body.data).toHaveProperty("chapter");
        expect(body.data).toHaveProperty("course");
      }
    });
  });

  // ====================== API: courses/versions (需登录) ======================
  describe("API: GET /api/courses/versions", () => {
    test("returns success:false without id", async () => {
      const res = (await $fetch("/api/courses/versions")) as any;
      expect(res.success).toBe(false);
    });

    test("returns 401 when not authenticated (real id)", async () => {
      if (!realCourseId) return;
      const res = await fetch(url(`/api/courses/versions?id=${realCourseId}`));
      expect(res.status).toBe(401);
    });
  });

  // ====================== API: chapters/versions (需登录) ======================
  describe("API: GET /api/chapters/versions", () => {
    test("returns success:false without id", async () => {
      const res = (await $fetch("/api/chapters/versions")) as any;
      expect(res.success).toBe(false);
    });

    test("returns 401 when not authenticated (real id)", async () => {
      if (!realChapterId) return;
      const res = await fetch(url(`/api/chapters/versions?id=${realChapterId}`));
      expect(res.status).toBe(401);
    });
  });

  // ====================== API: courses/content (需登录) ======================
  describe("API: GET /api/courses/content", () => {
    test("returns 401 when not authenticated", async () => {
      // requireRole(['teacher','admin']) 在读取 query 之前调用，未登录直接 401
      const res = await fetch(url("/api/courses/content?course_id=1"));
      expect(res.status).toBe(401);
    });
  });

  // ====================== API: search ======================
  describe("API: GET /api/search", () => {
    test("returns an array (index.json fallback)", async () => {
      // 无 courseId 时读取 storage/search/index.json，直接返回数组（非 cResp 包装）
      const res = (await $fetch("/api/search")) as any;
      expect(Array.isArray(res)).toBe(true);
    });

    test("returns an array for a real courseId", async () => {
      if (!realCourseId) return;
      const res = (await $fetch(`/api/search?courseId=${realCourseId}`)) as any;
      expect(Array.isArray(res)).toBe(true);
    });

    test("returns empty array for non-existent courseId", async () => {
      const res = (await $fetch("/api/search?courseId=9999999")) as any;
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(0);
    });
  });

  // ====================== 浏览器：页面渲染 ======================
  describe("Browser: pages", () => {
    test("/editor renders without crash (no login)", async () => {
      // editor.vue 不读取 id 参数，未登录也应正常渲染（不 500）
      const page = await createPage();
      await page.goto(url("/editor"), { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      const bodyText = (await page.textContent("body")) || "";
      expect(bodyText.length).toBeGreaterThan(0);
    });

    test("/course/<id> renders course detail page", async () => {
      // lms 启用时渲染 lms 的 course/[id]/index.vue，能渲染即可
      if (!realCourseId) return;
      const page = await createPage();
      await page.goto(url(`/course/${realCourseId}`), {
        waitUntil: "domcontentloaded",
      });
      await page.waitForLoadState("networkidle");
      const bodyText = (await page.textContent("body")) || "";
      expect(bodyText.length).toBeGreaterThan(0);
    });
  });
});
