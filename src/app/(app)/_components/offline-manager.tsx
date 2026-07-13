'use client'

import { useEffect, useRef } from 'react'
import { WifiOffIcon } from 'lucide-react'
import { useOnline } from '@/lib/offline/use-online'
import { readQueue, removeFromQueue } from '@/lib/offline/queue'
import { setCompletionAction } from '../prep-lists/actions'
import { useT } from '@/lib/i18n/client'

// Mounted once in the app shell. Shows an offline banner, and replays queued completion
// intents when the connection returns (and once on mount if there are leftovers from a
// previous session). Each replayed intent revalidates its list server-side, so an open
// prep-list page reconciles automatically.
export function OfflineManager({ currentUserId }: { currentUserId: string }) {
  const { dict } = useT()
  const online = useOnline()
  const draining = useRef(false)
  const rerun = useRef(false)

  useEffect(() => {
    if (!online) return

    async function drain() {
      // Coalesce: if a drain is already running, ask it to loop once more when it
      // finishes rather than bailing — otherwise a connectivity flap mid-request could
      // strand the remaining items until the next reconnect.
      if (draining.current) {
        rerun.current = true
        return
      }
      draining.current = true
      try {
        do {
          rerun.current = false
          for (const item of readQueue()) {
            // Only replay intents made by the currently signed-in user. A different
            // user on this shared device leaves the prior user's intents untouched
            // (they replay when that user signs back in) — never under the wrong name.
            if (item.ownerId !== currentUserId) continue
            try {
              const res = await setCompletionAction(item.entryId, item.completed, item.completedAt)
              // Success, or the entry was deleted (last write wins): drop it. Any other
              // error (e.g. session expired) stays queued for the next attempt.
              if (!res?.error || res.code === 'entry_not_found') {
                removeFromQueue(item.entryId)
              }
            } catch {
              // Network failure — still effectively offline. Stop; retry on reconnect.
              return
            }
          }
        } while (rerun.current)
      } finally {
        draining.current = false
      }
    }

    drain()
  }, [online, currentUserId])

  if (online) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-2xl items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      <WifiOffIcon className="size-4 shrink-0" />
      {dict.appShell.offlineBanner}
    </div>
  )
}
