'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, ClipboardListIcon, UtensilsCrossedIcon, UsersIcon } from 'lucide-react'
import { useT } from '@/lib/i18n/client'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/dashboard', key: 'home', icon: HomeIcon },
  { href: '/prep-lists', key: 'lists', icon: ClipboardListIcon },
  { href: '/items', key: 'items', icon: UtensilsCrossedIcon },
  { href: '/team', key: 'team', icon: UsersIcon, management: true },
] as const

export function BottomNav({ showTeam }: { showTeam: boolean }) {
  const pathname = usePathname()
  const { dict } = useT()
  const tabs = TABS.filter((t) => !('management' in t && t.management) || showTeam)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {tabs.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          const label = dict.nav[key]
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
