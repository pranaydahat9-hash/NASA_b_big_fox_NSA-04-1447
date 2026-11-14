import { expect, it } from 'vitest';
import { isAppPreview, validateHelpContacts } from './offline-help-policy';
it('keeps published domains eligible but refuses previews', () => {
  expect(isAppPreview('fox-disaster-sentinel.lovable.app')).toBe(false);
  expect(isAppPreview('ID-PREVIEW--005675.lovable.app')).toBe(true);
  expect(isAppPreview('preview-v2--shop.example.com')).toBe(false);
  expect(isAppPreview('project--123-dev.lovable.app')).toBe(true);
});
it('saves only valid contact names and international numbers', () => expect(validateHelpContacts([{name:'Family',phone:'+919876543210'},{name:'Bad',phone:'javascript:bad'}])).toEqual([{name:'Family',phone:'+919876543210'}]));