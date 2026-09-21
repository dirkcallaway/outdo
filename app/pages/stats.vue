<script setup lang="ts">
import { api } from '~~/convex/_generated/api'
import type { Id } from '~~/convex/_generated/dataModel'

const { data: summary } = useConvexQuery(api.stats.summary, {})
const { data: logged } = useConvexQuery(api.stats.loggedExercises, {})

const selected = ref<{ id: Id<'exercises'>, name: string } | null>(null)
function select(id: Id<'exercises'>, name: string) {
  selected.value = { id, name }
}

// Fallback: search the full library (e.g. an exercise not yet logged).
const showPicker = ref(false)
function onPick(id: Id<'exercises'>, name: string) {
  select(id, name)
  showPicker.value = false
}

const cards = computed(() => [
  { label: 'Total', value: summary.value?.totalWorkouts ?? 0, icon: 'i-lucide-dumbbell' },
  { label: 'This week', value: summary.value?.thisWeek ?? 0, icon: 'i-lucide-calendar-check' },
  { label: 'Streak', value: `${summary.value?.streak ?? 0}d`, icon: 'i-lucide-flame' },
  { label: 'Active days', value: summary.value?.activeDays ?? 0, icon: 'i-lucide-activity' }
])
</script>

<template>
  <div class="space-y-5">
    <h1 class="text-lg font-semibold">
      Stats
    </h1>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 gap-2">
      <UCard
        v-for="c in cards"
        :key="c.label"
        :ui="{ body: 'p-3 sm:p-3' }"
      >
        <div class="flex items-center gap-3">
          <UIcon
            :name="c.icon"
            class="text-primary size-5"
          />
          <div>
            <p class="text-xl font-bold leading-none">
              {{ c.value }}
            </p>
            <p class="text-xs text-muted mt-1">
              {{ c.label }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Per-exercise progress -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-medium">
          Exercise progress
        </h2>
        <UButton
          label="Search all"
          icon="i-lucide-search"
          size="xs"
          color="neutral"
          variant="soft"
          @click="showPicker = true"
        />
      </div>

      <!-- Selected: show its progress with a way back to the list -->
      <template v-if="selected">
        <UButton
          label="All exercises"
          icon="i-lucide-chevron-left"
          size="xs"
          color="neutral"
          variant="link"
          class="-ms-2"
          @click="selected = null"
        />
        <ExerciseProgress
          :exercise-id="selected.id"
          :name="selected.name"
        />
      </template>

      <!-- Otherwise: pick from exercises you've actually logged -->
      <template v-else>
        <p
          v-if="logged && logged.length === 0"
          class="text-sm text-muted py-8 text-center"
        >
          Log some sets and your exercises will show up here.
        </p>
        <button
          v-for="ex in logged"
          :key="ex.exerciseId"
          type="button"
          class="w-full flex items-center gap-3 rounded-xl border border-default p-3 text-left hover:bg-elevated transition-colors"
          @click="select(ex.exerciseId as Id<'exercises'>, ex.name)"
        >
          <UIcon
            name="i-lucide-trending-up"
            class="text-primary size-5 shrink-0"
          />
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">
              {{ ex.name }}
            </p>
            <p class="text-xs text-muted">
              {{ ex.setCount }} set{{ ex.setCount === 1 ? '' : 's' }} logged
            </p>
          </div>
          <UIcon
            name="i-lucide-chevron-right"
            class="text-dimmed size-4 shrink-0"
          />
        </button>
      </template>
    </div>

    <ExercisePicker
      v-model:open="showPicker"
      @select="onPick"
    />
  </div>
</template>
