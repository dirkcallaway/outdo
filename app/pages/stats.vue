<script setup lang="ts">
import { api } from '~~/convex/_generated/api'
import type { Id } from '~~/convex/_generated/dataModel'

const { data: summary } = useConvexQuery(api.stats.summary, {})

const showPicker = ref(false)
const selected = ref<{ id: Id<'exercises'>, name: string } | null>(null)

function onPick(id: Id<'exercises'>, name: string) {
  selected.value = { id, name }
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
          :label="selected ? 'Change' : 'Pick exercise'"
          icon="i-lucide-search"
          size="sm"
          color="neutral"
          variant="soft"
          @click="showPicker = true"
        />
      </div>

      <p
        v-if="!selected"
        class="text-sm text-muted py-8 text-center"
      >
        Pick an exercise to see your progress over time.
      </p>
      <ExerciseProgress
        v-else
        :exercise-id="selected.id"
        :name="selected.name"
      />
    </div>

    <ExercisePicker
      v-model:open="showPicker"
      @select="onPick"
    />
  </div>
</template>
