import { createFileRoute, Link } from "@tanstack/react-router";
import { Panel } from "@/components/app/bits";
export const Route = createFileRoute("/_authenticated/offline")({
  
  head: () => ({ meta: [{ title: "Offline — FOX" }, { name: "description", content: "FOX offline page" }, { property: "og:title", content: "Offline — FOX" }, { property: "og:description", content: "FOX offline page" }] }),
  component: () => (
    <Panel title="Offline">
      <p className="text-sm text-muted-foreground">This page is being built next. Use the <Link to="/map" className="text-primary underline">map</Link> or FOX in the meantime.</p>
    </Panel>
  ),
});
