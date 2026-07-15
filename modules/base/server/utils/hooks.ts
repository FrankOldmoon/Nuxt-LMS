/**
 * Server-side cross-module extension hook registry
 *
 * base is unaware of subsequent modules; subsequent modules (lms/doc) call register*
 * to inject logic in their own startup plugin, base calls run* to trigger at appropriate times.
 */

type MeEnrichFn = (user: any) => Promise<Record<string, any>>
type UserImportedFn = (inserted: any[], rawUsers: any[]) => Promise<void>

const _meEnrichFns: MeEnrichFn[] = []
const _userImportedFns: UserImportedFn[] = []

/** Register me endpoint field extension (e.g. lms injects editorCourseIds/teacherCourseIds/classIds) */
export function registerOnMeEnrich(fn: MeEnrichFn): void {
  _meEnrichFns.push(fn)
}

/** Run all me extensions, merge return values */
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

/** Register post-user-import processing (e.g. lms parses class name → creates userClasses association → backfills users.classId) */
export function registerOnUserImported(fn: UserImportedFn): void {
  _userImportedFns.push(fn)
}

/** Run all post-user-import processing */
export async function runOnUserImported(inserted: any[], rawUsers: any[]): Promise<void> {
  for (const fn of _userImportedFns) {
    try {
      await fn(inserted, rawUsers)
    } catch (e) {
      console.error('[hooks] onUserImported error', e)
    }
  }
}
