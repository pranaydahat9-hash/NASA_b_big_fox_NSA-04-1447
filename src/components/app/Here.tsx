import { Crosshair, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { requestLocation, useLastLocation } from "@/lib/location";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";

/** Current location (last known) + a button to refresh it with GPS. */
export function useHere() {
  const loc = useLastLocation();
  const [busy, setBusy] = useState(false);
  const locate = async () => {
    setBusy(true); haptic("tap");
    try { await requestLocation(); } catch (e) { toast.error("Location unavailable: " + (e as Error).message); }
    finally { setBusy(false); }
  };
  const button = (
    <Button size="sm" variant="outline" onClick={locate} disabled={busy} className="h-8 gap-1.5 text-xs">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
      {loc ? "Update location" : "Use my location"}
    </Button>
  );
  return { loc, locate, busy, button };
}
