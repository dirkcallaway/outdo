'use node'

import { action } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

interface WgerTranslation { name: string, language: number }
interface WgerNamed { name: string, name_en?: string }
interface WgerImage { image: string }
interface WgerExerciseInfo {
  id: number
  category?: { name: string }
  muscles?: WgerNamed[]
  equipment?: WgerNamed[]
  images?: WgerImage[]
  translations?: WgerTranslation[]
}
interface WgerPage { next: string | null, results: WgerExerciseInfo[] }

const ENGLISH = 2
const PAGE = 'https://wger.de/api/v2/exerciseinfo/?language=2&format=json&limit=100'

// One-off import of the wger exercise database into `exercises`.
// Run from the Convex dashboard or: `npx convex run seed:seedExercises`
export const seedExercises = action({
  args: { maxPages: v.optional(v.number()) },
  handler: async (ctx, args) => {
    let url: string | null = PAGE
    let imported = 0
    let pages = 0
    const cap = args.maxPages ?? 20

    while (url && pages < cap) {
      const res: Response = await fetch(url)
      if (!res.ok) throw new Error(`wger fetch failed: ${res.status}`)
      const data = (await res.json()) as WgerPage
      pages++

      for (const item of data.results) {
        const en = item.translations?.find(t => t.language === ENGLISH)
        const name = (en?.name ?? item.translations?.[0]?.name ?? '').trim()
        if (!name) continue

        await ctx.runMutation(internal.exercises.upsertFromWger, {
          wgerId: item.id,
          name,
          category: item.category?.name,
          equipment: item.equipment?.map(e => e.name).join(', ') || undefined,
          muscles: item.muscles?.map(m => m.name_en || m.name),
          imageUrl: item.images?.[0]?.image
        })
        imported++
      }
      url = data.next
    }

    return { imported, pages }
  }
})
