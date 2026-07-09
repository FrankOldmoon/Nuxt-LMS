/**
 * 服务端跨模块扩展 hook 注册表
 *
 * base 不感知后续模块；后续模块（lms/doc）在自身 startup plugin 中
 * 调用 register* 注入逻辑，base 在合适时机调用 run* 触发。
 */

type MeEnrichFn = (user: any) => Promise<Record<string, any>>
type UserImportedFn = (inserted: any[], rawUsers: any[]) => Promise<void>

const _meEnrichFns: MeEnrichFn[] = []
const _userImportedFns: UserImportedFn[] = []

/** 注册 me 接口字段扩展（如 lms 注入 editorCourseIds/teacherCourseIds/classIds） */
export function registerOnMeEnrich(fn: MeEnrichFn): void {
  _meEnrichFns.push(fn)
}

/** 运行所有 me 扩展，合并返回值 */
export async function runOnMeEnrich(user: any): Promise<Record<string, any>> {
  let extra: Record<string, any> = {}
  for (const fn of _meEnrichFns) {
    try {
      const part = await fn(user)
      if (part) extra = { ...extra, ...part }
    } catch (e) {
      console.error('[hooks] onMeEnrich error', e)
    }
  }
  return extra
}

/** 注册用户导入后处理（如 lms 解析班级名→建 userClasses 关联→回填 users.classId） */
export function registerOnUserImported(fn: UserImportedFn): void {
  _userImportedFns.push(fn)
}

/** 运行所有用户导入后处理 */
export async function runOnUserImported(inserted: any[], rawUsers: any[]): Promise<void> {
  for (const fn of _userImportedFns) {
    try {
      await fn(inserted, rawUsers)
    } catch (e) {
      console.error('[hooks] onUserImported error', e)
    }
  }
}
