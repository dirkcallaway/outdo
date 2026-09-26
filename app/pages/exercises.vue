<script setup lang="ts">
import { api } from '~~/convex/_generated/api'

const search = ref('')
const debounced = refDebounced(search, 250)
const activeCategory = ref<string | undefined>(undefined)

const { data: categories } = useConvexQuery(api.exercises.categories, {})
const { data: exercises, isPending } = useConvexQuery(
  api.exercises.list,
  () => ({ search: debounced.value || undefined, category: activeCategory.value })
)

type Exercise = NonNullable<typeof exercises.value>[number]

// --- Detail sheet: tap an exercise to see its stats and add it ---
const selected = ref<Exercise | null>(null)
const showDetail = computed({
  get: () => selected.value !== null,
  set: (v: boolean) => {
    if (!v) selected.value = null
  }
})

// --- Add an exercise to today's workout ---
const toast = useToast()
const today = todayISO()
const { data: todaysWorkouts } = useConvexQuery(
  api.workouts.listByDate,
  () => ({ date: today })
)
const createWorkout = useConvexMutation(api.workouts.create)
const addExercise = useConvexMutation(api.workouts.addExercise)
const adding = ref(false)

// Saved reusable workouts (the "Workouts" tab) to add exercises into.
const { data: plans } = useConvexQuery(api.templates.list, {})
const addToTemplate = useConvexMutation(api.templates.addExercise)

function addedToast(exName: string, dest: string, to: string) {
  toast.add({
    title: `Added ${exName}`,
    description: `to ${dest}`,
    color: 'success',
    icon: 'i-lucide-check',
    actions: [{
      label: 'Open',
      color: 'neutral',
      variant: 'outline',
      onClick: () => navigateTo(to)
    }]
  })
}

async function addToToday(ex: Exercise) {
  if (adding.value) return
  adding.value = true
  try {
    const list = todaysWorkouts.value ?? []
    const target = list.find(w => w.status === 'in_progress')
      ?? list.find(w => w.status !== 'completed')
    const workoutId = target?._id
      ?? await createWorkout.mutate({ date: today, status: 'planned' })
    await addExercise.mutate({ workoutId, exerciseId: ex._id })
    addedToast(ex.name, target ? target.name : 'today\'s workout', `/workout/${workoutId}`)
  } finally {
    adding.value = false
  }
}

async function addToPlan(ex: Exercise, plan: NonNullable<typeof plans.value>[number]) {
  if (adding.value) return
  adding.value = true
  try {
    await addToTemplate.mutate({ templateId: plan._id, exerciseId: ex._id })
    addedToast(ex.name, plan.name, `/workouts/${plan._id}`)
  } finally {
    adding.value = false
  }
}

// --- Add custom exercise ---
const showAdd = ref(false)
const form = reactive({ name: '', category: '', equipment: '', bodyweight: false })
const saving = ref(false)
const createCustom = useConvexMutation(api.exercises.createCustom)
const setBodyweight = useConvexMutation(api.exercises.setBodyweight)

async function saveCustom() {
  if (!form.name.trim()) return
  saving.value = true
  try {
    await createCustom.mutate({
      name: form.name,
      category: form.category || undefined,
      equipment: form.equipment || undefined,
      bodyweight: form.bodyweight || undefined
    })
    showAdd.value = false
    form.name = ''
    form.category = ''
    form.equipment = ''
    form.bodyweight = false
  } finally {
    saving.value = false
  }
}

