import type { Level } from './hazard-model';

export const ALERT_COLOURS: Record<Level, string> = { low: 'green', medium: 'yellow', high: 'red' };
export const EMERGENCY_SERVICES = [
  { name: 'Ambulance', number: '112' },
  { name: 'Police', number: '112' },
  { name: 'Fire', number: '112' },
] as const;
export function emergencyMessageOpening(name: string, drill: boolean) {
  return drill ? `[DRILL — NO EMERGENCY] B fox red-alert practice from ${name}. This is a test; no emergency assistance is requested.` : `SOS from ${name}: I need help.`;
}
export const automaticAlertSmsAllowed = (drill: boolean) => !drill;