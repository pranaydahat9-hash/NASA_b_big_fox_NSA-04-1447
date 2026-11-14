import { describe, expect, it } from 'vitest';
import { ALERT_COLOURS, automaticAlertSmsAllowed, emergencyMessageOpening, EMERGENCY_SERVICES } from './emergency-policy';
describe('emergency safety', () => {
  it('uses green for low, yellow for medium and red for high', () => expect(ALERT_COLOURS).toEqual({ low: 'green', medium: 'yellow', high: 'red' }));
  it('does not automatically send messages during drills', () => expect(automaticAlertSmsAllowed(true)).toBe(false));
  it('preserves automatic messages for real alerts', () => expect(automaticAlertSmsAllowed(false)).toBe(true));
  it('labels practice messages as no emergency', () => expect(emergencyMessageOpening('Test user', true)).toContain('[DRILL — NO EMERGENCY]'));
  it('keeps real SOS wording', () => expect(emergencyMessageOpening('Test user', false)).toBe('SOS from Test user: I need help.'));
  it('uses India unified emergency dispatch for all service choices', () => expect(EMERGENCY_SERVICES.map(s => s.number)).toEqual(['112', '112', '112']));
});