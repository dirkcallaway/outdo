<script setup lang="ts">
import { api } from '~~/convex/_generated/api'
import type { Id } from '~~/convex/_generated/dataModel'

const props = defineProps<{ exerciseId: Id<'exercises'>, name: string, hideTitle?: boolean }>()

const { data: history } = useConvexQuery(
  api.stats.exerciseHistory,
  () => ({ exerciseId: props.exerciseId })
)
const { data: prs } = useConvexQuery(
  api.stats.personalRecords,
  () => ({ exerciseId: props.exerciseId })
)

const bodyweight = computed(() => prs.value?.bodyweight ?? false)
const labels = computed(() => (history.value ?? []).map(p => formatDisplayDate(p.date)))
const topWeight = computed(() => (history.value ?? []).map(p => p.topWeight))
const best1RM = computed(() => (history.value ?? []).map(p => p.best1RM))
const topReps = computed(() => (history.value ?? []).map(p => p.topReps))
</script>

<template>
  <div class="space-y-3">
    <h3
      v-if="!hideTitle"
      class="font-semibold"
    >
      {{ name }}
    </h3>

    <!-- Body-weight: rep-based records -->
    <div
      v-if="prs && bodyweight"
      class="grid grid-cols-3 gap-2"
    >
      <UCard :ui="{ body: 'p-3 sm:p-3' }">
        <p class="text-lg font-bold leading-none">
          {{ prs.maxReps }}
        </p>
        <p class="text-xs text-muted mt-1">
          Max reps
        </p>
      </UCard>
      <UCard :ui="{ body: 'p-3 sm:p-3' }">
        <p class="text-lg font-bold leading-none">
          {{ prs.totalReps }}
        </p>
        <p class="text-xs text-muted mt-1">
          Total reps
        </p>
      </UCard>
      <UCard :ui="{ body: 'p-3 sm:p-3' }">
        <p class="text-lg font-bold leading-none">
          {{ prs.totalSets }}
        </p>
        <p class="text-xs text-muted mt-1">
          Sets
        </p>
      </UCard>
    </div>

    <!-- Weighted: load-based records -->
    <div
      v-else-if="prs"
      class="grid grid-cols-3 gap-2"
    >
      <UCard :ui="{ body: 'p-3 sm:p-3' }">
        <p class="text-lg font-bold leading-none">
          {{ prs.maxWeight }}<span class="text-xs text-muted">{{ prs.unit }}</span>
        </p>
        <p class="text-xs text-muted mt-1">
          Max weight
        </p>
      </UCard>
      <UCard :ui="{ body: 'p-3 sm:p-3' }">
        <p class="text-lg font-bold leading-none">
          {{ prs.best1RM }}<span class="text-xs text-muted">{{ prs.unit }}</span>
        </p>
        <p class="text-xs text-muted mt-1">
          Est. 1RM
        </p>
      </UCard>
      <UCard :ui="{ body: 'p-3 sm:p-3' }">
        <p class="text-lg font-bold leading-none">
          {{ prs.maxReps }}
        </p>
        <p class="text-xs text-muted mt-1">
          Max reps
        </p>
      </UCard>
    </div>

    <UCard
      v-if="labels.length"
      :ui="{ body: 'p-3 sm:p-4' }"
    >
      <ClientOnly>
        <ProgressChart
          v-if="bodyweight"
          :labels="labels"
          :reps="topReps"
        />
        <ProgressChart
          v-else
          :labels="labels"
          :top-weight="topWeight"
          :best1-r-m="best1RM"
        />
      </ClientOnly>
    </UCard>
    <p
      v-else
      class="text-sm text-muted py-6 text-center"
    >
      No logged sets for this exercise yet.
    </p>
  </div>
</template>
