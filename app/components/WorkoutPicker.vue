<script setup lang="ts">
import { api } from '~~/convex/_generated/api'
import type { Id } from '~~/convex/_generated/dataModel'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ title?: string }>()
const emit = defineEmits<{ select: [templateId: Id<'templates'> | null] }>()

const { data: plans } = useConvexQuery(api.templates.list, {})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="props.title ?? 'Choose a workout'"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #body>
      <div class="flex flex-col max-h-[70vh]">
        <div class="overflow-y-auto divide-y divide-default">
          <!-- Saved workouts -->
          <button
            v-for="plan in plans"
            :key="plan._id"
            type="button"
            class="w-full flex items-center gap-3 p-4 text-left hover:bg-elevated transition-colors"
            @click="emit('select', plan._id)"
          >
            <UIcon
              name="i-lucide-clipboard-list"
              class="text-primary size-5 shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="font-medium truncate">
                {{ plan.name }}
              </p>
              <p class="text-xs text-muted">
                {{ plan.exerciseCount }} exercise{{ plan.exerciseCount === 1 ? '' : 's' }}
              </p>
            </div>
          </button>

          <!-- Empty / ad-hoc -->
          <button
            type="button"
            class="w-full flex items-center gap-3 p-4 text-left hover:bg-elevated transition-colors"
            @click="emit('select', null)"
          >
            <UIcon
              name="i-lucide-plus-circle"
              class="text-muted size-5 shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="font-medium">
                Empty workout
              </p>
              <p class="text-xs text-muted">
                Start blank and add exercises as you go
              </p>
            </div>
          </button>
        </div>

        <div
          v-if="plans && plans.length === 0"
          class="px-4 pb-4 pt-2 text-center"
        >
          <p class="text-sm text-muted mb-3">
            You haven't built any workouts yet.
          </p>
          <UButton
            to="/workouts"
            label="Build a workout"
            icon="i-lucide-clipboard-list"
            variant="soft"
            block
            @click="open = false"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
