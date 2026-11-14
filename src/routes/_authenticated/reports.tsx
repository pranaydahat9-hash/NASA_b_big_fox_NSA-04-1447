import { createFileRoute, Link } from "@tanstack/react-router";
import { Panel } from "@/components/app/bits";
export const Route = createFileRoute("/_authenticated/reports")({
  validateSearch: (s: Record<string, unknown>) => s as { make?: number; lat?: number; lon?: number; name?: string },
  head: () => ({ meta: [{ title: "Reports — FOX" }, { name: "description", content: "FOX reports page" }, { property: "og:title", content: "Reports — FOX" }, { property: "og:description", content: "FOX reports page" }] }),
  component: () => (
    <Panel title="Reports">
      <p className="text-sm text-muted-foreground">This page is being built next. Use the <Link to="/map" className="text-primary underline">map</Link> or FOX in the meantime.</p>
    </Panel>
  ),
});
