// Core business logic — re-export per area.
export * from './slots/types'
export * from './slots/calculator'
export * from './slots/cap-compatibility'

export * from './cart/calculator'

export * from './customer-codes/generator'

export * from './customers/onboarding'

export * from './restaurant/status'

export * from './orders/totals'
export * from './orders/transitions'

// NOTA: auth/password NON è esportato da questo barrel perché usa node:crypto
// e il barrel è importato anche da client components. Import dedicato:
//   import { verifyPassword } from '@wormhole/core/auth/password'

export * from './delivery/haversine'
