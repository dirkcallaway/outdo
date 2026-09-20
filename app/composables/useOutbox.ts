import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { api } from '~~/convex/_generated/api'

export interface OutboxSet {
  entryId: string
  setNumber: number
  reps: number
  weight: number
  unit: 'kg' | 'lb'
  completed?: boolean
  restSeconds?: number
  loggedAt: number
}

// Logs sets to Convex, buffering to IndexedDB when offline and replaying the
// buffer (idempotently) once the connection returns. Set upserts are keyed by
// (entryId, setNumber) server-side, so replays never duplicate.
export function useOutbox() {
  const client = useConvexClient()
  const online = useOnline()
  const { data: pending } = useIDBKeyval<OutboxSet[]>('set-outbox', [])
  const syncing = ref(false)

  function dedupe(list: OutboxSet[], set: OutboxSet) {
    return [
      ...list.filter(s => !(s.entryId === set.entryId && s.setNumber === set.setNumber)),
      set
    ]
  }

  async function logSet(set: OutboxSet) {
    if (online.value) {
      try {
        await client.mutation(api.sets.log, set as never)
        return
      } catch {
        // fall through to buffering
      }
    }
    pending.value = dedupe(pending.value ?? [], set)
  }

  async function flush() {
    const list = pending.value ?? []
    if (!online.value || syncing.value || list.length === 0) return
    syncing.value = true
    try {
      await client.mutation(api.sets.bulkSync, { sets: list } as never)
      pending.value = []
    } catch {
      // keep buffer; will retry on next online tick
    } finally {
      syncing.value = false
    }
  }

  watch(online, (v) => {
    if (v) flush()
  })

  const pendingCount = computed(() => pending.value?.length ?? 0)

  return { logSet, flush, syncing, online, pendingCount }
}
