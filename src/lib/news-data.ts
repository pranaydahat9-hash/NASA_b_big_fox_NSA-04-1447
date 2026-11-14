import { XMLParser, XMLValidator } from 'fast-xml-parser';
export type NewsItem = { title: string; url: string; publishedAt: string; summary: string; glacier: boolean };
export function parseNasaNews(xml: string): NewsItem[] {
  if (XMLValidator.validate(xml) !== true) throw new Error('NASA returned an invalid news feed');
  const parsed = new XMLParser({ processEntities: false }).parse(xml);
  const rows = parsed.rss?.channel?.item;
  if (!rows) throw new Error('NASA news feed unavailable');
  return (Array.isArray(rows) ? rows : [rows]).flatMap((row): NewsItem[] => {
    const title = String(row.title ?? '').replace(/<[^>]*>/g, '').trim();
    const url = String(row.link ?? '');
    const date = new Date(String(row.pubDate ?? ''));
    try { const u = new URL(url); if (u.protocol !== 'https:' || !(u.hostname === 'nasa.gov' || u.hostname.endsWith('.nasa.gov'))) return []; } catch { return []; }
    if (!title || !Number.isFinite(date.getTime())) return [];
    const summary = String(row.description ?? '').replace(/<[^>]*>/g, '').replace(/&#\d+;|&\w+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
    return [{ title, url, publishedAt: date.toISOString(), summary, glacier: /glacier|ice sheet|ice melt|melting ice|sea ice|cryosphere/i.test(`${title} ${summary}`) }];
  }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 40);
}