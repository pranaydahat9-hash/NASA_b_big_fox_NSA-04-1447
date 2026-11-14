import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Bluetooth, Radio, Users, MessageSquare, ShieldCheck, AlertTriangle, Smartphone, LockKeyhole, Send, Trash2, Check, CircleHelp, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/community')({
  head: () => ({ meta: [
    { title: 'Nearby Community — FOX offline connection design' },
    { name: 'description', content: 'Explore the FOX nearby community design for offline phone-to-phone text and alert sharing. Native connectivity is not available in this web preview.' },
    { property: 'og:title', content: 'Nearby Community — FOX' },
    { property: 'og:description', content: 'A clearly labelled design for nearby offline community messaging and alerts.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Community,
});

function Community() {
  const [alias, setAlias] = useState('');
  const [group, setGroup] = useState('');
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>('high');
  const [drafts, setDrafts] = useState<{ id: number; text: string; kind: string; at: string }[]>([]);
  const save = (kind: string) => {
    if (!message.trim()) return;
    setDrafts(rows => [...rows, { id: Date.now(), text: message.trim(), kind, at: new Date().toISOString() }]);
    setMessage('');
  };
  return <div className="space-y-6 pb-4">
    <header className="space-y-3 pt-2">
      <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-xs font-semibold text-primary"><Radio className="h-4 w-4" />NEARBY COMMUNITY</span><span className="rounded-full border border-med/50 bg-med/10 px-2 py-1 text-[10px] font-semibold text-med">DESIGN PREVIEW</span></div>
      <h1 className="text-3xl font-bold">Stay connected.<br />Even off the grid.</h1>
      <div className="flex items-start gap-2 border-l-2 border-med pl-3 text-xs text-muted-foreground"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" /><p>Bluetooth / Wi-Fi phone-to-phone messaging requires the future installed phone app. This web preview cannot discover phones or send messages. No nearby people or deliveries are simulated.</p></div>
    </header>

    <section aria-label="Nearby connection status" className="border-y py-5">
      <div className="flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10"><Smartphone className="h-6 w-6 text-primary" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-bold">Your nearby identity</h2><p className="text-xs text-muted-foreground">Not broadcasting · No connection</p></div><Bluetooth className="h-6 w-6 shrink-0 text-muted-foreground" /></div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs font-medium">Display name<Input aria-label="Community display name" placeholder="A name neighbours can recognise" maxLength={40} value={alias} onChange={e => setAlias(e.target.value)} /></label><label className="space-y-1 text-xs font-medium">Community name<Input aria-label="Community name" placeholder="Building, village or relief group" maxLength={60} value={group} onChange={e => setGroup(e.target.value)} /></label></div>
      <div className="mt-3 grid grid-cols-2 gap-2"><Button disabled variant="outline"><Radio className="h-4 w-4" />Find nearby</Button><Button disabled variant="outline"><Users className="h-4 w-4" />Create community</Button></div>
      <p className="mt-2 text-[11px] text-muted-foreground">Connection controls unavailable in this web app. Names and drafts stay in this preview session; reloading clears them.</p>
    </section>

    <Tabs defaultValue="people">
      <TabsList className="grid h-11 w-full grid-cols-3"><TabsTrigger value="people" className="gap-1 px-1 text-xs"><Users className="h-4 w-4" />Nearby</TabsTrigger><TabsTrigger value="chat" className="gap-1 px-1 text-xs"><MessageSquare className="h-4 w-4" />Messages</TabsTrigger><TabsTrigger value="alerts" className="gap-1 px-1 text-xs"><AlertTriangle className="h-4 w-4" />Alerts</TabsTrigger></TabsList>
      <TabsContent value="people" className="py-4">
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Nearby people</h2><span className="text-[11px] text-muted-foreground">Discovery unavailable</span></div>
        <div className="flex flex-col items-center gap-3 py-9 text-center"><Users className="h-10 w-10 text-muted-foreground" /><h3 className="text-base font-semibold">No nearby connection</h3><p className="max-w-xs text-xs text-muted-foreground">No scan has run. The installed phone app would show consenting devices here after Bluetooth / Wi-Fi discovery.</p></div>
        <div className="flex items-start gap-2 border-t pt-3 text-xs text-muted-foreground"><LockKeyhole className="h-4 w-4 shrink-0 text-primary" /><p>Planned connection check: both people compare a matching verification code before joining. Unknown peers are not automatically trusted.</p></div>
      </TabsContent>
      <TabsContent value="chat" className="space-y-4 py-4">
        <div><h2 className="text-sm font-bold">{group.trim() || 'Community messages'}</h2><p className="mt-1 text-xs text-muted-foreground">Not connected · Local drafts only</p></div>
        <DraftList drafts={drafts.filter(d => d.kind === 'Message')} remove={id => setDrafts(d => d.filter(row => row.id !== id))} />
        <label className="block space-y-2 text-xs font-medium">Message draft<Textarea aria-label="Community message draft" value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} placeholder="Describe what help you need or what you can offer…" /></label>
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" disabled={!message.trim()} onClick={() => save('Message')}>Keep local draft</Button><Button disabled><Send className="h-4 w-4" />Send to group</Button></div>
      </TabsContent>
      <TabsContent value="alerts" className="space-y-4 py-4">
        <div><h2 className="text-sm font-bold">Community alert draft</h2><p className="mt-1 text-xs text-muted-foreground">Owner observation · Not an agency warning · Not sent</p></div>
        <div role="group" aria-label="Draft alert level" className="grid grid-cols-3 gap-2">{(['low', 'medium', 'high'] as const).map(l => <Button key={l} size="sm" variant="outline" aria-pressed={level === l} onClick={() => setLevel(l)} className={cn('capitalize', l === 'high' ? 'text-high border-high/50' : l === 'medium' ? 'text-med border-med/50' : 'text-low border-low/50', level === l && 'bg-muted ring-1 ring-ring')}>{level === l && <Check className="h-3 w-3" />}{l}</Button>)}</div>
        <label className="block space-y-2 text-xs font-medium">Alert details<Textarea aria-label="Community alert draft" value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} placeholder="What happened? Where? What help is needed?" /></label>
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" disabled={!message.trim()} onClick={() => save(`${level} alert`)}>Keep local draft</Button><Button disabled variant="danger"><Radio className="h-4 w-4" />Broadcast alert</Button></div>
        <DraftList drafts={drafts.filter(d => d.kind !== 'Message')} remove={id => setDrafts(d => d.filter(row => row.id !== id))} />
      </TabsContent>
    </Tabs>

    <section className="border-t pt-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-primary" />Planned offline community</h2>
      <ol className="space-y-4">{[
        ['Discover & agree', 'Nearby phones advertise only with permission. People approve each connection and can block or leave.'],
        ['Text without internet', 'The native app exchanges encrypted messages over Bluetooth / local Wi-Fi. Range depends on devices and surroundings—not a guaranteed distance.'],
        ['Know what arrived', 'A message stays “pending” until the recipient device acknowledges it. A receipt does not mean someone is coming to help.'],
        ['Relay with consent', 'Optional forwarding could carry alerts between connected groups, with expiry and duplicate checks. Multi-hop relaying would require separate engineering and field tests.'],
      ].map(([title, detail], i) => <li key={title} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span><div><h3 className="text-xs font-semibold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div></li>)}</ol>
      <Button asChild variant="outline" className="mt-5 w-full"><a href="/emergency-kit.html"><WifiOff className="h-4 w-4" />Use available offline help</a></Button>
    </section>
  </div>;
}

function DraftList({ drafts, remove }: { drafts: { id: number; text: string; kind: string; at: string }[]; remove: (id: number) => void }) {
  if (!drafts.length) return <p className="border-y py-6 text-center text-xs text-muted-foreground">No local drafts. Nothing has been sent or received.</p>;
  return <ul className="space-y-2">{drafts.map(d => <li key={d.id} className="rounded-lg border bg-surface p-3"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold capitalize text-med">{d.kind} · Local draft · Not sent</span><Button size="icon" variant="ghost" aria-label="Delete local draft" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button></div><p className="whitespace-pre-wrap break-words text-sm">{d.text}</p><p className="mt-2 text-[10px] text-muted-foreground">Created {new Date(d.at).toLocaleTimeString()}</p></li>)}</ul>;
}