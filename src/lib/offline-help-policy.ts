export const OFFLINE_HELP_CONTACTS = 'fox.offline-help.contacts';
export type HelpContact = { name: string; phone: string };
export function validateHelpContacts(rows: HelpContact[]) {
  return rows.filter(row => typeof row.name === 'string' && typeof row.phone === 'string' && /^\+[1-9]\d{6,14}$/.test(row.phone)).map(row => ({ name: row.name.slice(0, 80), phone: row.phone })).slice(0, 30);
}
export function isAppPreview(hostname: string) {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+\.(?:lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host) || /^project--.+-dev\.(?:lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host) || ['lovableproject.com', 'lovableproject-dev.com', 'beta.lovable.dev'].some(domain => host === domain || host.endsWith('.' + domain));
}