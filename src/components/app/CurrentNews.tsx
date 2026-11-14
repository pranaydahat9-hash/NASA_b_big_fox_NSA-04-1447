import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';
import { getNasaNews } from '@/lib/news.functions';
import { Button } from '@/components/ui/button';
import { Panel } from './bits';

export function CurrentNews() {
  const getNews = useServerFn(getNasaNews);
  const news = useQuery({ queryKey: ['nasa-current-news'], queryFn: () => getNews(), staleTime: 15 * 60000 });
  const [glacier, setGlacier] = useState(false);
  const items = (news.data?.items ?? []).filter(item => !glacier || item.glacier).slice(0, 6);
  return <Panel title="Current NASA news" icon={<Newspaper className="h-4 w-4 text-primary" />} right={<Button size="icon" variant="ghost" aria-label="Refresh NASA news" disabled={news.isFetching} onClick={() => news.refetch()}><RefreshCw className="h-4 w-4" /></Button>}>
    <div className="mb-3 flex gap-2"><Button size="sm" variant={glacier ? 'outline' : 'default'} onClick={() => setGlacier(false)}>Latest news</Button><Button size="sm" variant={glacier ? 'default' : 'outline'} onClick={() => setGlacier(true)}>Glaciers & ice</Button></div>
    {news.isLoading && <p className="text-xs text-muted-foreground">Fetching NASA headlines…</p>}
    {news.error && <p className="text-xs text-med">NASA news is unavailable right now. No headlines have been substituted.</p>}
    {news.data && items.length === 0 && <p className="text-xs text-muted-foreground">No glacier or ice stories in the latest NASA feed. <a href="https://science.nasa.gov/earth/" target="_blank" rel="noreferrer" className="text-primary underline">Visit NASA Earth</a></p>}
    <ul className="space-y-3">{items.map(item => <li key={item.url} className="border-b pb-3 last:border-0"><a href={item.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-sm font-semibold text-primary">{item.title}<ExternalLink className="mt-1 h-3 w-3 shrink-0" /></a><p className="mt-1 text-[11px] text-muted-foreground">NASA · {new Date(item.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p><p className="mt-1 text-xs text-muted-foreground">{item.summary}</p></li>)}</ul>
    {news.data && <p className="mt-2 text-[10px] text-muted-foreground">Checked {new Date(news.data.checkedAt).toLocaleString()}. Science news is not a local emergency warning.</p>}
  </Panel>;
}