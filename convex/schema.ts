import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// Owner is the Clerk subject (identity.subject). We store it directly on
// user-owned rows instead of maintaining a separate users table.
export default defineSchema({
  // Exercise library. wger rows are global (createdBy undefined); custom rows
  // are owned by the user who created them.
  exercises: defineTable({
    name: v.string(),
    category: v.optional(v.string()), // muscle group / body part
    equipment: v.optional(v.string()),
    muscles: v.optional(v.array(v.string())),
    imageUrl: v.optional(v.string()),
    source: v.union(v.literal('wger'), v.literal('custom')),
    wgerId: v.optional(v.number()),
    createdBy: v.optional(v.string())
  })
    .index('by_wgerId', ['wgerId'])
    .index('by_creator', ['createdBy'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['source', 'category', 'createdBy']
    }),

  // A workout session pinned to a calendar day.
  workouts: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD (local day)
    name: v.string(),
    status: v.union(
      v.literal('planned'),
      v.literal('in_progress'),
      v.literal('completed')
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    notes: v.optional(v.string())
  })
    .index('by_user_date', ['userId', 'date'])
    .index('by_user_status', ['userId', 'status']),

  // An exercise placed inside a workout (ordered).
  workoutEntries: defineTable({
    workoutId: v.id('workouts'),
    userId: v.string(),
    exerciseId: v.id('exercises'),
    exerciseName: v.string(), // denormalized for fast rendering
    order: v.number(),
    targetSets: v.optional(v.number())
  }).index('by_workout', ['workoutId']),

  // A single logged set. exerciseId/userId denormalized so stats queries are cheap.
  sets: defineTable({
    entryId: v.id('workoutEntries'),
    workoutId: v.id('workouts'),
    userId: v.string(),
    exerciseId: v.id('exercises'),
    setNumber: v.number(),
    reps: v.number(),
    weight: v.number(),
    unit: v.union(v.literal('kg'), v.literal('lb')),
    completed: v.boolean(),
    restSeconds: v.optional(v.number()),
    loggedAt: v.number()
  })
    .index('by_entry', ['entryId'])
    .index('by_workout', ['workoutId'])
    .index('by_user_exercise', ['userId', 'exerciseId']),

  // Reusable routines: a named ordered list of exercises with target sets.
  templates: defineTable({
    userId: v.string(),
    name: v.string(),
    notes: v.optional(v.string())
  }).index('by_user', ['userId']),

  templateEntries: defineTable({
    templateId: v.id('templates'),
    exerciseId: v.id('exercises'),
    exerciseName: v.string(),
    order: v.number(),
    targetSets: v.optional(v.number())
  }).index('by_template', ['templateId'])
})
