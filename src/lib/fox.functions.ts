import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FoxMsg = { role: "user" | "assistant"; content: string };
export type FoxAction = { name: string; args: Record<string, string | number | boolean | null> };

const tools = [
  { type: "function" as const, name: "navigate", description: "Open an app page.", parameters: { type: "object", properties: { page: { type: "string", enum: ["dashboard", "map", "sos", "prevent", "reports", "settings", "offline", "trends"] } }, required: ["page"], additionalProperties: false } },
  { type: "function" as const, name: "set_setting", description: "Change an app setting.", parameters: { type: "object", properties: { key: { type: "string", enum: ["theme", "language", "fontScale", "reduceMotion", "highContrast", "voiceReplies", "alarmSound", "clicks", "notifyLow", "notifyMedium", "notifyHigh", "handsFree"] }, value: { type: "string", description: "theme: abyss|light|blossom|system; language: en|hi|mr; fontScale: 0.9-1.4; booleans: true|false" } }, required: ["key", "value"], additionalProperties: false } },
  { type: "function" as const, name: "search_map", description: "Search a place on the map and run a hazard assessment for it (e.g. Mumbai).", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } },
  { type: "function" as const, name: "open_saved_location", description: "Show one of the user's saved locations on the map.", parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } },
  { type: "function" as const, name: "show_safe_zones", description: "Show nearest safe zones / shelters / hospitals and route to the nearest.", parameters: { type: "object", properties: {}, additionalProperties: false } },
  { type: "function" as const, name: "trigger_sos", description: "Immediately send an SOS with live location to emergency contacts. Use when user asks for help or is in danger.", parameters: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"], additionalProperties: false } },
  { type: "function" as const, name: "add_contact", description: "Add an emergency contact.", parameters: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" }, relation: { type: "string" } }, required: ["name", "phone"], additionalProperties: false } },
  { type: "function" as const, name: "download_report", description: "Generate a PDF disaster report for the current/selected area.", parameters: { type: "object", properties: {}, additionalProperties: false } },
];

export const askFox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: FoxMsg[]; context: string; language: string }) => ({
    messages: (d.messages ?? []).slice(-16).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 2000) }) as FoxMsg),
    context: String(d.context ?? "").slice(0, 6000),
    language: ["en", "hi", "mr"].includes(d.language) ? d.language : "en",
  }))
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const lang = { en: "English", hi: "Hindi (Devanagari)", mr: "Marathi (Devanagari)" }[data.language];
    const instructions = `You are B fox, the voice + text agent inside a disaster-management app (NASA Space Apps). You CONTROL the app through tools — prefer taking real actions over describing them. Reply in ${lang}, short (1-3 sentences, it is spoken aloud), calm and practical. If the user is in danger or says help/SOS/bachao/madat, call trigger_sos immediately. When asked about a place's risk, call search_map. To explain graphs or data, use ONLY the numbers in the app context below and cite their source; never invent data. App context:\n${data.context}`;
    try {
      const res: any = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions,
        input: data.messages.map((m) => ({ role: m.role, content: m.content })),
        tools,
      } as any);
      const actions: FoxAction[] = [];
      let text = "";
      for (const item of res.output ?? []) {
        if (item.type === "function_call") {
          let args = {};
          try { args = JSON.parse(item.arguments || "{}"); } catch {}
          actions.push({ name: item.name, args });
        } else if (item.type === "message") {
          for (const c of item.content ?? []) if (c.type === "output_text") text += c.text;
        }
      }
      return { reply: text.trim(), actions, error: null as string | null };
    } catch (e) {
      if (e instanceof GatewayError) {
        console.error("B fox gateway error", e.code, e.httpStatus);
        const msg = e.httpStatus === 402 ? "AI credits are exhausted for this workspace." : e.httpStatus === 429 ? "B fox is busy — please try again in a moment." : "B fox could not reach the AI service.";
        return { reply: "", actions: [], error: msg };
      }
      throw e;
    }
  });
