import { query } from './_generated/server'
import { v } from 'convex/values'
import { getUserId } from './helpers'
import type { Doc } from './_generated/dataModel'

// Epley estimated one-rep max.
function estimate1RM(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30))
}

// Distinct exercises the user has actually logged sets for, most-recent first.
// Powers the stats picker so it lists only exercises you've done.
export const loggedExercises = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return []
    const sets = await ctx.db
      .query('sets')
      .withIndex('by_user_exercise', q => q.eq('userId', userId))
      .collect()

    const byExercise = new Map<string, { setCount: number, lastLoggedAt: number }>()
    for (const s of sets) {
      const cur = byExercise.get(s.exerciseId) ?? { setCount: 0, lastLoggedAt: 0 }
      cur.setCount++
      cur.lastLoggedAt = Math.max(cur.lastLoggedAt, s.loggedAt)
      byExercise.set(s.exerciseId, cur)
    }

    const rows = await Promise.all(
      [...byExercise.entries()].map(async ([exerciseId, stat]) => {
        const ex = await ctx.db.get(exerciseId as Doc<'sets'>['exerciseId'])
        return {
          exerciseId,
          name: ex?.name ?? 'Exercise',
          setCount: stat.setCount,
          lastLoggedAt: stat.lastLoggedAt
        }
      })
    )
    return rows.sort((a, b) => b.lastLoggedAt - a.lastLoggedAt)
  }
})

// Per-session history for one exercise: one point per workout, sorted by date.
export const exerciseHistory = query({
  args: { exerciseId: v.id('exercises') },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    if (!userId) return []
    const exercise = await ctx.db.get(args.exerciseId)
    const bodyweight = exercise?.bodyweight ?? false
    const sets = await ctx.db
      .query('sets')
      .withIndex('by_user_exercise', q =>
        q.eq('userId', userId).eq('exerciseId', args.exerciseId)
      )
      .collect()

    const byWorkout = new Map<string, Doc<'sets'>[]>()
    for (const s of sets) {
      const key = s.workoutId
      const list = byWorkout.get(key) ?? []
      list.push(s)
      byWorkout.set(key, list)
    }

    const points = await Promise.all(
      [...byWorkout.entries()].map(async ([workoutId, group]) => {
        const workout = await ctx.db.get(workoutId as Doc<'sets'>['workoutId'])
        const topWeight = Math.max(...group.map(s => s.weight))
        const best1RM = Math.max(...group.map(s => estimate1RM(s.weight, s.reps)))
        const totalVolume = group.reduce((sum, s) => sum + s.weight * s.reps, 0)
        return {
          workoutId,
          date: workout?.date ?? '',
          unit: group[0]?.unit ?? 'kg',
          bodyweight,
          sets: group.length,
          topWeight,
          best1RM,
          totalVolume,
          topReps: Math.max(...group.map(s => s.reps)),
          totalReps: group.reduce((sum, s) => sum + s.reps, 0)
        }
      })
    )
    return points
      .filter(p => p.date)
      .sort((a, b) => a.date.localeCompare(b.date))
  }
})

// Best-ever numbers for one exercise.
export const personalRecords = query({
  args: { exerciseId: v.id('exercises') },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const exercise = await ctx.db.get(args.exerciseId)
    const sets = await ctx.db
      .query('sets')
      .withIndex('by_user_exercise', q =>
        q.eq('userId', userId).eq('exerciseId', args.exerciseId)
      )
      .collect()
    if (sets.length === 0) return null

    return {
      bodyweight: exercise?.bodyweight ?? false,
      maxWeight: Math.max(...sets.map(s => s.weight)),
      maxReps: Math.max(...sets.map(s => s.reps)),
      best1RM: Math.max(...sets.map(s => estimate1RM(s.weight, s.reps))),
      totalReps: sets.reduce((sum, s) => sum + s.reps, 0),
      unit: sets[0]!.unit,
      totalSets: sets.length
    }
  }
})

// Dashboard summary: totals, this-week count, and current day-streak.
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return { totalWorkouts: 0, thisWeek: 0, streak: 0, activeDays: 0 }
    const workouts = await ctx.db
      .query('workouts')
      .withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'completed'))
      .collect()

    const dates = new Set(workouts.map(w => w.date))
    const now = new Date()

    // This week (last 7 days).
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().slice(0, 10)
    const thisWeek = workouts.filter(w => w.date >= weekAgoStr).length

    // Current streak: consecutive days ending today or yesterday with a workout.
    let streak = 0
    const cursor = new Date(now)
    // Allow streak to still count if today has no workout yet but yesterday did.
    if (!dates.has(cursor.toISOString().slice(0, 10))) {
      cursor.setDate(cursor.getDate() - 1)
    }
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }

    return {
      totalWorkouts: workouts.length,
      thisWeek,
      streak,
      activeDays: dates.size
    }
  }
})
