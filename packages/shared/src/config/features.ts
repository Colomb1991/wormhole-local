/**
 * Feature flags letti dalle env vars. Lato server e lato client.
 * NEXT_PUBLIC_* sono accessibili al client.
 */
export const FEATURES = {
  stripeEnabled: process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true',
  feedbackEnabled: process.env.NEXT_PUBLIC_FEEDBACK_ENABLED !== 'false',
} as const

export type FeatureFlag = keyof typeof FEATURES

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURES[flag]
}
