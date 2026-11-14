import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getNasaNews = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const response = await fetch('https://www.nasa.gov/feed/', { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`NASA news unavailable (${response.status})`);
    const { parseNasaNews } = await import('./news-data');
    return { items: parseNasaNews(await response.text()), checkedAt: new Date().toISOString() };
  });