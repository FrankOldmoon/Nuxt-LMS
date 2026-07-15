import type { LmsSeries, LmsChapterSummary } from '#lms/types/lms'

/** Normalize category (DB categories -> LmsSeries) */
export function normalizeCategory(cat: any): LmsSeries {
  return {
    id: cat.id,
    title: cat.name,
    code: cat.code,
    icon: 'i-lucide-folder',
    order: cat.order ?? 0,
    orders: (cat.orders as { id: string; label: string; order: number; parentId?: string | null }[]) || [],
  }
}

/** Normalize chapter summary (DB chapters -> LmsChapterSummary) */
export function normalizeChapterSummary(ch: any, userChapter?: any): LmsChapterSummary {
  const result: LmsChapterSummary = {
    id: ch.id,
    title: ch.name,
    isOpen: !!ch.isOpen,
  }
  if (userChapter) {
    result.isPass = !!userChapter.isPass
  }
  return result
}
