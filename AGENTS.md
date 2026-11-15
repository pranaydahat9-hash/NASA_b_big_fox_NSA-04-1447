<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application upgrade rules
- Keep authenticated pages in a viewport-height flex shell with a scrolling main area and an in-flow bottom navigation, so navigation never obscures page content.
- Execute common B fox commands locally and validate AI actions against allowlists; emergency-information queries must not dispatch SOS.
- Treat only provider `delivered` as confirmed SMS delivery; refresh statuses through owner-scoped SOS event IDs, never arbitrary provider IDs.
- Parse and validate FIRMS CSV headers before accepting fire data; unavailable satellite coverage must not be presented as zero detections.
- Do not bulk-download standard OpenStreetMap tiles; only mark an area complete after every permitted tile is cached.
- Keep incident confirmations private and explicitly distinguish owner observations from independent verification.
- Drill contact messages use the SOS owner-scoped delivery history but must carry a server-generated DRILL prefix and never claim an actual emergency; practice alerts never automatically send SMS.
- Fetch news from a fixed NASA feed server-side, validate source links, and display publication dates so news is not mistaken for a local emergency warning.
- Offline emergency help is a public self-contained kit, with contacts saved only by explicit consent; never cache authenticated responses or imply radio/mesh delivery from a browser.
- Generate the app-shell worker with vite-plugin-pwa and register only through one preview-guarded wrapper; cache public help, not private navigations, and use NetworkFirst navigation fallback.
- Nearby Community is a transport-free design preview: local drafts remain in memory, no fake peers or receipts, and radio actions stay disabled until a native transport exists.
- Keep PDF preparation independent of tile caching and offer a ready-file click for delivery; theme and offline-provider restrictions must not block PDFs or lose mobile user activation.
- Version map query keys when response contracts change and render missing availability as unknown; existing in-memory responses must remain safe during live updates.
