import { describe, expect, it } from 'vitest';
import { isEmergencyCommand, parseLocalCommand, settingValue } from './fox-commands';
describe('B fox commands', () => {
 it('sends SOS for the requested wake phrase', () => expect(parseLocalCommand('Hey FOX, help me')?.name).toBe('trigger_sos'));
 it('sends SOS for the renamed wake phrase', () => expect(parseLocalCommand('Hey B fox, help me')?.name).toBe('trigger_sos'));
 it('sends SOS for SOS alone', () => expect(isEmergencyCommand('SOS')).toBe(true));
 it('does not dispatch when asking about help settings', () => expect(isEmergencyCommand('Open help settings')).toBe(false));
 it('opens graphs without AI', () => expect(parseLocalCommand('Open trends')).toEqual({ name:'navigate', args:{page:'trends'} }));
 it('switches to Marathi', () => expect(parseLocalCommand('Switch to Marathi')?.args).toEqual({key:'language',value:'mr'}));
 it('rejects invalid font values', () => expect(settingValue('fontScale','invalid')).toBeNull());
 it('rejects unknown settings', () => expect(settingValue('admin',true)).toBeNull());
 it('runs red-alert practice without SOS', () => expect(parseLocalCommand('Run red alert drill')).toEqual({ name: 'run_drill', args: { tier: 'high' } }));
 it('opens emergency contacts without sending SOS', () => expect(parseLocalCommand('Open emergency contacts')).toEqual({ name: 'navigate', args: { page: 'sos' } }));
 it('does not treat drill messages as emergencies', () => expect(isEmergencyCommand('Send a drill SOS')).toBe(false));
});
