import { useState } from 'react';
import { Siren, MessageSquare, Loader2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { emitFox } from '@/lib/fox-bus';
import { useSos } from '@/lib/use-sos';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function DrillControls() {
  const [confirm, setConfirm] = useState(false);
  const { trigger, busy } = useSos();
  const send = async () => {
    try {
      const result = await trigger('drill');
      const count = result.deliveries.filter(d => d.status === 'delivered').length;
      toast(`${count}/${result.contactCount} drill messages confirmed delivered. ${result.contactCount ? 'Check SOS for sending details.' : 'No contacts saved; add contacts in SOS.'}`);
      setConfirm(false);
    } catch { toast.error('Drill message could not be sent. Use manual SMS in SOS.'); }
  };
  return <>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Button variant="outline" className="border-high/60 text-high" onClick={() => emitFox('drill', 'high')}><Siren className="h-4 w-4" />Run red-alert drill</Button>
      <Button variant="outline" onClick={() => setConfirm(true)}><MessageSquare className="h-4 w-4" />Optional drill message</Button>
    </div>
    <Button asChild variant="danger" className="mt-2 w-full"><Link to="/sos"><Siren className="h-4 w-4" />Direct SOS</Link></Button>
    <Dialog open={confirm} onOpenChange={v => { if (!busy) setConfirm(v); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send a drill message?</DialogTitle><DialogDescription>This sends your location at activation to all saved emergency contacts, labelled “DRILL — NO EMERGENCY”. Message charges may apply. It does not contact emergency services.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={busy} onClick={send}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Send labelled drill</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}