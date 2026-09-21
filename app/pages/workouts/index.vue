<script setup lang="ts">
import { api } from '~~/convex/_generated/api'

const { data: plans } = useConvexQuery(api.templates.list, {})

const showNew = ref(false)
const newName = ref('')
const creating = ref(false)
const createPlan = useConvexMutation(api.templates.create)

async function submitNew() {
  creating.value = true
  try {
    const id = await createPlan.mutate({ name: newName.value || 'Workout' })
    showNew.value = false
    newName.value = ''
    await navigateTo(`/workouts/${id}`)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold">
        Workouts
      </h1>
      <UButton
        icon="i-lucide-plus"
        size="sm"
        label="New"
        @click="showNew = true"
      />
    </div>

    <p class="text-sm text-muted">
      Build reusable workouts, then add them to any day from the calendar.
    </p>

    <div class="space-y-2">
      <p
        v-if="plans && plans.length === 0"
        class="text-sm text-muted py-10 text-center"
      >
        No workouts yet. Tap "New" to build one.
      </p>

      <NuxtLink
        v-for="plan in plans"
        :key="plan._id"
        :to="`/workouts/${plan._id}`"
        class="block"
      >
        <UCard
          :ui="{ body: 'p-3 sm:p-3' }"
          class="hover:bg-elevated/50 transition-colors"
        >
          <div class="flex items-center gap-3">
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
            <UIcon
              name="i-lucide-chevron-right"
              class="text-dimmed size-4"
            />
          </div>
        </UCard>
      </NuxtLink>
    </div>

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
