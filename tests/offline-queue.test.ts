import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  enqueueCompletion,
  readQueue,
  removeFromQueue,
  queueSize,
  type CompletionIntent,
} from '@/lib/offline/queue'

// A Map-backed localStorage stand-in. Hand-rolled rather than pulling in jsdom:
// the module only needs `window` to exist and `localStorage` to behave, and this keeps
// the dependency list (and the low-end-Android bundle discipline) honest.
function installStorage() {
  const store = new Map<string, string>()
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  }
  vi.stubGlobal('window', { localStorage })
  vi.stubGlobal('localStorage', localStorage)
  return store
}

const intent = (partial: Partial<CompletionIntent> = {}): CompletionIntent => ({
  entryId: 'entry-1',
  completed: true,
  completedAt: '2026-06-04T15:00:00.000Z',
  ownerId: 'cook-1',
  ...partial,
})

describe('offline completion queue', () => {
  let store: Map<string, string>

  beforeEach(() => {
    store = installStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts empty', () => {
    expect(readQueue()).toEqual([])
    expect(queueSize()).toBe(0)
  })

  it('round-trips a queued completion', () => {
    enqueueCompletion(intent())
    expect(queueSize()).toBe(1)
    expect(readQueue()).toEqual([intent()])
  })

  it('coalesces repeated taps on one entry into the latest intent', () => {
    // The correctness property: a cook tapping an item on and off in a dead zone must
    // replay once, with the final state -- not twice.
    enqueueCompletion(intent({ completed: true, completedAt: '2026-06-04T15:00:00.000Z' }))
    enqueueCompletion(intent({ completed: false, completedAt: '2026-06-04T15:00:05.000Z' }))
    enqueueCompletion(intent({ completed: true, completedAt: '2026-06-04T15:00:09.000Z' }))

    const queued = readQueue()
    expect(queued).toHaveLength(1)
    expect(queued[0].completed).toBe(true)
    expect(queued[0].completedAt).toBe('2026-06-04T15:00:09.000Z')
  })

  it('keeps separate entries separate', () => {
    enqueueCompletion(intent({ entryId: 'entry-1' }))
    enqueueCompletion(intent({ entryId: 'entry-2' }))
    expect(queueSize()).toBe(2)
    expect(readQueue().map((i) => i.entryId).sort()).toEqual(['entry-1', 'entry-2'])
  })

  it('preserves the real offline check-off time, not the sync time', () => {
    // The completion action carries this through, so the record shows when the work
    // was actually done rather than when signal came back.
    const completedAt = '2026-06-04T09:12:33.000Z'
    enqueueCompletion(intent({ completedAt }))
    expect(readQueue()[0].completedAt).toBe(completedAt)
  })

  it('binds each intent to the cook who made it', () => {
    // Shared device: a different user signing in must never sync someone else's
    // checks under their own name, so ownerId has to survive the round trip.
    enqueueCompletion(intent({ entryId: 'entry-1', ownerId: 'cook-1' }))
    enqueueCompletion(intent({ entryId: 'entry-2', ownerId: 'cook-2' }))

    const byId = new Map(readQueue().map((i) => [i.entryId, i.ownerId]))
    expect(byId.get('entry-1')).toBe('cook-1')
    expect(byId.get('entry-2')).toBe('cook-2')
  })

  it('removes a single entry and leaves the rest', () => {
    enqueueCompletion(intent({ entryId: 'entry-1' }))
    enqueueCompletion(intent({ entryId: 'entry-2' }))
    removeFromQueue('entry-1')
    expect(readQueue().map((i) => i.entryId)).toEqual(['entry-2'])
  })

  it('ignores removal of an entry that is not queued', () => {
    enqueueCompletion(intent({ entryId: 'entry-1' }))
    expect(() => removeFromQueue('nope')).not.toThrow()
    expect(queueSize()).toBe(1)
  })

  it('treats corrupt stored JSON as an empty queue instead of throwing', () => {
    store.set('pis-completion-queue', '{not json')
    expect(readQueue()).toEqual([])
    expect(queueSize()).toBe(0)
    // And it recovers -- the next write replaces the garbage.
    enqueueCompletion(intent())
    expect(readQueue()).toHaveLength(1)
  })

  it('survives a stored value that is valid JSON but the wrong shape', () => {
    store.set('pis-completion-queue', '[]')
    expect(() => readQueue()).not.toThrow()
    expect(() => queueSize()).not.toThrow()
  })
})

describe('offline queue during SSR', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('no-ops when there is no window', () => {
    // Every function is called from a client component that also renders on the
    // server; touching localStorage there would throw during SSR.
    vi.stubGlobal('window', undefined)
    expect(readQueue()).toEqual([])
    expect(queueSize()).toBe(0)
    expect(() => enqueueCompletion(intent())).not.toThrow()
    expect(() => removeFromQueue('entry-1')).not.toThrow()
  })
})
