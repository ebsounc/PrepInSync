'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, Trash2Icon } from 'lucide-react'
import { deleteListAction } from '../../actions'
import { Button } from '@/components/ui/button'

export function DeleteListButton({ listId }: { listId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!confirm) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label="Delete list"
        onClick={() => setConfirm(true)}
      >
        <Trash2Icon className="text-destructive" />
      </Button>
    )
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <span className="text-sm text-muted-foreground">Delete this list? This can&apos;t be undone.</span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="min-h-[44px]"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await deleteListAction(listId)
              if (res.error) {
                setError(res.error)
              } else {
                router.push('/prep-lists')
              }
            })
          }
        >
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : 'Delete' }
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-[44px]"
          onClick={() => setConfirm(false)}
        >
          Cancel
        </Button>
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
