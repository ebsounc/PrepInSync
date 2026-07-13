// A tiny localStorage-backed queue of prep-list completion intents that were made
// offline. Keyed by entryId so repeated taps on one entry collapse to the latest
// intent (no duplicate replays). localStorage is plenty for a handful of checkbox
// intents and avoids IndexedDB's async ceremony; revisit with IndexedDB only if the
// queue ever needs to grow large. Client-only — every function no-ops during SSR.

const KEY = 'pis-completion-queue'

export type CompletionIntent = {
  entryId: string
  completed: boolean
  completedAt: string // ISO — the real (offline) check-off time
  ownerId: string // the profile that made the check — only they may replay it
}

function read(): Record<string, CompletionIntent> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

function write(map: Record<string, CompletionIntent>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(map))
}

export function enqueueCompletion(item: CompletionIntent) {
  const map = read()
  map[item.entryId] = item
  write(map)
}

export function readQueue(): CompletionIntent[] {
  return Object.values(read())
}

export function removeFromQueue(entryId: string) {
  const map = read()
  delete map[entryId]
  write(map)
}

export function queueSize(): number {
  return Object.keys(read()).length
}
