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

// --- Add custom exercise ---
const showAdd = ref(false)
const form = reactive({ name: '', category: '', equipment: '' })
const saving = ref(false)
const createCustom = useConvexMutation(api.exercises.createCustom)

async function saveCustom() {
  if (!form.name.trim()) return
  saving.value = true
  try {
    await createCustom.mutate({
      name: form.name,
      category: form.category || undefined,
      equipment: form.equipment || undefined
    })
    showAdd.value = false
    form.name = ''
    form.category = ''
    form.equipment = ''
  } finally {
    saving.value = false
  }
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
      >
        <div class="flex items-center gap-3">
          <div
            class="size-10 rounded-lg bg-elevated flex items-center justify-center shrink-0 overflow-hidden"
          >
            <img
              v-if="ex.imageUrl"
              :src="ex.imageUrl"
              :alt="ex.name"
              class="size-full object-cover"
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
            v-if="ex.source === 'custom'"
            color="neutral"
            variant="soft"
            size="sm"
          >
            Custom
          </UBadge>
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
