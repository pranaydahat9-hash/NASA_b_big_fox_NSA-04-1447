import type { Settings } from './settings';
export const FOX_PAGES = ['dashboard', 'map', 'sos', 'prevent', 'reports', 'settings', 'offline', 'trends'] as const;
export const isFoxPage = (page: unknown): page is typeof FOX_PAGES[number] => FOX_PAGES.some(p => p === page);
export function isEmergencyCommand(text: string) {
 const q = text.trim().replace(/^(hey|hi|ok)\s+fox[,!\s]*/i, '').trim();
 if (/\b(how|explain|what|test|drill|cancel|stop|don't|do not)\b/i.test(q)) return false;
 return /^(help(?:\s+me)?|sos|emergency|save me)[!.\s]*$/i.test(q) || /\b(send|activate|trigger)\s+(?:an?\s+)?sos\b|\bi need help\b|bachao|मदद|बचाओ|मदत|वाचवा/i.test(q);
}
export function parseLocalCommand(text: string) {
 const q = text.trim().replace(/^(hey|hi|ok)\s+fox[,!\s]*/i, '');
 if (isEmergencyCommand(q)) return { name: 'trigger_sos', args: { reason: q } };
 const page = q.match(/^(?:open|go to|show)\s+(dashboard|map|sos|prevent|reports|settings|offline|trends)(?:\s+page)?[.!]?$/i);
 if (page) return { name: 'navigate', args: { page: page[1]?.toLowerCase() ?? 'dashboard' } };
 const lang = q.match(/(?:switch|change|set).*\b(hindi|marathi|english)\b/i);
 if (lang) return { name: 'set_setting', args: { key: 'language', value: ({ hindi: 'hi', marathi: 'mr', english: 'en' } as Record<string,string>)[lang[1]?.toLowerCase() ?? 'english'] ?? 'en' } };
 if (/make (?:the )?text bigger|increase (?:font|text) size/i.test(q)) return { name: 'set_setting', args: { key: 'fontScale', value: '1.25' } };
 const theme = q.match(/(?:switch|change|set|make).*\b(dark blue|dark|light|pink|system)\b/i);
 if (theme) return { name: 'set_setting', args: { key: 'theme', value: /pink/i.test(theme[1] ?? '') ? 'blossom' : /light/i.test(theme[1] ?? '') ? 'light' : /system/i.test(theme[1] ?? '') ? 'system' : 'abyss' } };
 const search = q.match(/^(?:search(?: the map for)?|find|show (?:the )?risk (?:in|for))\s+(.+)$/i);
 if (search) return { name: 'search_map', args: { query: search[1] ?? '' } };
 if (/^(?:show|open) (?:my )?safe zones/i.test(q)) return { name: 'show_safe_zones', args: {} };
 const saved = q.match(/^open (?:my )?saved (?:location |place )?(.+)$/i);
 if (saved) return { name: 'open_saved_location', args: { name: saved[1] ?? '' } };
 return null;
}
export function settingValue(key: string, raw: unknown): Partial<Settings> | null {
 if (key === 'theme' && ['abyss','light','blossom','system'].includes(String(raw))) return { theme: String(raw) as Settings['theme'] };
 if (key === 'language' && ['en','hi','mr'].includes(String(raw))) return { language: String(raw) as Settings['language'] };
 if (key === 'fontScale') { const n = Number(raw); return Number.isFinite(n) ? { fontScale: Math.max(.85, Math.min(1.5,n)) } : null; }
 if (['reduceMotion','highContrast','voiceReplies','alarmSound','clicks','notifyLow','notifyMedium','notifyHigh','handsFree'].includes(key) && [true,false,'true','false'].includes(raw as boolean|string)) return { [key]: raw === true || raw === 'true' };
 return null;
}
