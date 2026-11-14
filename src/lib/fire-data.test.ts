import {expect,it} from 'vitest';
import {parseFireCsv} from './fire-data';
it('does not treat a NASA error body as zero fires',()=>expect(parseFireCsv('Invalid MAP_KEY')).toBeNull());
it('preserves real fire units and observation time',()=>expect(parseFireCsv('latitude,longitude,frp,acq_date,acq_time\n19.1,72.9,3.4,2026-11-14,0345')).toEqual([{lat:19.1,lon:72.9,frp:3.4,date:'2026-11-14T03:45:00Z'}]));
it('rejects malformed coordinates',()=>expect(parseFireCsv('latitude,longitude,frp,acq_date\n,72.9,3,2026-11-14')).toEqual([]));
