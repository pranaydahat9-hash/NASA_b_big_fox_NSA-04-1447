import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FoxMark } from "@/components/app/FoxMark";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — FOX Disaster Watch" }, { name: "description", content: "Sign in to FOX to save emergency contacts, places and reports." },
    { property: "og:title", content: "Sign in — FOX Disaster Watch" }, { property: "og:description", content: "Sign in to FOX to save emergency contacts, places and reports." },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) nav({ to: "/dashboard" }); }); }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) toast.error(error.message); else nav({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin + "/dashboard" } });
      if (error) toast.error(error.message); else setSent(true);
    }
    setBusy(false);
  };
  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(String(r.error.message ?? r.error)); else if (!r.redirected) nav({ to: "/dashboard" });
  };

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center px-5">
      <div className="glass w-full max-w-sm rounded-3xl p-6 animate-float-up">
        <div className="mb-6 flex items-center gap-3"><FoxMark className="h-10 w-10" /><div><h1 className="text-2xl font-bold">FOX</h1><p className="text-xs text-muted-foreground">Satellite disaster watch</p></div></div>
        {sent ? (
          <p className="text-sm">Check <b>{email}</b> for a confirmation link, then come back and sign in.</p>
        ) : (
          <>
            <button onClick={google} className="haptic mb-4 flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#747775] bg-[#FFFFFF] text-sm font-medium text-[#1F1F1F]">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
              Continue with Google
            </button>
            <div className="my-3 text-center text-xs text-muted-foreground">or with email</div>
            <form onSubmit={submit} className="space-y-3">
              <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input type="password" required minLength={6} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
              <Button variant="neon" className="h-11 w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
            </form>
            <button className="mt-4 w-full text-center text-xs text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
