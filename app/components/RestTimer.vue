<script setup lang="ts">
// A compact stopwatch + rest countdown for use during a workout.
const elapsed = ref(0) // seconds, counts up
const running = ref(false)
const restTarget = ref(0) // when > 0, we're counting down a rest

const { pause, resume, isActive } = useIntervalFn(() => {
  elapsed.value++
  if (restTarget.value > 0 && elapsed.value >= restTarget.value) {
    finishRest()
  }
}, 1000, { immediate: false })

function start() {
  running.value = true
  resume()
}
function stop() {
  running.value = false
  pause()
}
function reset() {
  stop()
  elapsed.value = 0
  restTarget.value = 0
}
function toggle() {
  if (isActive.value) stop()
  else start()
}

function startRest(seconds: number) {
  elapsed.value = 0
  restTarget.value = seconds
  start()
}

function finishRest() {
  stop()
  restTarget.value = 0
  // Best-effort haptic + notification cue.
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(400)
}

const label = computed(() => {
  const total = restTarget.value > 0 ? Math.max(restTarget.value - elapsed.value, 0) : elapsed.value
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

const isRest = computed(() => restTarget.value > 0)

onUnmounted(pause)
</script>

<template>
  <div class="flex items-center gap-2 rounded-xl border border-default bg-elevated/60 p-2">
    <div class="flex items-center gap-2 flex-1">
      <UButton
        :icon="isActive ? 'i-lucide-pause' : 'i-lucide-play'"
        :color="isActive ? 'primary' : 'neutral'"
        variant="soft"
        size="sm"
        @click="toggle"
      />
      <div
        class="tabular-nums font-semibold text-lg"
        :class="isRest ? 'text-primary' : ''"
      >
        {{ label }}
      </div>
      <span
        v-if="isRest"
        class="text-xs text-muted"
      >rest</span>
    </div>
    <div class="flex items-center gap-1">
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
      <UButton
        icon="i-lucide-rotate-ccw"
        size="xs"
        color="neutral"
        variant="ghost"
        @click="reset"
      />
    </div>
  </div>
</template>
