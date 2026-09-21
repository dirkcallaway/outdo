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
    // The publishable key is a public value (it ships in the browser bundle), so
    // we bake it with a literal fallback. This makes the build independent of
    // Vercel's env plumbing for this key, which was arriving empty. Env var still
    // takes precedence, so a Clerk prod instance key can override it later.
    // The SECRET key stays server-only via NUXT_CLERK_SECRET_KEY at runtime.
    publishableKey:
      process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      || 'pk_test_bW92aW5nLW5ld3QtNDQ1NS5jbGVyay5hY2NvdW50cy5kZXYk'
  },

  convex: {
    // Public value (ships in the browser bundle). Local dev reads the dev URL
    // from .env; the literal is the production deployment fallback so the build
    // doesn't depend on Vercel's env plumbing (which was arriving empty).
    url:
      process.env.NUXT_PUBLIC_CONVEX_URL
      || 'https://healthy-clownfish-243.convex.cloud'
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
