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

// The user's most recently completed sessions, for quick access in the
// Workouts tab. Each row carries an exercise count for the list view.
export const recentCompleted = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    if (!userId) return []
    const rows = await ctx.db
      .query('workouts')
      .withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'completed'))
      .collect()
    // Most recent first: date (YYYY-MM-DD) desc, tie-break on completedAt.
    rows.sort((a, b) => b.date.localeCompare(a.date) || (b.completedAt ?? 0) - (a.completedAt ?? 0))
    const top = rows.slice(0, args.limit ?? 3)
    return Promise.all(top.map(async (w) => {
      const entries = await ctx.db
        .query('workoutEntries')
        .withIndex('by_workout', q => q.eq('workoutId', w._id))
        .collect()
      // Compact per-exercise summary for sharing (skip exercises with no real sets).
      const summary = []
      for (const entry of entries) {
        const sets = await ctx.db
          .query('sets')
          .withIndex('by_entry', q => q.eq('entryId', entry._id))
          .collect()
        const real = sets.filter(s => s.completed || s.reps > 0)
        if (!real.length) continue
        summary.push({
          name: entry.exerciseName,
          count: real.length,
          top: entry.bodyweight ? 0 : Math.max(0, ...real.map(s => s.weight || 0)),
          unit: real[0]!.unit,
          topReps: entry.bodyweight ? Math.max(0, ...real.map(s => s.reps || 0)) : undefined
        })
      }
      return { _id: w._id, name: w.name, date: w.date, exerciseCount: entries.length, summary }
    }))
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

// For every exercise in this workout, the sets logged in the most recent
// *earlier* session that used that exercise. Powers the "Last · ..." reference
// line in the tracker. Keyed by exerciseId; exercises with no prior session are
// simply absent from the map.
export const previousPerformance = query({
  args: { id: v.id('workouts') },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    if (!userId) return {}
    const workout = await ctx.db.get(args.id)
    if (!workout || workout.userId !== userId) return {}

    const entries = await ctx.db
      .query('workoutEntries')
      .withIndex('by_workout', q => q.eq('workoutId', args.id))
      .collect()
    const exerciseIds = [...new Set(entries.map(e => e.exerciseId))]

    const result: Record<
      string,
      { date: string, unit: 'kg' | 'lb', sets: { setNumber: number, weight: number, reps: number }[] }
    > = {}

    await Promise.all(
      exerciseIds.map(async (exerciseId) => {
        const sets = await ctx.db
          .query('sets')
          .withIndex('by_user_exercise', q =>
            q.eq('userId', userId).eq('exerciseId', exerciseId)
          )
          .collect()

        // Group the exercise's sets by the session they belong to, skipping the
        // current workout and any group without real (logged) sets.
        const byWorkout = new Map<string, typeof sets>()
        for (const s of sets) {
          if (s.workoutId === args.id) continue
          const list = byWorkout.get(s.workoutId) ?? []
          list.push(s)
          byWorkout.set(s.workoutId, list)
        }

        let best: { date: string, completedAt: number, sets: typeof sets } | null = null
        for (const [workoutId, group] of byWorkout) {
          const real = group.filter(s => s.completed || s.reps > 0)
          if (!real.length) continue
          const w = await ctx.db.get(workoutId as typeof args.id)
          if (!w || !w.date) continue
          const cand = { date: w.date, completedAt: w.completedAt ?? 0, sets: real }
          if (
            !best
            || cand.date > best.date
            || (cand.date === best.date && cand.completedAt > best.completedAt)
          ) {
            best = cand
          }
        }

        if (best) {
          const ordered = [...best.sets].sort((a, b) => a.setNumber - b.setNumber)
          result[exerciseId] = {
            date: best.date,
            unit: ordered[0]!.unit,
            sets: ordered.map(s => ({ setNumber: s.setNumber, weight: s.weight, reps: s.reps }))
          }
        }
      })
    )

    return result
  }
})

// Create a dated session. If templateId is given, copy that plan's exercises
// and targets in. status defaults to 'planned' ("Start now" passes
// 'in_progress').
export const create = mutation({
  args: {
    date: v.string(),
    name: v.optional(v.string()),
    templateId: v.optional(v.id('templates')),
    status: v.optional(statusValidator)
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    let name = args.name?.trim()
    let template = null
    if (args.templateId) {
      template = await ctx.db.get(args.templateId)
      if (!template || template.userId !== userId) throw new Error('Workout not found')
      if (!name) name = template.name
    }

    const status = args.status ?? 'planned'
    const workoutId = await ctx.db.insert('workouts', {
      userId,
      date: args.date,
      name: name || 'Workout',
      templateId: args.templateId,
      status,
      startedAt: status === 'in_progress' ? Date.now() : undefined
    })

    if (template) {
      const planExercises = await ctx.db
        .query('templateEntries')
        .withIndex('by_template', q => q.eq('templateId', template!._id))
        .collect()
      planExercises.sort((a, b) => a.order - b.order)
      for (const pe of planExercises) {
        await ctx.db.insert('workoutEntries', {
          workoutId,
          userId,
          exerciseId: pe.exerciseId,
          exerciseName: pe.exerciseName,
          order: pe.order,
          targetSets: pe.targetSets,
          targetReps: pe.targetReps,
          bodyweight: pe.bodyweight
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
      order: existing.length,
      bodyweight: ex.bodyweight
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
