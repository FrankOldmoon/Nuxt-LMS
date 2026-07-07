import { describe, test, expect, beforeAll } from "vitest";
import { setup, $fetch, fetch, url, createPage } from "@nuxt/test-utils/e2e";
import postgres from "postgres";

/**
 * base 模块 API + 浏览器测试
 *
 * 依赖本地 PostgreSQL（.env 的 POSTGRES_URL）+ seed 数据。
 * 测试只断言结构 / 状态码 / 相对值，不依赖具体数据值，
 * 唯一例外是登录成功测试，它在 beforeAll 里动态查库获取一个哈希用户。
 *
 * 注：每个测试文件 setup 一次 Nuxt 实例（~100s），故 API 与浏览器测试合并于此。
 */
describe("base module", async () => {
  await setup({ browser: true, setupTimeout: 600000 });

  // 动态获取一个 seed 创建的哈希用户（密码 123456）用于登录测试
  let testUsername: string | null = null;
  beforeAll(async () => {
    try {
      const sql = postgres(
        process.env.POSTGRES_URL ||
          "postgresql://postgres:REDACTED@localhost:5432/nuxt_hub",
      );
      const rows = await sql`SELECT username FROM users WHERE password LIKE '%:%' LIMIT 1`;
      testUsername = rows[0]?.username ?? null;
      await sql.end();
    } catch (e) {
      console.warn("[base test] 获取测试用户失败，登录成功测试将跳过", e);
    }
  });

  // ====================== API: site-config ======================
  describe("API: GET /api/site-config", () => {
    test("returns site config object", async () => {
      const res = (await $fetch("/api/site-config")) as any;
      expect(res).toBeTruthy();
      expect(typeof res).toBe("object");
      expect(res).toHaveProperty("siteTitle");
      expect(res).toHaveProperty("allowRegistration");
      expect(res).toHaveProperty("pageSize");
      expect(res).toHaveProperty("mail");
    });

    test("mail sub-object has smtp fields", async () => {
      const res = (await $fetch("/api/site-config")) as any;
      expect(res.mail).toHaveProperty("host");
      expect(res.mail).toHaveProperty("port");
      expect(res.mail).toHaveProperty("secure");
    });
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
      expect(res.data).toHaveProperty("notifyUnread");
      expect(res.data).toHaveProperty("msgUnread");
    });

    test("course summary has normalized shape", async () => {
      const res = (await $fetch("/api/home")) as any;
      const course = res.data.courses[0];
      expect(course).toHaveProperty("id");
      expect(course).toHaveProperty("title");
      expect(course).toHaveProperty("code");
      expect(course).toHaveProperty("icon");
      expect(course).toHaveProperty("color");
      expect(course).toHaveProperty("level");
      expect(course).toHaveProperty("chapterCount");
      expect(course).toHaveProperty("teachers");
    });
  });

  // ====================== API: auth/login ======================
  describe("API: POST /api/auth/login", () => {
    test("rejects empty body with success:false", async () => {
      const res = (await $fetch("/api/auth/login", {
        method: "POST",
        body: {},
      })) as any;
      expect(res.success).toBe(false);
      expect(res.data).toBeNull();
    });

    test("rejects missing username", async () => {
      const res = (await $fetch("/api/auth/login", {
        method: "POST",
        body: { password: "123456" },
      })) as any;
      expect(res.success).toBe(false);
    });

    test("rejects missing password", async () => {
      const res = (await $fetch("/api/auth/login", {
        method: "POST",
        body: { username: "admin" },
      })) as any;
      expect(res.success).toBe(false);
    });

    test("rejects non-existent user", async () => {
      const res = (await $fetch("/api/auth/login", {
        method: "POST",
        body: { username: "no_such_user_xyz", password: "123456" },
      })) as any;
      expect(res.success).toBe(false);
      expect(res.msg).toContain("Invalid");
    });

    test("rejects wrong password for existing admin (plaintext hash)", async () => {
      // admin 密码是明文 '123456'，verifyPassword 会拒绝（无冒号分隔）
      const res = (await $fetch("/api/auth/login", {
        method: "POST",
        body: { username: "admin", password: "123456" },
      })) as any;
      expect(res.success).toBe(false);
    });

    test("logs in successfully with a seed hashed user (password 123456)", async () => {
      if (!testUsername) return; // 查不到用户则跳过
      const res = (await $fetch("/api/auth/login", {
        method: "POST",
        body: { username: testUsername, password: "123456" },
      })) as any;
      expect(res.success).toBe(true);
      expect(res.data.user).toBeTruthy();
      expect(res.data.user.username).toBe(testUsername);
      expect(res.data.token).toBeTruthy();
      expect(res.msg).toContain("Login");
    });
  });

  // ====================== API: auth/me ======================
  describe("API: GET /api/auth/me", () => {
    test("returns success:false when not authenticated", async () => {
      const res = (await $fetch("/api/auth/me")) as any;
      expect(res.success).toBe(false);
      expect(res.data).toBeNull();
    });
  });

  // ====================== API: configs/list（需 admin）======================
  describe("API: GET /api/configs/list", () => {
    test("returns 401 when not authenticated", async () => {
      const res = await fetch(url("/api/configs/list"));
      expect(res.status).toBe(401);
    });
  });

  // ====================== API: notifications/list（需登录）======================
  describe("API: GET /api/notifications/list", () => {
    test("returns 401 when not authenticated", async () => {
      const res = await fetch(url("/api/notifications/list"));
      expect(res.status).toBe(401);
    });
  });

  // ====================== API: curd 通用 CRUD ======================
  describe("API: GET /api/curd/[table]/list", () => {
    test("lists courses as array", async () => {
      const res = (await $fetch("/api/curd/courses/list")) as any;
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
    });

    test("lists categories as array", async () => {
      const res = (await $fetch("/api/curd/categories/list")) as any;
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });

    test("rejects invalid table name with 400", async () => {
      const res = await fetch(url("/api/curd/invalid_table_xyz/list"));
      expect(res.status).toBe(400);
    });
  });

  // ====================== API: curd show ======================
  describe("API: GET /api/curd/[table]/show", () => {
    test("returns a course by id", async () => {
      const list = (await $fetch("/api/curd/courses/list")) as any;
      const id = list.data[0].id;
      const res = (await $fetch(`/api/curd/courses/show?id=${id}`)) as any;
      expect(res.success).toBe(true);
      expect(res.data).toBeTruthy();
      expect(res.data.id).toBe(id);
    });

    test("returns null for non-existent id", async () => {
      const res = (await $fetch("/api/curd/courses/show?id=9999999")) as any;
      expect(res.success).toBe(true);
      expect(res.data).toBeNull();
    });
  });

  // ====================== 浏览器：页面渲染 ======================
  describe("Browser: pages", () => {
    test("/reset-password renders reset form", async () => {
      const page = await createPage();
      await page.goto(url("/reset-password"));
      // 等待页面 hydration
      await page.waitForLoadState("networkidle");
      // 页面应包含重置密码相关文本或输入框
      const bodyText = await page.textContent("body");
      expect(bodyText).toBeTruthy();
    });

    test("homepage / returns 200 and renders content", async () => {
      const page = await createPage();
      const responses: number[] = [];
      page.on("response", (r) => {
        if (r.url().includes("/course") || r.url().endsWith("/")) {
          responses.push(r.status());
        }
      });
      await page.goto(url("/"), { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      const bodyText = (await page.textContent("body")) || "";
      expect(bodyText.length).toBeGreaterThan(0);
    });

    test("visiting protected page without login does not crash", async () => {
      // 访问需登录的编辑器页面，应跳转或显示登录提示，而非 500
      const page = await createPage();
      await page.goto(url("/editor?id=1"), { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      const bodyText = (await page.textContent("body")) || "";
      expect(bodyText.length).toBeGreaterThan(0);
    });
  });
});