// Toggle body-weight on a custom exercise from the detail sheet.
async function toggleBodyweight(value: boolean) {
  if (!selected.value) return
  await setBodyweight.mutate({ id: selected.value._id, bodyweight: value })
  selected.value = { ...selected.value, bodyweight: value }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold">
        Exercises
      </h1>
      <UButton
        icon="i-lucide-plus"
        size="sm"
        label="Custom"
        @click="showAdd = true"
      />
    </div>

    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Search exercises…"
      class="w-full"
      :loading="isPending"
    />

    <!-- Category filter chips -->
    <div
      v-if="categories?.length"
      class="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
    >
      <UButton
        label="All"
        size="xs"
        :color="activeCategory ? 'neutral' : 'primary'"
        :variant="activeCategory ? 'soft' : 'solid'"
        @click="activeCategory = undefined"
      />
      <UButton
        v-for="cat in categories"
        :key="cat"
        :label="cat"
        size="xs"
        class="shrink-0"
        :color="activeCategory === cat ? 'primary' : 'neutral'"
        :variant="activeCategory === cat ? 'solid' : 'soft'"
        @click="activeCategory = cat"
      />
    </div>

    <!-- List -->
    <div class="space-y-2">
      <p
        v-if="!isPending && exercises?.length === 0"
        class="text-sm text-muted py-8 text-center"
      >
        No exercises found.
      </p>
      <UCard
        v-for="ex in exercises"
        :key="ex._id"
        :ui="{ body: 'p-3 sm:p-3' }"
        class="transition-colors hover:bg-elevated/50 cursor-pointer"
        @click="selected = ex"
      >
        <div class="flex items-center gap-3">
          <div
            class="size-10 rounded-lg bg-elevated flex items-center justify-center shrink-0 overflow-hidden"
          >
            <img
              v-if="ex.imageUrl"
              :src="ex.imageUrl"
              :alt="ex.name"
              class="size-full object-contain p-1"
            >
            <UIcon
              v-else
              name="i-lucide-dumbbell"
              class="text-muted size-5"
            />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">
              {{ ex.name }}
            </p>
            <p class="text-xs text-muted truncate">
              <span v-if="ex.category">{{ ex.category }}</span>
              <span v-if="ex.equipment"> · {{ ex.equipment }}</span>
            </p>
          </div>
          <UBadge
            v-if="ex.bodyweight"
            color="neutral"
            variant="soft"
            size="sm"
          >
            Body weight
          </UBadge>
          <UBadge
            v-if="ex.source === 'custom'"
            color="neutral"
            variant="soft"
            size="sm"
          >
            Custom
          </UBadge>
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="soft"
            size="sm"
            :disabled="adding"
            aria-label="Add to today's workout"
            @click.stop="addToToday(ex)"
          />
        </div>
      </UCard>
    </div>

    <p class="text-xs text-dimmed text-center pt-2">
      Exercise data from
      <a
        href="https://wger.de"
        target="_blank"
        class="underline"
      >wger</a> (CC-BY-SA).
    </p>

    <!-- Exercise detail sheet -->
    <UModal
      v-model:open="showDetail"
      :title="selected?.name ?? 'Exercise'"
      :description="[selected?.category, selected?.equipment].filter(Boolean).join(' · ') || undefined"
    >
      <template #body>
        <div
          v-if="selected"
          class="space-y-4"
        >
          <img
            v-if="selected.imageUrl"
            :src="selected.imageUrl"
            :alt="selected.name"
            class="w-full h-48 object-contain rounded-lg bg-elevated p-2"
          >
          <!-- Body-weight: editable for custom exercises, read-only badge otherwise -->
          <div
            v-if="selected.source === 'custom'"
            class="flex items-center justify-between rounded-lg border border-default p-3"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium">
                Body weight
              </p>
              <p class="text-xs text-muted">
                Track by reps only, no weight
              </p>
            </div>
            <USwitch
              :model-value="selected.bodyweight ?? false"
              @update:model-value="toggleBodyweight"
            />
          </div>
          <UBadge
            v-else-if="selected.bodyweight"
            color="neutral"
            variant="soft"
            icon="i-lucide-user"
          >
            Body weight
          </UBadge>

          <ExerciseProgress
            :exercise-id="selected._id"
            :name="selected.name"
            hide-title
          />

          <div class="space-y-2 border-t border-default pt-4">
            <p class="text-xs font-medium text-muted uppercase tracking-wide">
              Add to
            </p>
            <UButton
              label="Today's workout"
              icon="i-lucide-calendar-plus"
              block
              size="lg"
              :disabled="adding"
              @click="addToToday(selected); showDetail = false"
            />
            <UButton
              v-for="plan in plans"
              :key="plan._id"
              color="neutral"
              variant="soft"
              block
              size="lg"
              :disabled="adding"
              class="justify-between"
              @click="addToPlan(selected, plan); showDetail = false"
            >
              <span class="flex items-center gap-2 min-w-0">
                <UIcon
                  name="i-lucide-clipboard-list"
                  class="size-4 shrink-0"
                />
                <span class="truncate">{{ plan.name }}</span>
              </span>
              <span class="text-xs text-muted shrink-0">{{ plan.exerciseCount }} exercises</span>
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Add custom modal -->
    <UModal
      v-model:open="showAdd"
      title="Add custom exercise"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField
            label="Name"
            required
          >
            <UInput
              v-model="form.name"
              placeholder="e.g. Cable Fly"
              autofocus
              class="w-full"
            />
          </UFormField>
          <UFormField label="Muscle group">
            <UInput
              v-model="form.category"
              placeholder="e.g. Chest"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Equipment">
            <UInput
              v-model="form.equipment"
              placeholder="e.g. Cable machine"
              class="w-full"
            />
          </UFormField>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium">
                Body weight
              </p>
              <p class="text-xs text-muted">
                Track by reps only, no weight
              </p>
            </div>
            <USwitch v-model="form.bodyweight" />
          </div>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="showAdd = false"
            />
            <UButton
              label="Save"
              :loading="saving"
              :disabled="!form.name.trim()"
              @click="saveCustom"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
