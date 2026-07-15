import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-accent to-accent-strong flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-6">AthletePro</h1>
        <p className="text-xl text-white/80 mb-12 max-w-md mx-auto">
          Zapisuj výsledky, sleduj progres.
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link
            href="/admin"
            className="px-8 py-3 bg-surface text-accent-strong font-semibold rounded-full hover:bg-surface-muted transition"
          >
            Admin Panel
          </Link>
          <Link
            href="/client"
            className="px-8 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-strong transition"
          >
            Přihlášení
          </Link>
        </div>

        <p className="text-white/70 mt-8 text-sm max-w-md mx-auto">
          {/* Dokumentace: <Link href="/docs/mvp-scope-v1.md" className="underline">MVP Scope</Link> •{' '}
          <Link href="/docs/SUPABASE_SETUP.md" className="underline">Setup Supabase</Link> •{' '}
          <Link href="/TODO.md" className="underline">TODO List</Link> */}
        </p>
      </div>
    </div>
  )
}
