import type { QueryCtx, MutationCtx } from './_generated/server'

// Returns the Clerk subject for the signed-in user, or throws.
export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Not authenticated')
  }
  return identity.subject
}

// Returns the Clerk subject, or null when signed out (for optional-auth reads).
export async function getUserId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity()
  return identity?.subject ?? null
}
