export type Delivery = { name: string; phone: string; status: 'accepted' | 'sending' | 'sent' | 'queued' | 'delivered' | 'undelivered' | 'failed' | 'not_configured'; detail: string; at: string; sid?: string };
export function smsConfigured() { return !!(process.env['LOVABLE_API_KEY'] && process.env['TWILIO_API_KEY']); }
async function twilio(path: string, init?: RequestInit) {
 const r = await fetch(`https://connector-gateway.lovable.dev/twilio/${path}`, { ...init, headers: { Authorization: `Bearer ${process.env['LOVABLE_API_KEY']}`, 'X-Connection-Api-Key': process.env['TWILIO_API_KEY'] ?? '', ...init?.headers } });
 const body = await r.text();
 if (!r.ok) { console.error('Twilio failure', r.status, body); throw new Error(`SMS provider [${r.status}]: ${body}`); }
 return JSON.parse(body);
}
export async function smsAvailability() {
 if (!smsConfigured()) return { configured: false, reason: 'Twilio is not connected.' };
 if (process.env['TWILIO_FROM_NUMBER']) return { configured: true, reason: null };
 try { const j = await twilio('IncomingPhoneNumbers.json'); const from = j.incoming_phone_numbers?.find((n: { capabilities?: { sms?: boolean } }) => n.capabilities?.sms)?.phone_number;
 return { configured: !!from, reason: from ? null : 'Twilio is connected but needs an SMS-capable sending number.' }; }
 catch { return { configured: false, reason: 'The SMS service could not be checked. Use manual SMS or Call 112.' }; }
}
export async function sendSms(to: {name:string;phone:string}[], body:string): Promise<Delivery[]> {
 const at = new Date().toISOString();
 let from = process.env['TWILIO_FROM_NUMBER'];
 if (smsConfigured() && !from) { try { const j = await twilio('IncomingPhoneNumbers.json'); from = j.incoming_phone_numbers?.find((n: {capabilities?:{sms?:boolean}}) => n.capabilities?.sms)?.phone_number; } catch { /* handled below */ } }
 if (!smsConfigured() || !from) return to.map(c => ({...c,status:'not_configured',detail:'Twilio needs an SMS-capable sending number — use manual send',at}));
 return Promise.all(to.map(async c => {
  const phone = c.phone.replace(/[ ()-]/g,'');
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) return {...c,status:'failed' as const,detail:'A phone number with international country code is required',at};
  try { const j = await twilio('Messages.json',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({To:phone,From:from,Body:body})});
   const status = deliveryState(j.status);
   return {...c,status,detail:`Twilio: ${j.status ?? 'accepted'}`,sid:String(j.sid ?? ''),at};
  } catch(e) { return {...c,status:'failed' as const,detail:String(e),at}; }
 }));
}
export function deliveryState(value: unknown): Delivery['status'] {
 return ['accepted','sending','sent','queued','delivered','undelivered','failed'].includes(String(value)) ? String(value) as Delivery['status'] : 'queued';
}
export async function refreshDelivery(d: Delivery): Promise<Delivery> {
 if (!d.sid || !/^SM[a-fA-F0-9]{32}$/.test(d.sid) || ['delivered','failed','undelivered','not_configured'].includes(d.status)) return d;
 try { const j = await twilio(`Messages/${d.sid}.json`); return {...d,status:deliveryState(j.status),detail:j.error_message ?? `Twilio: ${j.status}`,at:new Date().toISOString()}; }
 catch { return d; }
}
