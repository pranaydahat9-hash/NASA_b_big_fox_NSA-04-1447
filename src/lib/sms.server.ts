export type Delivery = { name: string; phone: string; status: "sent" | "queued" | "failed" | "not_configured"; detail: string; at: string };

export function smsConfigured() {
  return !!(process.env["LOVABLE_API_KEY"] && process.env["TWILIO_API_KEY"] && process.env["TWILIO_FROM_NUMBER"]);
}

export async function sendSms(to: { name: string; phone: string }[], body: string): Promise<Delivery[]> {
  const at = new Date().toISOString();
  if (!smsConfigured()) {
    return to.map((c) => ({ ...c, status: "not_configured", detail: "SMS service (Twilio) not connected — use manual send", at }));
  }
  const headers = {
    Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
    "X-Connection-Api-Key": process.env["TWILIO_API_KEY"]!,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  return Promise.all(
    to.map(async (c) => {
      try {
        const r = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
          method: "POST",
          headers,
          body: new URLSearchParams({ To: c.phone, From: process.env["TWILIO_FROM_NUMBER"]!, Body: body }),
        });
        const j: any = await r.json().catch(() => ({}));
        if (!r.ok) return { ...c, status: "failed" as const, detail: `[${r.status}] ${j?.message ?? "provider error"}`, at };
        return { ...c, status: (j.status === "sent" ? "sent" : "queued") as Delivery["status"], detail: `Twilio ${j.status ?? "accepted"} (${j.sid ?? ""})`, at };
      } catch (e) {
        return { ...c, status: "failed" as const, detail: String(e), at };
      }
    }),
  );
}
