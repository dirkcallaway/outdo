// Bridges Clerk auth into the Convex client: whenever the Clerk session
// changes, hand Convex a function that mints a fresh "convex" JWT template
// token. Convex calls this function on connect and on token expiry.
export default defineNuxtPlugin(() => {
  const convex = useConvexClient()
  const { isSignedIn, getToken } = useAuth()

  const fetchToken = async () => {
    if (!isSignedIn.value) return null
    try {
      return await getToken.value({ template: 'convex' })
    } catch {
      return null
    }
  }

  watch(
    isSignedIn,
    () => {
      convex.setAuth(fetchToken)
    },
    { immediate: true }
  )
})
