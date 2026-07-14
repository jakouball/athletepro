import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-6">AthletePro</h1>
        <p className="text-xl text-blue-100 mb-12 max-w-md mx-auto">
          Tréninkový app pro WLB skupinu. Zapisuj výsledky, sleduj progres.
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link
            href="/admin"
            className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Admin Panel
          </Link>
          <Link
            href="/client"
            className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition"
          >
            Přihlášení
          </Link>
        </div>

        <p className="text-blue-200 mt-8 text-sm max-w-md mx-auto">
          Dokumentace: <Link href="/docs/mvp-scope-v1.md" className="underline">MVP Scope</Link> •{' '}
          <Link href="/docs/SUPABASE_SETUP.md" className="underline">Setup Supabase</Link> •{' '}
          <Link href="/TODO.md" className="underline">TODO List</Link>
        </p>
      </div>
    </div>
  )
}
