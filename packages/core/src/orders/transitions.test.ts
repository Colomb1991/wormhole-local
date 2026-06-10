import { describe, it, expect } from 'vitest'
import {
  ORDER_TRANSITIONS,
  canTransition,
  isTerminalStatus,
  buildStatusChange,
  isPendingExpired,
  shouldAutoStartPreparing,
  STATUS_TIMESTAMP_FIELD,
} from './transitions'
import { ORDER_STATUSES } from '@wormhole/shared'

describe('ORDER_TRANSITIONS', () => {
  it('copre tutti gli stati', () => {
    for (const s of ORDER_STATUSES) {
      expect(ORDER_TRANSITIONS[s]).toBeDefined()
    }
  })

  it('flusso felice: pending → accepted → preparing → ready → in_delivery → delivered', () => {
    expect(canTransition('pending', 'accepted')).toBe(true)
    expect(canTransition('accepted', 'preparing')).toBe(true)
    expect(canTransition('preparing', 'ready')).toBe(true)
    expect(canTransition('ready', 'in_delivery')).toBe(true)
    expect(canTransition('in_delivery', 'delivered')).toBe(true)
  })

  it('cancellabile da ogni stato attivo, non dai terminali', () => {
    expect(canTransition('pending', 'cancelled')).toBe(true)
    expect(canTransition('accepted', 'cancelled')).toBe(true)
    expect(canTransition('preparing', 'cancelled')).toBe(true)
    expect(canTransition('ready', 'cancelled')).toBe(true)
    expect(canTransition('in_delivery', 'cancelled')).toBe(true)
    expect(canTransition('delivered', 'cancelled')).toBe(false)
    expect(canTransition('cancelled', 'cancelled')).toBe(false)
  })

  it('vieta salti e ritorni', () => {
    expect(canTransition('pending', 'preparing')).toBe(false)
    expect(canTransition('pending', 'delivered')).toBe(false)
    expect(canTransition('ready', 'preparing')).toBe(false)
    expect(canTransition('delivered', 'pending')).toBe(false)
    expect(canTransition('cancelled', 'accepted')).toBe(false)
  })

  it('delivered e cancelled sono terminali', () => {
    expect(isTerminalStatus('delivered')).toBe(true)
    expect(isTerminalStatus('cancelled')).toBe(true)
    expect(isTerminalStatus('pending')).toBe(false)
  })
})

describe('STATUS_TIMESTAMP_FIELD', () => {
  it('mappa gli stati con colonna dedicata', () => {
    expect(STATUS_TIMESTAMP_FIELD.accepted).toBe('acceptedAt')
    expect(STATUS_TIMESTAMP_FIELD.delivered).toBe('deliveredAt')
    expect(STATUS_TIMESTAMP_FIELD.cancelled).toBe('cancelledAt')
    expect(STATUS_TIMESTAMP_FIELD.preparing).toBeUndefined()
  })
})

describe('buildStatusChange', () => {
  it('serializza la entry per status_history', () => {
    const now = new Date('2026-06-11T19:00:00Z')
    expect(buildStatusChange('accepted', 'user-1', null, now)).toEqual({
      status: 'accepted',
      at: '2026-06-11T19:00:00.000Z',
      byUserId: 'user-1',
      reason: null,
    })
  })
})

describe('timeout automatici', () => {
  const now = new Date('2026-06-11T19:10:00Z')

  it('pending scade dopo il timeout', () => {
    expect(isPendingExpired(new Date('2026-06-11T19:04:00Z'), 5, now)).toBe(true)
    expect(isPendingExpired(new Date('2026-06-11T19:06:00Z'), 5, now)).toBe(false)
  })

  it('accepted passa a preparing dopo il delay', () => {
    expect(shouldAutoStartPreparing(new Date('2026-06-11T19:09:00Z'), 30, now)).toBe(true)
    expect(shouldAutoStartPreparing(new Date('2026-06-11T19:09:45Z'), 30, now)).toBe(false)
    expect(shouldAutoStartPreparing(null, 30, now)).toBe(false)
  })
})
