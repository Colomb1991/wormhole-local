import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <h1 className="text-4xl font-bold">Wormhole Local</h1>
        <p className="text-muted-foreground mt-2">Food delivery multi-tenant — v0</p>
      </div>

      <div className="border-border rounded-lg border p-6 text-left text-sm">
        <p className="mb-2 font-medium">📍 Sviluppo in corso</p>
        <p className="text-muted-foreground">
          Setup iniziale completato. Le feature vere arrivano nelle prossime settimane. Vedi{' '}
          <code className="font-mono">docs/PROGRESS.md</code> nel repo per lo stato corrente.
        </p>
      </div>

      <Link
        href="/r/cinese-usdt"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-3 font-medium"
      >
        Apri ristorante demo
      </Link>
    </main>
  )
}
