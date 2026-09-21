// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    'convex-nuxt',
    '@clerk/nuxt',
    '@vite-pwa/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2026-06-30',

  clerk: {
    // Bake the publishable key at build so it isn't dependent on runtime env
    // overrides of nested public config (unreliable on serverless). The secret
    // key stays server-only and is read from NUXT_CLERK_SECRET_KEY at runtime.
    publishableKey: process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  },

  convex: {
    // Set NUXT_PUBLIC_CONVEX_URL in .env (printed by `npx convex dev`)
    url: process.env.NUXT_PUBLIC_CONVEX_URL
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Workout Tracker',
      short_name: 'Workouts',
      description: 'Build workouts, log sets and reps, track progress over time.',
      theme_color: '#111827',
      background_color: '#111827',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
    },
    client: {
      installPrompt: true
    },
    devOptions: {
      enabled: false
    }
  }
})
