import { logoutAction } from '@/app/(auth)/actions'
import type { Dict } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Who you're signed in as, plus the way out. Both were missing from the app: the header
// showed your name only from `sm:` up (so never on a phone), and your own role wasn't
// visible anywhere — role labels only appeared on the management-only Team page, so a
// line cook had no way to see their own.
export function AccountCard({
  dict,
  name,
  roleLabel,
  email,
}: {
  dict: Dict
  name: string
  roleLabel: string
  email: string | undefined
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.accountTitle}</CardTitle>
        <CardDescription>{dict.settings.accountDesc}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{name}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {roleLabel}
            </span>
          </div>
          {email && <span className="text-sm text-muted-foreground">{email}</span>}
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="min-h-[44px] w-full sm:w-auto">
            {dict.common.signOut}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
