// Tells Convex how to validate the JWT minted by Clerk.
// Set CLERK_JWT_ISSUER_DOMAIN in the Convex dashboard (Settings → Environment
// Variables). It is the "Issuer" URL of your Clerk instance, e.g.
// https://your-app.clerk.accounts.dev
// In Clerk, create a JWT template named "convex" (applicationID below).
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: 'convex'
    }
  ]
}
