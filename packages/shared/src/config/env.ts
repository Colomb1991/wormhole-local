import { z } from 'zod'

/**
 * Schema centralizzato delle variabili d'ambiente.
 *
 * Validato al boot (import in `app/layout.tsx` di ogni app).
 * Se manca una env critica, l'app non parte — meglio fallire subito che a runtime.
 *
 * Variabili `NEXT_PUBLIC_*` sono accessibili lato client, le altre solo server.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_OWNER_URL: z.string().url().optional(),
  NEXT_PUBLIC_ADMIN_URL: z.string().url().optional(),

  // Sessions
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),

  // Email (opzionale durante dev iniziale)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Wormhole Local <noreply@example.com>'),

  // Push (opzionale durante dev iniziale)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:founder@wormholenetwork.io'),

  // Feature flags
  NEXT_PUBLIC_STRIPE_ENABLED: z.enum(['true', 'false']).default('false'),
  NEXT_PUBLIC_FEEDBACK_ENABLED: z.enum(['true', 'false']).default('true'),

  // Stripe (predisposti, vuoti in v0)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLIC_KEY: z.string().optional(),

  // Admin
  ADMIN_INITIAL_EMAIL: z.string().email().default('founder@wormholenetwork.io'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export type Env = z.infer<typeof envSchema>

/**
 * Parsing pigro: validato solo quando `env` viene effettivamente letto,
 * per non rompere build CI con env vars placeholder.
 */
let cachedEnv: Env | null = null

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables — see logs above')
  }
  cachedEnv = parsed.data
  return cachedEnv
}
