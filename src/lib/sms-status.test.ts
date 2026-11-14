import { expect, it } from 'vitest';
import { deliveryState } from './sms.server';
it('never promotes queued SMS to delivered',()=>expect(deliveryState('queued')).toBe('queued'));
it('preserves confirmed delivered status',()=>expect(deliveryState('delivered')).toBe('delivered'));
it('preserves failed delivery status',()=>expect(deliveryState('undelivered')).toBe('undelivered'));
