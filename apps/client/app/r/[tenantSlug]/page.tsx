interface PageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function TenantHomePage({ params }: PageProps) {
  const { tenantSlug } = await params

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">Ristorante: {tenantSlug}</h1>
      <p className="text-muted-foreground">
        Pagina placeholder. Sarà sostituita dall&apos;onboarding cliente (vedi FEATURE_SPECS sez.
        1).
      </p>
    </main>
  )
}
