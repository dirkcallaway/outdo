import { query, mutation, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { requireUserId, getUserId } from './helpers'

// List exercises available to the current user: all global (wger) rows plus the
// user's own custom rows. Optional text search + category filter.
export const list = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)

    if (args.search && args.search.trim().length > 0) {
      const results = await ctx.db
        .query('exercises')
        .withSearchIndex('search_name', q => q.search('name', args.search!))
        .take(50)
      return results.filter(
        e => e.source === 'wger' || e.createdBy === userId
      )
    }

    // No search: page through global + own custom exercises.
    const globals = await ctx.db
      .query('exercises')
      .withIndex('by_creator', q => q.eq('createdBy', undefined))
      .take(500)
    const mine = userId
      ? await ctx.db
          .query('exercises')
          .withIndex('by_creator', q => q.eq('createdBy', userId))
          .take(200)
      : []

    let all = [...mine, ...globals]
    if (args.category) {
      all = all.filter(e => e.category === args.category)
    }
    return all.sort((a, b) => a.name.localeCompare(b.name))
  }
})

export const get = query({
  args: { id: v.id('exercises') },
  handler: async (ctx, args) => ctx.db.get(args.id)
})

// Distinct category list for filter chips.
export const categories = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('exercises').take(1000)
    const set = new Set<string>()
    for (const r of rows) if (r.category) set.add(r.category)
    return [...set].sort()
  }
})

export const createCustom = mutation({
  args: {
    name: v.string(),
    category: v.optional(v.string()),
    equipment: v.optional(v.string()),
    bodyweight: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    return ctx.db.insert('exercises', {
      name: args.name.trim(),
      category: args.category,
      equipment: args.equipment,
      bodyweight: args.bodyweight,
      source: 'custom',
      createdBy: userId
    })
  }
})

// Toggle the body-weight flag on a user's own custom exercise. wger rows are
// global/shared, so only the creator can flip their own exercises.
export const setBodyweight = mutation({
  args: { id: v.id('exercises'), bodyweight: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const ex = await ctx.db.get(args.id)
    if (!ex || ex.createdBy !== userId) throw new Error('Not found')
    await ctx.db.patch(args.id, { bodyweight: args.bodyweight })
  }
})

// Called by the seed action for each wger exercise; upserts by wgerId.
export const upsertFromWger = internalMutation({
  args: {
    wgerId: v.number(),
    name: v.string(),
    category: v.optional(v.string()),
    equipment: v.optional(v.string()),
    muscles: v.optional(v.array(v.string())),
    imageUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('exercises')
      .withIndex('by_wgerId', q => q.eq('wgerId', args.wgerId))
      .unique()

    // wger's equipment 7 is "none (bodyweight exercise)"; classify accordingly.
    const bodyweight = /body\s?weight|bodyweight|none/i.test(args.equipment ?? '')

    const doc = {
      name: args.name,
      category: args.category,
      equipment: args.equipment,
      muscles: args.muscles,
      imageUrl: args.imageUrl,
      source: 'wger' as const,
      wgerId: args.wgerId,
      bodyweight
    }

    if (existing) {
      await ctx.db.patch(existing._id, doc)
      return existing._id
    }
    return ctx.db.insert('exercises', doc)
  }
})
