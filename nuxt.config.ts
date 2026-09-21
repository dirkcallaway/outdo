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
    // Publishable key baked from env at build. On Vercel it must be a plain
    // (Config) env var, not Sensitive — a "public"-prefixed Sensitive var
    // injects empty. The SECRET key stays server-only via NUXT_CLERK_SECRET_KEY.
    publishableKey: process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  },

  convex: {
    // Convex deployment URL from env (dev URL in .env locally; the prod URL is
    // a plain/Config Vercel env var). Public value that ships in the bundle.
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
