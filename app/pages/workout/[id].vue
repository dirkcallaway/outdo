<script setup lang="ts">
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { api } from '~~/convex/_generated/api'
import type { Id } from '~~/convex/_generated/dataModel'

interface LocalSet {
  setNumber: number
  weight: number
  reps: number
  unit: 'kg' | 'lb'
  completed: boolean
}

const route = useRoute()
const workoutId = computed(() => route.params.id as Id<'workouts'>)

const { data: workout } = useConvexQuery(
  api.workouts.getWithEntries,
  () => ({ id: workoutId.value })
)

const { logSet, pendingCount, online } = useOutbox()

const addExercise = useConvexMutation(api.workouts.addExercise)
const removeEntryM = useConvexMutation(api.workouts.removeEntry)
const reorderEntries = useConvexMutation(api.workouts.reorderEntries)
const setStatus = useConvexMutation(api.workouts.setStatus)
const updateWorkout = useConvexMutation(api.workouts.update)
const removeWorkout = useConvexMutation(api.workouts.remove)

// Move an exercise up (-1) or down (+1) within the session.
function moveEntry(index: number, dir: -1 | 1) {
  const list = workout.value?.entries ?? []
  const target = index + dir
  if (target < 0 || target >= list.length) return
  const ids = list.map(e => e._id)
  const tmp = ids[index]!
  ids[index] = ids[target]!
  ids[target] = tmp
  reorderEntries.mutate({ orderedEntryIds: ids })
}

// Local-first set state, persisted per-workout so it survives reloads / offline.
const idbKey = `workout-sets-${workoutId.value}`
const { data: store } = useIDBKeyval<Record<string, LocalSet[]>>(idbKey, {})

const unit = ref<'kg' | 'lb'>('kg')
const unitInit = ref(false)

// Seed local sets from the server the first time we see each entry.
watch(
  () => workout.value,
  (w) => {
    if (!w || !store.value) return
    // Adopt the workout's existing unit (from any logged set) once.
    if (!unitInit.value) {
      const anySet = w.entries.flatMap(e => e.sets)[0]
      if (anySet) {
        unit.value = anySet.unit
        unitInit.value = true
      }
    }
    const next = { ...store.value }
    let changed = false
    for (const entry of w.entries) {
      if (!next[entry._id]) {
        if (entry.sets.length) {
          next[entry._id] = entry.sets.map(s => ({
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            unit: s.unit,
            completed: s.completed
          }))
        } else {
          // Prefill from the plan's targets: N rows at the target reps, weight blank.
          const count = Math.max(1, entry.targetSets ?? 1)
          const reps = entry.targetReps ?? 0
          next[entry._id] = Array.from({ length: count }, (_, i) => ({
            setNumber: i + 1,
            weight: 0,
            reps,
            unit: unit.value,
            completed: false
          }))
        }
        changed = true
      }
    }
    if (changed) commit(next)
  },
  { immediate: true }
)

function setsFor(entryId: string): LocalSet[] {
  return store.value?.[entryId] ?? []
}

// IndexedDB (via useIDBKeyval) can't structured-clone Vue reactive proxies, so
// every write goes through a plain deep-clone.
function commit(next: Record<string, LocalSet[]>) {
  store.value = JSON.parse(JSON.stringify(next))
}

function persist() {
  if (store.value) commit(store.value)
}

function syncSet(entryId: string, s: LocalSet) {
  logSet({
    entryId,
    setNumber: s.setNumber,
    reps: Number(s.reps) || 0,
    weight: Number(s.weight) || 0,
    unit: s.unit,
    completed: s.completed,
    loggedAt: Date.now()
  })
}

function toggleDone(entryId: string, s: LocalSet) {
  s.completed = !s.completed
  persist()
  syncSet(entryId, s)
}

function onEdit(entryId: string, s: LocalSet) {
  persist()
  if (s.completed) syncSet(entryId, s)
}

function addSet(entryId: string) {
  const list = store.value?.[entryId] ?? []
  const last = list[list.length - 1]
  list.push({
    setNumber: list.length + 1,
    weight: last?.weight ?? 0,
    reps: last?.reps ?? 0,
    unit: unit.value,
    completed: false
  })
  if (store.value) commit({ ...store.value, [entryId]: list })
}

function removeSet(entryId: string, index: number) {
  const list = [...(store.value?.[entryId] ?? [])]
  list.splice(index, 1)
  list.forEach((s, i) => (s.setNumber = i + 1))
  if (store.value) commit({ ...store.value, [entryId]: list })
}

// Set the unit for the whole workout: relabel every set (keeps the numbers)
// and re-sync already-logged sets so completed workouts update too.
function changeUnit(u: 'kg' | 'lb') {
  unit.value = u
  unitInit.value = true
  if (!store.value) return
  const next: Record<string, LocalSet[]> = {}
  for (const [entryId, sets] of Object.entries(store.value)) {
    next[entryId] = sets.map(s => ({ ...s, unit: u }))
    for (const s of next[entryId]) {
      if (s.completed) syncSet(entryId, s)
    }
  }
  commit(next)
}

