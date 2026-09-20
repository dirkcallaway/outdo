<script setup lang="ts">
import { api } from '~~/convex/_generated/api'

const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth()) // 0-based
const selectedDate = ref(todayISO())

const monthDate = computed(() => new Date(viewYear.value, viewMonth.value, 1))
const monthLabel = computed(() =>
  monthDate.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
)
const monthParam = computed(() => monthKey(monthDate.value))
const grid = computed(() => buildMonthGrid(viewYear.value, viewMonth.value))

const { data: workouts } = useConvexQuery(
  api.workouts.listByMonth,
  () => ({ month: monthParam.value })
)

// date -> workouts on that date
const byDate = computed(() => {
  const map = new Map<string, NonNullable<typeof workouts.value>>()
  for (const w of workouts.value ?? []) {
    const list = map.get(w.date) ?? []
    list.push(w)
    map.set(w.date, list)
  }
  return map
})

const selectedWorkouts = computed(() => byDate.value.get(selectedDate.value) ?? [])

function shiftMonth(delta: number) {
  const d = new Date(viewYear.value, viewMonth.value + delta, 1)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}

function goToday() {
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
  selectedDate.value = todayISO()
}

const statusColor: Record<string, 'neutral' | 'primary' | 'success'> = {
  planned: 'neutral',
  in_progress: 'primary',
  completed: 'success'
}

// --- New workout modal ---
const showNew = ref(false)
const newName = ref('')
const creating = ref(false)
const createWorkout = useConvexMutation(api.workouts.create)

async function submitNew() {
  creating.value = true
  try {
    const id = await createWorkout.mutate({
      date: selectedDate.value,
      name: newName.value || 'Workout'
    })
    showNew.value = false
    newName.value = ''
    await navigateTo(`/workout/${id}`)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Month header -->
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold">
        {{ monthLabel }}
      </h1>
      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          @click="shiftMonth(-1)"
        />
        <UButton
          label="Today"
          size="xs"
          color="neutral"
          variant="soft"
          @click="goToday"
        />
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="ghost"
          @click="shiftMonth(1)"
        />
      </div>
    </div>

    <!-- Calendar grid -->
    <div>
      <div class="grid grid-cols-7 mb-1 text-center text-xs text-muted">
        <div
          v-for="d in WEEKDAYS"
          :key="d"
        >
          {{ d }}
        </div>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <button
          v-for="cell in grid"
          :key="cell.date"
          type="button"
          class="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-sm transition-colors"
          :class="[
            cell.inMonth ? 'text-default' : 'text-dimmed',
            selectedDate === cell.date ? 'bg-primary text-inverted font-semibold' : 'hover:bg-elevated',
            cell.isToday && selectedDate !== cell.date ? 'ring-1 ring-primary' : ''
          ]"
          @click="selectedDate = cell.date"
        >
          <span>{{ cell.day }}</span>
          <span
            v-if="byDate.get(cell.date)?.length"
            class="size-1.5 rounded-full"
            :class="selectedDate === cell.date ? 'bg-inverted' : 'bg-primary'"
          />
        </button>
      </div>
    </div>

    <!-- Selected day -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h2 class="font-medium">
          {{ formatDisplayDate(selectedDate) }}
        </h2>
        <UButton
          icon="i-lucide-plus"
          size="sm"
          label="New"
          @click="showNew = true"
        />
      </div>

      <p
        v-if="selectedWorkouts.length === 0"
        class="text-sm text-muted py-6 text-center"
      >
        No workouts this day. Tap "New" to add one.
      </p>

      <NuxtLink
        v-for="w in selectedWorkouts"
        :key="w._id"
        :to="`/workout/${w._id}`"
        class="block"
      >
        <UCard
          :ui="{ body: 'p-3 sm:p-3' }"
          class="hover:bg-elevated/50 transition-colors"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium truncate">{{ w.name }}</span>
            <UBadge
              :color="statusColor[w.status]"
              variant="soft"
              size="sm"
            >
              {{ w.status.replace('_', ' ') }}
            </UBadge>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <!-- New workout modal -->
    <UModal
      v-model:open="showNew"
      title="New workout"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Name">
            <UInput
              v-model="newName"
              placeholder="e.g. Push Day"
              autofocus
              class="w-full"
              @keyup.enter="submitNew"
            />
          </UFormField>
          <p class="text-sm text-muted">
            {{ formatDisplayDate(selectedDate) }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="showNew = false"
            />
            <UButton
              label="Create"
              :loading="creating"
              @click="submitNew"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
