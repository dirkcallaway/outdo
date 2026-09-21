<script setup lang="ts">
import { api } from '~~/convex/_generated/api'
import type { Id } from '~~/convex/_generated/dataModel'

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

// --- Add / start a session via the workout picker ---
const createWorkout = useConvexMutation(api.workouts.create)
const showPicker = ref(false)
const pickerMode = ref<'add' | 'start'>('add')

const pickerTitle = computed(() =>
  pickerMode.value === 'start' ? 'Start now' : `Add to ${formatDisplayDate(selectedDate.value)}`
)

function openAdd() {
  pickerMode.value = 'add'
  showPicker.value = true
}
function openStartNow() {
  pickerMode.value = 'start'
  showPicker.value = true
}

async function onPickWorkout(templateId: Id<'templates'> | null) {
  const starting = pickerMode.value === 'start'
  const id = await createWorkout.mutate({
    date: starting ? todayISO() : selectedDate.value,
    templateId: templateId ?? undefined,
    status: starting ? 'in_progress' : 'planned'
  })
  showPicker.value = false
  await navigateTo(`/workout/${id}`)
}

// --- Modify / delete a session from the calendar ---
const updateWorkout = useConvexMutation(api.workouts.update)
const removeWorkout = useConvexMutation(api.workouts.remove)

const activeId = ref<Id<'workouts'> | null>(null)

const showRename = ref(false)
const renameValue = ref('')
function openRename(w: { _id: Id<'workouts'>, name: string }) {
  activeId.value = w._id
  renameValue.value = w.name
  showRename.value = true
}
async function saveRename() {
  if (activeId.value) await updateWorkout.mutate({ id: activeId.value, name: renameValue.value })
  showRename.value = false
}

const showMove = ref(false)
const moveValue = ref('')
function openMove(w: { _id: Id<'workouts'>, date: string }) {
  activeId.value = w._id
  moveValue.value = w.date
  showMove.value = true
}
async function saveMove() {
  if (activeId.value && moveValue.value) {
    await updateWorkout.mutate({ id: activeId.value, date: moveValue.value })
    selectedDate.value = moveValue.value
  }
  showMove.value = false
}

const showDelete = ref(false)
const deleteName = ref('')
function openDelete(w: { _id: Id<'workouts'>, name: string }) {
  activeId.value = w._id
  deleteName.value = w.name
  showDelete.value = true
}
async function confirmDelete() {
  if (activeId.value) await removeWorkout.mutate({ id: activeId.value })
  showDelete.value = false
}

function menuItems(w: { _id: Id<'workouts'>, name: string, date: string }) {
  return [[
    { label: 'Open', icon: 'i-lucide-square-arrow-out-up-right', onSelect: () => navigateTo(`/workout/${w._id}`) },
    { label: 'Rename', icon: 'i-lucide-pencil', onSelect: () => openRename(w) },
    { label: 'Move to date', icon: 'i-lucide-calendar', onSelect: () => openMove(w) },
    { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => openDelete(w) }
  ]]
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

    <!-- Start now -->
    <UButton
      label="Start a workout now"
      icon="i-lucide-play"
      block
      @click="openStartNow"
    />

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
          label="Add"
          @click="openAdd"
        />
      </div>

      <p
        v-if="selectedWorkouts.length === 0"
        class="text-sm text-muted py-6 text-center"
      >
        No workouts this day. Tap "Add" to schedule one.
      </p>

      <UCard
        v-for="w in selectedWorkouts"
        :key="w._id"
        :ui="{ body: 'p-2 sm:p-2' }"
      >
        <div class="flex items-center gap-1">
          <NuxtLink
            :to="`/workout/${w._id}`"
            class="flex items-center gap-2 flex-1 min-w-0 p-1 rounded-md hover:bg-elevated/50 transition-colors"
          >
            <span class="font-medium truncate">{{ w.name }}</span>
            <UBadge
              :color="statusColor[w.status]"
              variant="soft"
              size="sm"
            >
              {{ w.status.replace('_', ' ') }}
            </UBadge>
          </NuxtLink>
          <UDropdownMenu :items="menuItems(w)">
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              size="sm"
            />
          </UDropdownMenu>
        </div>
      </UCard>
    </div>

    <!-- Workout picker (add to day / start now) -->
    <WorkoutPicker
      v-model:open="showPicker"
      :title="pickerTitle"
      @select="onPickWorkout"
    />

    <!-- Rename session -->
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

    <!-- Move session to another date -->
    <UModal
      v-model:open="showMove"
      title="Move to date"
    >
      <template #body>
        <div class="space-y-4">
          <UInput
            v-model="moveValue"
            type="date"
            class="w-full"
          />
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="showMove = false"
            />
            <UButton
              label="Move"
              :disabled="!moveValue"
              @click="saveMove"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete session -->
    <UModal
      v-model:open="showDelete"
      title="Delete workout?"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Delete "{{ deleteName }}" and all its logged sets? This can't be undone.
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="showDelete = false"
            />
            <UButton
              label="Delete"
              color="error"
              @click="confirmDelete"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
