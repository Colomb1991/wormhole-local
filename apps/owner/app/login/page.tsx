import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getOwnerSession } from '@/lib/auth'
import { LoginForm } from '@/components/LoginForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Login — Pannello Titolare' }

export default async function LoginPage() {
  const session = await getOwnerSession()
  if (session) redirect('/')

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <div className="border-border bg-background w-full max-w-sm rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Pannello Titolare</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Accedi per gestire gli ordini del tuo ristorante.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
