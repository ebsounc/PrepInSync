'use client'

import { useEffect, useState } from 'react'

// Tracks connectivity via navigator.onLine + the online/offline events. Starts `true`
// so the server render and first client render agree (SSR has no navigator), then
// corrects on mount.
export function useOnline(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return online
}
