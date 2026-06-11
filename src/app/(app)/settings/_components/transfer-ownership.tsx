'use client'

import { useState, useTransition } from 'react'
import { Loader2Icon } from 'lucide-react'
import { transferOwnershipAction } from '../actions'
import { useT } from '@/lib/i18n/client'
import { Button } from '@/components/ui/button'
import {
  SelectField,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

type Member = { id: string; name: string }

export function TransferOwnership({ members }: { members: Member[] }) {
  const { dict, t } = useT()
  const [targetId, setTargetId] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">{dict.settings.noOtherMembers}</p>
  }

  const targetName = members.find((m) => m.id === targetId)?.name

  function doTransfer() {
    start(async () => {
      const res = await transferOwnershipAction(targetId)
      if (res.error) {
        setError(res.error)
        setConfirming(false)
        return
      }
      // On success the page revalidates; the caller is no longer owner, so this card
      // disappears. Nothing else to do here.
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">{dict.settings.newOwner}</label>
        <SelectField
          value={targetId}
          onValueChange={(v) => {
            setTargetId(v ?? '')
            setConfirming(false)
            setError(null)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={dict.settings.chooseMember}>
              {() => targetName ?? dict.settings.chooseMember}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectField>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {confirming ? (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <span>{t(dict.settings.transferConfirm, { name: targetName ?? '' })}</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              className="min-h-[48px] flex-1"
              disabled={pending}
              onClick={doTransfer}
            >
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : dict.settings.transferYes}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[48px]"
              onClick={() => setConfirming(false)}
            >
              {dict.common.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="destructive"
          className="min-h-[48px] self-start"
          disabled={!targetId}
          onClick={() => setConfirming(true)}
        >
          {dict.settings.transferButton}
        </Button>
      )}
    </div>
  )
}