// --- Collapse finished exercises to cut down scrolling ---
const manualExpand = ref<Record<string, boolean>>({})

function entryDone(entryId: string): boolean {
  const sets = setsFor(entryId)
  return sets.length > 0 && sets.every(s => s.completed)
}
function isCollapsed(entryId: string): boolean {
  return entryDone(entryId) && !manualExpand.value[entryId]
}
function expand(entryId: string) {
  manualExpand.value = { ...manualExpand.value, [entryId]: true }
}
function collapse(entryId: string) {
  manualExpand.value = { ...manualExpand.value, [entryId]: false }
}
function doneSummary(entryId: string): string {
  const sets = setsFor(entryId)
  const top = Math.max(0, ...sets.map(s => Number(s.weight) || 0))
  const u = sets[0]?.unit ?? 'kg'
  return top > 0 ? `${sets.length} sets · ${top}${u}` : `${sets.length} sets`
}

// --- Exercise picker ---
const showPicker = ref(false)
async function onPickExercise(id: Id<'exercises'>) {
  await addExercise.mutate({ workoutId: workoutId.value, exerciseId: id })
  showPicker.value = false
}

async function removeExercise(entryId: Id<'workoutEntries'>) {
  await removeEntryM.mutate({ entryId })
  if (store.value) {
    const { [entryId]: _removed, ...rest } = store.value
    commit(rest)
  }
}

// --- Status ---
const started = computed(() => workout.value?.status === 'in_progress')
const completed = computed(() => workout.value?.status === 'completed')

async function start() {
  await setStatus.mutate({ id: workoutId.value, status: 'in_progress' })
}
async function finish() {
  await setStatus.mutate({ id: workoutId.value, status: 'completed' })
  await navigateTo('/')
}

// --- Rename / delete ---
const showRename = ref(false)
const renameValue = ref('')
function openRename() {
  renameValue.value = workout.value?.name ?? ''
  showRename.value = true
}
async function saveRename() {
  await updateWorkout.mutate({ id: workoutId.value, name: renameValue.value })
  showRename.value = false
}
async function deleteWorkout() {
  await removeWorkout.mutate({ id: workoutId.value })
  await navigateTo('/')
}

const menuItems = computed(() => [[
  { label: 'Rename', icon: 'i-lucide-pencil', onSelect: openRename },
  { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: deleteWorkout }
]])

// Per-exercise actions, tucked into a single "..." menu to keep each row clean.
function entryMenu(entry: { _id: Id<'workoutEntries'> }, index: number) {
  const move = [
    { label: 'Move up', icon: 'i-lucide-arrow-up', disabled: index === 0, onSelect: () => moveEntry(index, -1) },
    {
      label: 'Move down',
      icon: 'i-lucide-arrow-down',
      disabled: index === (workout.value?.entries.length ?? 0) - 1,
      onSelect: () => moveEntry(index, 1)
    }
  ]
  if (entryDone(entry._id)) {
    move.unshift({ label: 'Collapse', icon: 'i-lucide-chevrons-down-up', disabled: false, onSelect: () => collapse(entry._id) })
  }
  return [
    move,
    [{ label: 'Remove exercise', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => removeExercise(entry._id) }]
  ]
}
</script>

