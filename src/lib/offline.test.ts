import {expect,it,vi} from 'vitest';
import {downloadArea} from './offline';
it('does not falsely mark failed map downloads complete',async()=>{
 vi.stubGlobal('caches',{open:async()=>({match:async()=>null,put:async()=>{}})});
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
 await expect(downloadArea('dark',19.076,72.8777,.001,()=>{})).rejects.toThrow('No complete area');
 vi.unstubAllGlobals();
});
it('does not bulk download standard OSM tiles',async()=>expect(downloadArea('light',19,72,4,()=>{})).rejects.toThrow('does not permit'));
