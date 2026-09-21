import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireUserId, getUserId } from './helpers'

const statusValidator = v.union(
  v.literal('planned'),
  v.literal('in_progress'),
  v.literal('completed')
)

// All workouts for the signed-in user within a month (YYYY-MM), for calendar dots.
export const listByMonth = query({
  args: { month: v.string() }, // "2026-09"
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    if (!userId) return []
    const rows = await ctx.db
      .query('workouts')
      .withIndex('by_user_date', q =>
        q.eq('userId', userId).gte('date', `${args.month}-01`).lte('date', `${args.month}-31`)
      )
      .collect()
    return rows
  }
})

export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    if (!userId) return []
    return ctx.db
      .query('workouts')
      .withIndex('by_user_date', q => q.eq('userId', userId).eq('date', args.date))
      .collect()
  }
})

// Full workout with its ordered entries and their sets.
export const getWithEntries = query({
  args: { id: v.id('workouts') },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const workout = await ctx.db.get(args.id)
    if (!workout || workout.userId !== userId) return null

    const entries = await ctx.db
      .query('workoutEntries')
      .withIndex('by_workout', q => q.eq('workoutId', args.id))
      .collect()
    entries.sort((a, b) => a.order - b.order)

    const withSets = await Promise.all(
      entries.map(async (entry) => {
        const sets = await ctx.db
          .query('sets')
          .withIndex('by_entry', q => q.eq('entryId', entry._id))
          .collect()
        sets.sort((a, b) => a.setNumber - b.setNumber)
        return { ...entry, sets }
      })
    )
    return { ...workout, entries: withSets }
  }
})

export const create = mutation({
  args: {
    date: v.string(),
    name: v.string(),
    exerciseIds: v.optional(v.array(v.id('exercises')))
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const workoutId = await ctx.db.insert('workouts', {
      userId,
      date: args.date,
      name: args.name.trim() || 'Workout',
      status: 'planned'
    })

    if (args.exerciseIds?.length) {
      let order = 0
      for (const exerciseId of args.exerciseIds) {
        const ex = await ctx.db.get(exerciseId)
        if (!ex) continue
        await ctx.db.insert('workoutEntries', {
          workoutId,
          userId,
          exerciseId,
          exerciseName: ex.name,
          order: order++
        })
      }
    }
    return workoutId
  }
})

export const addExercise = mutation({
  args: { workoutId: v.id('workouts'), exerciseId: v.id('exercises') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const workout = await ctx.db.get(args.workoutId)
    if (!workout || workout.userId !== userId) throw new Error('Not found')
    const ex = await ctx.db.get(args.exerciseId)
    if (!ex) throw new Error('Exercise not found')

    const existing = await ctx.db
      .query('workoutEntries')
      .withIndex('by_workout', q => q.eq('workoutId', args.workoutId))
      .collect()
    return ctx.db.insert('workoutEntries', {
      workoutId: args.workoutId,
      userId,
      exerciseId: args.exerciseId,
      exerciseName: ex.name,
      order: existing.length
    })
  }
})

export const removeEntry = mutation({
  args: { entryId: v.id('workoutEntries') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const entry = await ctx.db.get(args.entryId)
    if (!entry || entry.userId !== userId) throw new Error('Not found')
    // Delete the entry's sets too.
    const sets = await ctx.db
      .query('sets')
      .withIndex('by_entry', q => q.eq('entryId', args.entryId))
      .collect()
    for (const s of sets) await ctx.db.delete(s._id)
    await ctx.db.delete(args.entryId)
  }
})

export const reorderEntries = mutation({
  args: { orderedEntryIds: v.array(v.id('workoutEntries')) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    let order = 0
    for (const id of args.orderedEntryIds) {
      const entry = await ctx.db.get(id)
      if (entry && entry.userId === userId) {
        await ctx.db.patch(id, { order: order })
      }
      order++
    }
  }
})

export const setStatus = mutation({
  args: { id: v.id('workouts'), status: statusValidator },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const workout = await ctx.db.get(args.id)
    if (!workout || workout.userId !== userId) throw new Error('Not found')
    const patch: Record<string, unknown> = { status: args.status }
    if (args.status === 'in_progress' && !workout.startedAt) patch.startedAt = Date.now()
    if (args.status === 'completed') patch.completedAt = Date.now()
    await ctx.db.patch(args.id, patch)
  }
})

export const update = mutation({
  args: {
    id: v.id('workouts'),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
    date: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const workout = await ctx.db.get(args.id)
    if (!workout || workout.userId !== userId) throw new Error('Not found')
    const { id, ...rest } = args
    await ctx.db.patch(id, rest)
  }
})

export const remove = mutation({
  args: { id: v.id('workouts') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const workout = await ctx.db.get(args.id)
    if (!workout || workout.userId !== userId) throw new Error('Not found')
    const entries = await ctx.db
      .query('workoutEntries')
      .withIndex('by_workout', q => q.eq('workoutId', args.id))
      .collect()
    for (const entry of entries) {
      const sets = await ctx.db
        .query('sets')
        .withIndex('by_entry', q => q.eq('entryId', entry._id))
        .collect()
      for (const s of sets) await ctx.db.delete(s._id)
      await ctx.db.delete(entry._id)
    }
    await ctx.db.delete(args.id)
  }
})
