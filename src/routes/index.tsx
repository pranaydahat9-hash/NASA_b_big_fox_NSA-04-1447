import { createFileRoute, Link } from "@tanstack/react-router";
import { FoxMark } from "@/components/app/FoxMark";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "FOX — Satellite Disaster Watch" }, { name: "description", content: "Disaster predictions for any place from NASA, USGS and weather satellites, with SOS and a voice agent." }, { property: "og:title", content: "FOX — Satellite Disaster Watch" }, { property: "og:description", content: "Disaster predictions for any place from NASA, USGS and weather satellites." }] }),
  component: () => (
    <div className="grid-bg flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <FoxMark className="h-20 w-20" />
      <h1 className="text-4xl font-bold">Prevention beats <span className="text-gradient">response</span>.</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Live NASA, USGS and weather data turned into area-by-area disaster predictions, safe zones and one-tap SOS.</p>
      <Button asChild variant="neon" className="h-12 px-8"><Link to="/auth">Get started</Link></Button>
    </div>
  ),
});