<template>
  <div
    v-if="workout"
    class="space-y-4"
  >
    <!-- Header -->
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <UButton
          to="/"
          icon="i-lucide-chevron-left"
          label="Calendar"
          color="neutral"
          variant="link"
          size="xs"
          class="-ms-2 mb-1"
        />
        <h1 class="text-xl font-bold truncate">
          {{ workout.name }}
        </h1>
        <p class="text-sm text-muted">
          {{ formatDisplayDate(workout.date) }}
        </p>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <UFieldGroup size="xs">
          <UButton
            label="kg"
            :color="unit === 'kg' ? 'primary' : 'neutral'"
            :variant="unit === 'kg' ? 'solid' : 'soft'"
            @click="changeUnit('kg')"
          />
          <UButton
            label="lb"
            :color="unit === 'lb' ? 'primary' : 'neutral'"
            :variant="unit === 'lb' ? 'solid' : 'soft'"
            @click="changeUnit('lb')"
          />
        </UFieldGroup>
        <UDropdownMenu :items="menuItems">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Sticky control bar: start / rest timer + finish -->
    <div
      class="sticky top-14 z-10 -mx-4 px-4 py-2 bg-default/95 backdrop-blur border-b border-default"
    >
      <UButton
        v-if="!started && !completed"
        label="Start workout"
        icon="i-lucide-play"
        block
        size="lg"
        @click="start"
      />
      <div
        v-else-if="started"
        class="flex items-center gap-2"
      >
        <RestTimer class="flex-1 min-w-0" />
        <UButton
          label="Finish"
          icon="i-lucide-flag"
          color="success"
          size="sm"
          class="shrink-0"
          @click="finish"
        />
      </div>
      <UBadge
        v-else
        color="success"
        variant="soft"
        class="w-full justify-center py-1.5"
      >
        Completed
      </UBadge>

      <!-- offline / sync indicators -->
      <div
        v-if="!online || pendingCount > 0"
        class="flex items-center gap-2 mt-2"
      >
        <UBadge
          v-if="!online"
          color="warning"
          variant="soft"
          size="sm"
          icon="i-lucide-wifi-off"
        >
          Offline
        </UBadge>
        <UBadge
          v-if="pendingCount > 0"
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-lucide-cloud-upload"
        >
          {{ pendingCount }} to sync
        </UBadge>
      </div>
    </div>

    <!-- Exercises -->
    <div class="space-y-3">
      <UCard
        v-for="(entry, ei) in workout.entries"
        :key="entry._id"
        :ui="{ body: 'p-3 sm:p-4' }"
      >
        <!-- Collapsed summary (finished exercise) -->
        <button
          v-if="isCollapsed(entry._id)"
          type="button"
          class="w-full flex items-center gap-2 text-left"
          @click="expand(entry._id)"
        >
          <UIcon
            name="i-lucide-check-circle-2"
            class="text-success size-5 shrink-0"
          />
          <span class="font-semibold truncate flex-1">{{ entry.exerciseName }}</span>
          <span class="text-xs text-muted whitespace-nowrap">{{ doneSummary(entry._id) }}</span>
          <UIcon
            name="i-lucide-chevron-down"
            class="text-muted size-4 shrink-0"
          />
        </button>

        <!-- Expanded -->
        <template v-else>
          <div class="flex items-center justify-between mb-2 gap-1">
            <h3 class="font-semibold truncate flex-1">
              {{ entry.exerciseName }}
            </h3>
            <UDropdownMenu :items="entryMenu(entry, ei)">
              <UButton
                icon="i-lucide-ellipsis-vertical"
                size="xs"
                color="neutral"
                variant="ghost"
              />
            </UDropdownMenu>
          </div>

          <!-- Set rows -->
          <div class="space-y-1.5">
            <div class="grid grid-cols-[1.5rem_1fr_1fr_2.5rem_2rem] gap-2 items-center text-xs text-muted px-1">
              <span>#</span>
              <span>Weight</span>
              <span>Reps</span>
              <span />
              <span />
            </div>
            <div
              v-for="(s, i) in setsFor(entry._id)"
              :key="i"
              class="grid grid-cols-[1.5rem_1fr_1fr_2.5rem_2rem] gap-2 items-center"
              :class="s.completed ? 'opacity-70' : ''"
            >
              <span class="text-sm text-muted text-center">{{ s.setNumber }}</span>
              <UInput
                v-model.number="s.weight"
                type="number"
                inputmode="decimal"
                size="lg"
                :ui="{ base: 'text-center' }"
                @change="onEdit(entry._id, s)"
              />
              <UInput
                v-model.number="s.reps"
                type="number"
                inputmode="numeric"
                size="lg"
                :ui="{ base: 'text-center' }"
                @change="onEdit(entry._id, s)"
              />
              <UButton
                :icon="s.completed ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
                :color="s.completed ? 'success' : 'neutral'"
                variant="ghost"
                size="lg"
                @click="toggleDone(entry._id, s)"
              />
              <UButton
                icon="i-lucide-minus"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="removeSet(entry._id, i)"
              />
            </div>
          </div>

          <UButton
            label="Add set"
            icon="i-lucide-plus"
            color="neutral"
            variant="soft"
            size="sm"
            block
            class="mt-2"
            @click="addSet(entry._id)"
          />
        </template>
      </UCard>

      <UButton
        label="Add exercise"
        icon="i-lucide-plus"
        variant="soft"
        block
        @click="showPicker = true"
      />
    </div>

    <ExercisePicker
      v-model:open="showPicker"
      @select="onPickExercise"
    />

    <!-- Rename modal -->
    <UModal
      v-model:open="showRename"
      title="Rename workout"
    >
      <template #body>
        <div class="space-y-4">
          <UInput
            v-model="renameValue"
            autofocus
            class="w-full"
            @keyup.enter="saveRename"
          />
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="showRename = false"
            />
            <UButton
              label="Save"
              @click="saveRename"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>

  <div
    v-else
    class="py-20 text-center text-muted"
  >
    <UIcon
      name="i-lucide-loader-circle"
      class="animate-spin size-6"
    />
  </div>
</template>
