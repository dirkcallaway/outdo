import { query, mutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { requireUserId } from './helpers'

const unitValidator = v.union(v.literal('kg'), v.literal('lb'))

const setInput = {
  entryId: v.id('workoutEntries'),
  setNumber: v.number(),
  reps: v.number(),
  weight: v.number(),
  unit: unitValidator,
  completed: v.optional(v.boolean()),
  restSeconds: v.optional(v.number()),
  loggedAt: v.optional(v.number())
}

// Idempotent upsert keyed by (entryId, setNumber) so the offline outbox can
// replay safely without creating duplicates.
async function upsertSet(
  ctx: MutationCtx,
  userId: string,
  args: {
    entryId: Id<'workoutEntries'>
    setNumber: number
    reps: number
    weight: number
    unit: 'kg' | 'lb'
    completed?: boolean
    restSeconds?: number
    loggedAt?: number
  }
) {
  const entry = await ctx.db.get(args.entryId)
  if (!entry || entry.userId !== userId) throw new Error('Entry not found')

  const existing = await ctx.db
    .query('sets')
    .withIndex('by_entry', q => q.eq('entryId', args.entryId))
    .collect()
  const match = existing.find(s => s.setNumber === args.setNumber)

  const doc = {
    entryId: entry._id,
    workoutId: entry.workoutId,
    userId,
    exerciseId: entry.exerciseId,
    setNumber: args.setNumber,
    reps: args.reps,
    weight: args.weight,
    unit: args.unit,
    completed: args.completed ?? true,
    restSeconds: args.restSeconds,
    loggedAt: args.loggedAt ?? Date.now()
  }

  if (match) {
    await ctx.db.patch(match._id, doc)
    return match._id
  }
  return ctx.db.insert('sets', doc)
}

export const log = mutation({
  args: setInput,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    return upsertSet(ctx, userId, args)
  }
})

// Replay a batch of locally-buffered sets (offline outbox flush).
export const bulkSync = mutation({
  args: { sets: v.array(v.object(setInput)) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const ids = []
    for (const s of args.sets) {
      ids.push(await upsertSet(ctx, userId, s))
    }
    return ids
  }
})

export const remove = mutation({
  args: { id: v.id('sets') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const s = await ctx.db.get(args.id)
    if (!s || s.userId !== userId) throw new Error('Not found')
    await ctx.db.delete(args.id)
  }
})

export const listByWorkout = query({
  args: { workoutId: v.id('workouts') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const rows = await ctx.db
      .query('sets')
      .withIndex('by_workout', q => q.eq('workoutId', args.workoutId))
      .collect()
    return rows.filter(s => s.userId === userId)
  }
})
