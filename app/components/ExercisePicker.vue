<script setup lang="ts">
import { api } from '~~/convex/_generated/api'
import type { Id } from '~~/convex/_generated/dataModel'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ select: [id: Id<'exercises'>, name: string] }>()

const search = ref('')
const debounced = refDebounced(search, 250)
const { data: exercises, isPending } = useConvexQuery(
  api.exercises.list,
  () => ({ search: debounced.value || undefined })
)

function pick(id: Id<'exercises'>, name: string) {
  emit('select', id, name)
  search.value = ''
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add exercise"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #body>
      <div class="flex flex-col max-h-[70vh]">
        <div class="p-4 border-b border-default">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search exercises…"
            autofocus
            class="w-full"
            :loading="isPending"
          />
        </div>
        <div class="overflow-y-auto divide-y divide-default">
          <button
            v-for="ex in exercises"
            :key="ex._id"
            type="button"
            class="w-full flex items-center gap-3 p-3 text-left hover:bg-elevated transition-colors"
            @click="pick(ex._id, ex.name)"
          >
            <div class="size-9 rounded-lg bg-elevated flex items-center justify-center shrink-0 overflow-hidden">
              <img
                v-if="ex.imageUrl"
                :src="ex.imageUrl"
                :alt="ex.name"
                class="size-full object-cover"
              >
              <UIcon
                v-else
                name="i-lucide-dumbbell"
                class="text-muted size-4"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium truncate">
                {{ ex.name }}
              </p>
              <p class="text-xs text-muted truncate">
                {{ ex.category }}<span v-if="ex.equipment"> · {{ ex.equipment }}</span>
              </p>
            </div>
            <UIcon
              name="i-lucide-plus"
              class="text-primary size-5 shrink-0"
            />
          </button>
          <p
            v-if="!isPending && exercises?.length === 0"
            class="text-sm text-muted p-8 text-center"
          >
            No matches.
          </p>
        </div>
      </div>
    </template>
  </UModal>
</template>
