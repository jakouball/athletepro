'use client'

import Link from 'next/link'
import { Dumbbell, History, LogOut } from 'lucide-react'

type BottomNavProps = {
  active: 'workout' | 'history'
  onLogout: () => void
}

export default function BottomNav({ active, onLogout }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="flex items-center gap-1 rounded-full bg-nav p-1.5 shadow-xl">
        <Link
          href="/client/workout"
          aria-current={active === 'workout' ? 'page' : undefined}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
            active === 'workout' ? 'bg-white text-ink' : 'text-white/70 hover:text-white'
          }`}
        >
          <Dumbbell className="h-4 w-4" />
          Trénink
        </Link>
        <Link
          href="/client/history"
          aria-current={active === 'history' ? 'page' : undefined}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
            active === 'history' ? 'bg-white text-ink' : 'text-white/70 hover:text-white'
          }`}
        >
          <History className="h-4 w-4" />
          Historie
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </nav>
  )
}
