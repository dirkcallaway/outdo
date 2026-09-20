<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
    { name: 'theme-color', content: '#111827' }
  ],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: { lang: 'en' }
})

const title = 'Workout Tracker'
const description = 'Build workouts, log sets and reps, and track progress over time.'
useSeoMeta({ title, description, ogTitle: title, ogDescription: description })

const route = useRoute()
const tabs = [
  { label: 'Calendar', to: '/', icon: 'i-lucide-calendar-days' },
  { label: 'Exercises', to: '/exercises', icon: 'i-lucide-dumbbell' },
  { label: 'Stats', to: '/stats', icon: 'i-lucide-trending-up' }
]

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <UApp>
    <SignedIn>
      <div class="min-h-dvh flex flex-col mx-auto max-w-lg w-full">
        <!-- Top bar -->
        <header
          class="sticky top-0 z-20 flex items-center justify-between gap-2 px-4 h-14 border-b border-default bg-default/80 backdrop-blur"
        >
          <NuxtLink
            to="/"
            class="flex items-center gap-2 font-semibold"
          >
            <UIcon
              name="i-lucide-flame"
              class="text-primary size-5"
            />
            <span>Workouts</span>
          </NuxtLink>
          <div class="flex items-center gap-1">
            <UColorModeButton />
            <UserButton />
          </div>
        </header>

        <!-- Page -->
        <main class="flex-1 px-4 py-4 pb-24">
          <NuxtPage />
        </main>

        <!-- Bottom tab nav -->
        <nav
          class="fixed bottom-0 inset-x-0 z-20 mx-auto max-w-lg border-t border-default bg-default/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
        >
          <ul class="grid grid-cols-3">
            <li
              v-for="tab in tabs"
              :key="tab.to"
            >
              <NuxtLink
                :to="tab.to"
                class="flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors"
                :class="isActive(tab.to) ? 'text-primary' : 'text-muted hover:text-default'"
              >
                <UIcon
                  :name="tab.icon"
                  class="size-5"
                />
                {{ tab.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </div>
    </SignedIn>

    <SignedOut>
      <div class="min-h-dvh flex flex-col items-center justify-center gap-8 p-6">
        <div class="text-center space-y-2">
          <UIcon
            name="i-lucide-flame"
            class="text-primary size-10 mx-auto"
          />
          <h1 class="text-2xl font-bold">
            Workout Tracker
          </h1>
          <p class="text-muted max-w-xs">
            Build workouts, log your sets and reps, and watch your progress over time.
          </p>
        </div>
        <SignIn />
      </div>
    </SignedOut>
  </UApp>
</template>
