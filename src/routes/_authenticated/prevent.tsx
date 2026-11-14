import { createFileRoute, Link } from "@tanstack/react-router";
import { Panel } from "@/components/app/bits";
export const Route = createFileRoute("/_authenticated/prevent")({
  
  head: () => ({ meta: [{ title: "Prevent — FOX" }, { name: "description", content: "FOX prevent page" }, { property: "og:title", content: "Prevent — FOX" }, { property: "og:description", content: "FOX prevent page" }] }),
  component: () => (
    <Panel title="Prevent">
      <p className="text-sm text-muted-foreground">This page is being built next. Use the <Link to="/map" className="text-primary underline">map</Link> or FOX in the meantime.</p>
    </Panel>
  ),
});
