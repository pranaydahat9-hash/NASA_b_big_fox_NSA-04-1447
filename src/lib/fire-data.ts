export type FirePoint = {lat:number;lon:number;frp:number;date:string};
export function parseFireCsv(csv: string): FirePoint[] | null {
 const lines = csv.trim().split(/\r?\n/), head = (lines[0] ?? '').split(',');
 const iLat=head.indexOf('latitude'),iLon=head.indexOf('longitude'),iFrp=head.indexOf('frp'),iDate=head.indexOf('acq_date'),iTime=head.indexOf('acq_time');
 if ([iLat,iLon,iFrp,iDate].some(i=>i<0)) return null;
 return lines.slice(1).flatMap(line=> { const c=line.split(','); const lat=Number(c[iLat]),lon=Number(c[iLon]),frp=Number(c[iFrp]); const date=c[iDate] ?? ''; const time=(c[iTime] ?? '0000').padStart(4,'0');
  if (!c[iLat] || !c[iLon] || !c[iFrp] || !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(frp) || Math.abs(lat)>90 || Math.abs(lon)>180 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  return [{lat,lon,frp,date:`${date}T${time.slice(0,2)}:${time.slice(2,4)}:00Z`}]; });
}
