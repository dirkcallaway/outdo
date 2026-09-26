<script setup lang="ts">
import { api } from '~~/convex/_generated/api'
import type { Id } from '~~/convex/_generated/dataModel'

const route = useRoute()
const planId = computed(() => route.params.id as Id<'templates'>)

const { data: plan } = useConvexQuery(
  api.templates.getWithExercises,
  () => ({ id: planId.value })
)

const addExercise = useConvexMutation(api.templates.addExercise)
const updateTargets = useConvexMutation(api.templates.updateTargets)
const removeExercise = useConvexMutation(api.templates.removeExercise)
const renamePlan = useConvexMutation(api.templates.rename)
const removePlan = useConvexMutation(api.templates.remove)
const reorder = useConvexMutation(api.templates.reorder)
const createSession = useConvexMutation(api.workouts.create)

// --- Add exercise ---
const showPicker = ref(false)
async function onPick(id: Id<'exercises'>) {
  await addExercise.mutate({ templateId: planId.value, exerciseId: id })
  showPicker.value = false
}

// Move an exercise up (-1) or down (+1) and persist the new order.
function move(index: number, dir: -1 | 1) {
  const list = plan.value?.exercises ?? []
  const target = index + dir
  if (target < 0 || target >= list.length) return
  const ids = list.map(e => e._id)
  const tmp = ids[index]!
  ids[index] = ids[target]!
  ids[target] = tmp
  reorder.mutate({ orderedEntryIds: ids })
}

function setTargets(entryId: Id<'templateEntries'>, sets: number, reps: number) {
  updateTargets.mutate({ entryId, targetSets: sets, targetReps: reps })
}

// --- Rename / delete ---
const showRename = ref(false)
const renameValue = ref('')
function openRename() {
  renameValue.value = plan.value?.name ?? ''
  showRename.value = true
}
async function saveRename() {
  await renamePlan.mutate({ id: planId.value, name: renameValue.value })
  showRename.value = false
}
async function deletePlan() {
  await removePlan.mutate({ id: planId.value })
  await navigateTo('/workouts')
}

const menuItems = computed(() => [[
  { label: 'Rename', icon: 'i-lucide-pencil', onSelect: openRename },
  { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: deletePlan }
]])

// --- Start now (create today's session from this plan) ---
const starting = ref(false)
async function startNow() {
  starting.value = true
  try {
    const id = await createSession.mutate({
      date: todayISO(),
      templateId: planId.value,
      status: 'in_progress'
    })
    await navigateTo(`/workout/${id}`)
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <div
    v-if="plan"
    class="space-y-4"
  >
    <!-- Header -->
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <UButton
          to="/workouts"
          icon="i-lucide-chevron-left"
          label="Workouts"
          color="neutral"
          variant="link"
          size="xs"
          class="-ms-2 mb-1"
        />
        <h1 class="text-xl font-bold truncate">
          {{ plan.name }}
        </h1>
      </div>
      <UDropdownMenu :items="menuItems">
        <UButton
          icon="i-lucide-ellipsis-vertical"
          color="neutral"
          variant="ghost"
        />
      </UDropdownMenu>
    </div>

    <!-- Start now -->
    <div>
      <UButton
        label="Start now"
        icon="i-lucide-play"
        block
        size="lg"
        :loading="starting"
        :disabled="plan.exercises.length === 0"
        @click="startNow"
      />
      <p class="text-xs text-muted text-center mt-2">
        Or add this workout to a day from the calendar.
      </p>
    </div>

    <!-- Exercises with targets -->
    <div class="space-y-2">
      <div
        v-for="(entry, i) in plan.exercises"
        :key="entry._id"
        class="flex items-center gap-2 rounded-xl border border-default p-3"
      >
        <div class="flex flex-col">
          <UButton
            icon="i-lucide-chevron-up"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="i === 0"
            @click="move(i, -1)"
          />
          <UButton
            icon="i-lucide-chevron-down"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="i === plan.exercises.length - 1"
            @click="move(i, 1)"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-medium truncate flex items-center gap-1.5">
            <span class="truncate">{{ entry.exerciseName }}</span>
            <UBadge
              v-if="entry.bodyweight"
              color="neutral"
              variant="soft"
              size="sm"
              class="shrink-0"
            >
              Body weight
            </UBadge>
          </p>
          <div class="flex items-center gap-2 mt-2">
            <UInputNumber
              :model-value="entry.targetSets ?? 3"
              :min="1"
              size="sm"
              class="w-24"
              @update:model-value="v => setTargets(entry._id, Number(v), entry.targetReps ?? 10)"
            />
            <span class="text-xs text-muted">sets</span>
            <span class="text-muted">×</span>
            <UInputNumber
              :model-value="entry.targetReps ?? 10"
              :min="0"
              size="sm"
              class="w-24"
              @update:model-value="v => setTargets(entry._id, entry.targetSets ?? 3, Number(v))"
            />
            <span class="text-xs text-muted">reps</span>
          </div>
        </div>
        <UButton
          icon="i-lucide-x"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="removeExercise.mutate({ entryId: entry._id })"
        />
      </div>

      <p
        v-if="plan.exercises.length === 0"
        class="text-sm text-muted py-6 text-center"
      >
        No exercises yet. Add some below.
      </p>

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
      @select="onPick"
    />

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
