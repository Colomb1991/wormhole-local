import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'
import { resolve } from 'node:path'

// Carica .env.local dalla root del monorepo
config({ path: resolve(process.cwd(), '../../.env.local') })

if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL is not set in environment')
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Drizzle Kit usa DIRECT_URL (session pooler) per supportare prepared
    // statements e advisory locks durante le migrazioni.
    url: process.env.DIRECT_URL,
  },
  strict: true,
  verbose: true,
})
