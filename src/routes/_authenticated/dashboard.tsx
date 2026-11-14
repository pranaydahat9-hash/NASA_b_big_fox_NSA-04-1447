import { createFileRoute, Link } from "@tanstack/react-router";
import { Panel } from "@/components/app/bits";
export const Route = createFileRoute("/_authenticated/dashboard")({
  
  head: () => ({ meta: [{ title: "Dashboard — FOX" }, { name: "description", content: "FOX dashboard page" }, { property: "og:title", content: "Dashboard — FOX" }, { property: "og:description", content: "FOX dashboard page" }] }),
  component: () => (
    <Panel title="Dashboard">
      <p className="text-sm text-muted-foreground">This page is being built next. Use the <Link to="/map" className="text-primary underline">map</Link> or FOX in the meantime.</p>
    </Panel>
  ),
});
