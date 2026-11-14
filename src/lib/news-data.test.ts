import { expect, it } from 'vitest';
import { parseNasaNews } from './news-data';
it('reads dated glacier news from NASA only', () => {
  const rows = parseNasaNews('<rss><channel><item><title>Glacier ice melt</title><link>https://www.nasa.gov/earth/story/</link><pubDate>Sat, 14 Nov 2026 12:00:00 GMT</pubDate><description>Observed glacier changes</description></item><item><title>Other</title><link>https://example.com/</link><pubDate>Sat, 14 Nov 2026 12:00:00 GMT</pubDate></item></channel></rss>');
  expect(rows).toHaveLength(1); expect(rows[0]?.glacier).toBe(true); expect(rows[0]?.publishedAt).toBe('2026-11-14T12:00:00.000Z');
});
it('rejects unavailable news instead of making up headlines', () => expect(() => parseNasaNews('<html>Unavailable</html>')).toThrow());