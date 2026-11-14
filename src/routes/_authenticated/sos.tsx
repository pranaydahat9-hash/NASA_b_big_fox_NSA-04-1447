import { createFileRoute, Link } from "@tanstack/react-router";
import { Panel } from "@/components/app/bits";
export const Route = createFileRoute("/_authenticated/sos")({
  
  head: () => ({ meta: [{ title: "Sos — FOX" }, { name: "description", content: "FOX sos page" }, { property: "og:title", content: "Sos — FOX" }, { property: "og:description", content: "FOX sos page" }] }),
  component: () => (
    <Panel title="Sos">
      <p className="text-sm text-muted-foreground">This page is being built next. Use the <Link to="/map" className="text-primary underline">map</Link> or FOX in the meantime.</p>
    </Panel>
  ),
});
