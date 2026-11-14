import { useState } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame } from 'lucide-react';
import { Panel } from './bits';
import { Button } from '@/components/ui/button';
import type { Assessment } from '@/lib/hazards.functions';
export function FireGraph({assessment}:{assessment:Assessment}) {
 const [metric,setMetric]=useState<'count'|'frp'>('count');
 const daily = new Map<string,{date:string;count:number;frp:number}>();
 assessment.fires.points.forEach(p=> { const date=p.date.slice(0,10),row=daily.get(date) ?? {date,count:0,frp:0}; row.count++;row.frp+=p.frp;daily.set(date,row); });
 const rows=[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date));
 return <Panel title="NASA FIRMS · satellite fire detections" icon={<Flame className="h-4 w-4 text-high" />}>
  {!assessment.fires.configured ? <p className="text-xs text-muted-foreground">NASA FIRMS data unavailable. A NASA FIRMS MAP_KEY is required; no zero-fire or simulated readings are shown.</p> : <>
   <div className="flex flex-wrap gap-2"><Button size="sm" variant={metric==='count'?'default':'outline'} onClick={()=>setMetric('count')}>Detections</Button><Button size="sm" variant={metric==='frp'?'default':'outline'} onClick={()=>setMetric('frp')}>Radiative power (MW)</Button></div>
   {rows.length ? <div className="mt-3 h-48" role="img" aria-label={`NASA VIIRS daily ${metric==='count'?'thermal detections':'fire radiative power in megawatts'}`}><ResponsiveContainer><BarChart data={rows}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:10,fill:'var(--muted-foreground)'}}/><YAxis width={40} tick={{fontSize:10,fill:'var(--muted-foreground)'}}/><Tooltip contentStyle={{background:'var(--popover)',border:'1px solid var(--border)'}}/><Bar dataKey={metric} name={metric==='count'?'Detections':'Radiative power (MW)'} fill="var(--hazard-high)"/></BarChart></ResponsiveContainer></div> : <p className="mt-3 text-xs">NASA returned no detections in this search area during the last 48 hours.</p>}
   <p className="mt-2 text-xs text-muted-foreground">VIIRS S-NPP near-real-time thermal anomalies, last 48 hours, UTC. Radiative power is energy emission in megawatts, not burned area or confirmed wildfire severity. The graph covers the requested satellite search box; the risk count uses detections within 50 km.</p>
  </>}
  <p className="mt-2 break-words text-[10px] text-muted-foreground"><a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noreferrer" className="text-primary underline">NASA FIRMS / VIIRS</a> · checked {new Date(assessment.generatedAt).toLocaleString()}</p>
 </Panel>;
}
