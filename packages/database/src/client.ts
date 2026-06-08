import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment')
}

// Connessione runtime: usa il transaction pooler (porta 6543).
// `prepare: false` perché pgbouncer in transaction mode non supporta
// prepared statements lato server.
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 10,
})

export const db = drizzle(client, { schema })

export type Database = typeof db
export * from './schema/index'
