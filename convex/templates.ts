// Reusable "Workouts" the user builds (UI: the Workouts tab). Named lists of
// exercises with target sets/reps, with no date and no weight. A calendar
// session is created from one of these (see workouts.create).
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireUserId, getUserId } from './helpers'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return []
    const plans = await ctx.db
      .query('templates')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    // Attach an exercise count for the list view.
    return Promise.all(
      plans.map(async (plan) => {
        const entries = await ctx.db
          .query('templateEntries')
          .withIndex('by_template', q => q.eq('templateId', plan._id))
          .collect()
        return { ...plan, exerciseCount: entries.length }
      })
    )
  }
})

export const getWithExercises = query({
  args: { id: v.id('templates') },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const plan = await ctx.db.get(args.id)
    if (!plan || plan.userId !== userId) return null
    const exercises = await ctx.db
      .query('templateEntries')
      .withIndex('by_template', q => q.eq('templateId', args.id))
      .collect()
    exercises.sort((a, b) => a.order - b.order)
    return { ...plan, exercises }
  }
})

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    return ctx.db.insert('templates', {
      userId,
      name: args.name.trim() || 'Workout'
    })
  }
})

export const rename = mutation({
  args: { id: v.id('templates'), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const plan = await ctx.db.get(args.id)
    if (!plan || plan.userId !== userId) throw new Error('Not found')
    await ctx.db.patch(args.id, { name: args.name.trim() || plan.name })
  }
})

export const remove = mutation({
  args: { id: v.id('templates') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const plan = await ctx.db.get(args.id)
    if (!plan || plan.userId !== userId) throw new Error('Not found')
    const entries = await ctx.db
      .query('templateEntries')
      .withIndex('by_template', q => q.eq('templateId', args.id))
      .collect()
    for (const e of entries) await ctx.db.delete(e._id)
    await ctx.db.delete(args.id)
  }
})

export const addExercise = mutation({
  args: { templateId: v.id('templates'), exerciseId: v.id('exercises') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const plan = await ctx.db.get(args.templateId)
    if (!plan || plan.userId !== userId) throw new Error('Not found')
    const ex = await ctx.db.get(args.exerciseId)
    if (!ex) throw new Error('Exercise not found')
    const existing = await ctx.db
      .query('templateEntries')
      .withIndex('by_template', q => q.eq('templateId', args.templateId))
      .collect()
    return ctx.db.insert('templateEntries', {
      templateId: args.templateId,
      userId,
      exerciseId: args.exerciseId,
      exerciseName: ex.name,
      order: existing.length,
      targetSets: 3,
      targetReps: 10,
      bodyweight: ex.bodyweight
    })
  }
})

export const updateTargets = mutation({
  args: {
    entryId: v.id('templateEntries'),
    targetSets: v.optional(v.number()),
    targetReps: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const entry = await ctx.db.get(args.entryId)
    if (!entry || entry.userId !== userId) throw new Error('Not found')
    const patch: Record<string, number> = {}
    if (args.targetSets !== undefined) patch.targetSets = Math.max(1, args.targetSets)
    if (args.targetReps !== undefined) patch.targetReps = Math.max(0, args.targetReps)
    await ctx.db.patch(args.entryId, patch)
  }
})

export const removeExercise = mutation({
  args: { entryId: v.id('templateEntries') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const entry = await ctx.db.get(args.entryId)
    if (!entry || entry.userId !== userId) throw new Error('Not found')
    await ctx.db.delete(args.entryId)
  }
})

export const reorder = mutation({
  args: { orderedEntryIds: v.array(v.id('templateEntries')) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    let order = 0
    for (const id of args.orderedEntryIds) {
      const entry = await ctx.db.get(id)
      if (entry && entry.userId === userId) await ctx.db.patch(id, { order })
      order++
    }
  }
})
