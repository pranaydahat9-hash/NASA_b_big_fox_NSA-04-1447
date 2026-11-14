import { createFileRoute, Link } from "@tanstack/react-router";
import { Panel } from "@/components/app/bits";
export const Route = createFileRoute("/_authenticated/settings")({
  
  head: () => ({ meta: [{ title: "Settings — FOX" }, { name: "description", content: "FOX settings page" }, { property: "og:title", content: "Settings — FOX" }, { property: "og:description", content: "FOX settings page" }] }),
  component: () => (
    <Panel title="Settings">
      <p className="text-sm text-muted-foreground">This page is being built next. Use the <Link to="/map" className="text-primary underline">map</Link> or FOX in the meantime.</p>
    </Panel>
  ),
});
