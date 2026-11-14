import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SosInput = { lat: number | null; lon: number | null; accuracy: number | null; trigger: string; note?: string; locationAt?: string; stale?: boolean };

export const sendSos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SosInput) => ({
    lat: d.lat == null ? null : Number(d.lat), lon: d.lon == null ? null : Number(d.lon),
    accuracy: d.accuracy == null ? null : Number(d.accuracy),
    trigger: String(d.trigger ?? "button").slice(0, 30), note: String(d.note ?? "").slice(0, 200),
    locationAt: d.locationAt ? String(d.locationAt).slice(0, 40) : null, stale: !!d.stale,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if ((data.lat != null && (!Number.isFinite(data.lat) || Math.abs(data.lat) > 90)) || (data.lon != null && (!Number.isFinite(data.lon) || Math.abs(data.lon) > 180)) || (data.lat == null) !== (data.lon == null)) throw new Error("Invalid SOS coordinates");
    const [contactsResult, profileResult] = await Promise.all([
      supabase.from("emergency_contacts").select("name, phone").eq("user_id", userId),
      supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    ]);
    if (contactsResult.error) throw new Error("Could not read emergency contacts — use manual send");
    const contacts = contactsResult.data, profile = profileResult.data;
    const who = profile?.display_name ?? "A FOX user";
    const loc = data.lat != null && data.lon != null ? `https://maps.google.com/?q=${data.lat.toFixed(6)},${data.lon.toFixed(6)} (±${Math.round(data.accuracy ?? 0)} m)` : "location unavailable";
    const message = `SOS from ${who}: I need help. ${data.stale ? "Last known location" : "Location at activation"}: ${loc}${data.locationAt ? ` (observed ${data.locationAt})` : ""}. ${data.note ? data.note + " " : ""}Sent via FOX at ${new Date().toUTCString()}`;
    const { sendSms } = await import("./sms.server");
    const deliveries = (contacts ?? []).length ? await sendSms(contacts ?? [], message) : [];
    const { data: ev, error: saveError } = await supabase.from("sos_events").insert({ user_id: userId, lat: data.lat, lon: data.lon, accuracy_m: data.accuracy, message, trigger: data.trigger, deliveries }).select("id, created_at").single();
    return { id: ev?.id ?? null, message, deliveries, contactCount: contacts?.length ?? 0, historyError: saveError ? "Sending attempted, but SOS history could not be saved." : null };
  });

export const sendAlertSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string }) => ({ text: String(d.text ?? "").slice(0, 600) }))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("phone").eq("id", context.userId).maybeSingle();
    if (!profile?.phone) return { deliveries: [], reason: "Add your own mobile number in Settings to receive SMS alerts." };
    const { sendSms } = await import("./sms.server");
    return { deliveries: await sendSms([{ name: "You", phone: profile.phone }], data.text), reason: null };
  });

export const getSmsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { smsAvailability } = await import("./sms.server");
    return smsAvailability();
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await Promise.all([
      supabase.from("emergency_contacts").delete().eq("user_id", userId),
      supabase.from("saved_locations").delete().eq("user_id", userId),
      supabase.from("sos_events").delete().eq("user_id", userId),
      supabase.from("community_reports").delete().eq("user_id", userId),
      supabase.from("report_verifications").delete().eq("user_id", userId),
    ]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Could not delete account: " + error.message);
    return { ok: true };
  });

export const refreshSosDelivery = createServerFn({ method: "POST" })
 .middleware([requireSupabaseAuth])
 .inputValidator((d: { id: string }) => { if (!/^[0-9a-f-]{36}$/i.test(d.id)) throw new Error("Invalid SOS event"); return d; })
 .handler(async ({data,context}) => {
  const {data:event,error} = await context.supabase.from("sos_events").select("deliveries").eq("id",data.id).eq("user_id",context.userId).single();
  if (error || !event) throw new Error("SOS event unavailable");
  const {refreshDelivery} = await import("./sms.server");
  const deliveries = await Promise.all((event.deliveries as unknown as import("./sms.server").Delivery[]).map(refreshDelivery));
  const {error:saveError} = await context.supabase.from("sos_events").update({deliveries}).eq("id",data.id).eq("user_id",context.userId);
  if (saveError) throw new Error("Could not update delivery history");
  return deliveries;
 });
