<script setup lang="ts">
// Rest timer for the sticky workout bar: quick rest presets, a prominent
// countdown while resting, and an encouraging nudge when the rest is up.
const elapsed = ref(0) // seconds counted since the rest started
const restTarget = ref(0) // > 0 while a rest countdown is active
const finishedMsg = ref<string | null>(null)

const PHRASES = [
  'Time\'s up — let\'s go! 💪',
  'Back to it!',
  'Rest\'s over. You\'ve got this.',
  'Go crush the next set 🔥',
  'Up you get — one more.',
  'Let\'s move!'
]

const { pause, resume } = useIntervalFn(() => {
  elapsed.value++
  if (restTarget.value > 0 && elapsed.value >= restTarget.value) finishRest()
}, 1000, { immediate: false })

function startRest(seconds: number) {
  finishedMsg.value = null
  elapsed.value = 0
  restTarget.value = seconds
  resume()
}

function stopRest() {
  pause()
  restTarget.value = 0
  elapsed.value = 0
}

function finishRest() {
  pause()
  restTarget.value = 0
  finishedMsg.value = PHRASES[Math.floor(Math.random() * PHRASES.length)] ?? 'Let\'s go!'
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([300, 120, 300])
  setTimeout(() => (finishedMsg.value = null), 5000)
}

const remaining = computed(() => Math.max(restTarget.value - elapsed.value, 0))
const label = computed(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})
const isRest = computed(() => restTarget.value > 0)

onUnmounted(pause)
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Finished nudge -->
    <div
      v-if="finishedMsg"
      class="flex-1 flex items-center gap-2 text-success font-semibold"
    >
      <UIcon
        name="i-lucide-party-popper"
        class="size-5 shrink-0"
      />
      <span class="truncate">{{ finishedMsg }}</span>
    </div>

    <!-- Active rest countdown -->
    <template v-else-if="isRest">
      <UIcon
        name="i-lucide-timer"
        class="text-primary size-5 shrink-0"
      />
      <div class="tabular-nums font-bold text-2xl text-primary leading-none">
        {{ label }}
      </div>
      <span class="text-xs text-muted">rest</span>
      <div class="flex-1" />
      <UButton
        icon="i-lucide-plus"
        label="30s"
        size="xs"
        color="neutral"
        variant="soft"
        @click="restTarget += 30"
      />
      <UButton
        label="Skip"
        size="xs"
        color="neutral"
        variant="soft"
        @click="stopRest"
      />
    </template>

    <!-- Idle: rest presets -->
    <template v-else>
      <UIcon
        name="i-lucide-timer"
        class="text-muted size-5 shrink-0"
      />
      <span class="text-sm text-muted">Rest</span>
      <div class="flex-1" />
      <UButton
        label="60s"
        size="xs"
        color="neutral"
        variant="soft"
        @click="startRest(60)"
      />
      <UButton
        label="90s"
        size="xs"
        color="neutral"
        variant="soft"
        @click="startRest(90)"
      />
      <UButton
        label="2m"
        size="xs"
        color="neutral"
        variant="soft"
        @click="startRest(120)"
      />
    </template>
  </div>
</template>
