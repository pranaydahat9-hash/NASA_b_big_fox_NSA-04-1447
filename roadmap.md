# Existing-app upgrade
## Android handoff plan
- [x] Write a Kotlin/Android Studio plan for Nearby Connections screens, B fox account access, owner-only SOS history, security, real-device acceptance tests, and a draft Play Store listing.
- [x] Check official Nearby Connections guidance and current Play submission requirements; distinguish the proposed native app from the existing web preview.

## Map APIs and theme-independent PDFs
- [x] Sweep every PDF entry point: Map preparation/delivery and Reports generation/saved downloads use the shared theme-independent delivery helper; Reports previews revoke old URLs. Trends no longer downloads after asynchronous preparation; a ready-file click delivers it. Offline saved reports now have an explicit download alongside existing preview. FOX download requests navigate to Reports; Settings links to Offline and exports JSON, not PDF. The shared PDF builder/storage and server data providers have no theme gate; public emergency help, background work and database functions contain no PDF delivery. Existing saved blobs and permissions are unchanged.
- [x] Guard all three map availability readers and version the feed query key; older cached responses show unknown status rather than assuming availability or crashing. Verified injected old response, five real PDF flows in pink, and ten focused tests; no runtime errors.
- [x] Separate safe-zone PDFs from offline map tiles; downloaded valid PDFs in dark blue, light, pink and system themes without tile downloads.
- [x] Show existing map API sources, refresh and unavailable states; bound map-image requests to 5 seconds and external API requests to 15 seconds.
- [x] Verify signed-in mobile downloads, desktop map rendering, no mobile overflow or runtime errors; 12 focused tests pass. PDF preparation took 0.4–1.2 seconds after area data loaded. FIRMS remains blocked by the missing MAP_KEY; safe-zone service returned a busy notice rather than invented locations.

## Nearby Community design
- [x] Add a distinct community section and navigation without removing existing screens.
- [x] Design nearby peers, community chat and alert drafts with explicit native-app-only connection status.
- [x] Verify signed-in mobile/desktop views, local draft creation/deletion and alert levels; discovery, sending and broadcasting remain disabled, without simulated peers or delivery.

## Help without internet
- [x] Add a no-sign-in emergency kit with device SMS/calls, explicit offline-contact consent, GPS and local sound/visible signals.
- [x] Cache only the public emergency kit and assets using preview-safe PWA support; previews have zero worker registrations.
- [x] Verify offline reload in an isolated production-worker simulation, SMS drafts containing GPS, contact removal, sound stop and HELP signal on mobile/desktop; 21 focused tests pass.
- [ ] Verify offline reopening on the published URL after this release is published; the current published version does not contain the kit yet. Phone carrier SMS/call delivery and speaker range cannot be verified in a browser test.

## Emergency options, news and drills
- [x] Add India emergency-service choices and direct SOS access.
- [x] Run red-alert drills with an alarm and explicit optional contact-message confirmation.
- [x] Show current NASA news with glacier filtering, dates and source links; no glacier stories in the current feed is labelled explicitly.
- [x] Test drill safety and verify signed-in mobile/desktop choices, cancelled message confirmation, zero automatic drill sends, and FOX practice commands.

- [x] Preserve existing screens and blue theme; add system mode and accessibility refinements.
- [x] Validate FOX actions; local text commands navigate, search, open saved places and change settings; FOX available on every page.
- [x] Connect Twilio, add owner-scoped delivery refresh and retain manual SOS fallback.
- [x] Validate NASA fire responses and add an interactive FIRMS graph with explicit missing-source notices.
- [x] Improve offline integrity, storage display and private observation confirmations.
- [x] Pass 27 focused tests, signed-in mobile/desktop pages and actual FOX SOS activation/history/manual-link flow.
- [ ] Automatic SMS delivery: blocked by the connected Twilio account having no SMS-capable sending number; no SMS delivery could be tested.
- [ ] Live FIRMS readings: blocked by missing NASA FIRMS MAP_KEY; NASA authenticates this API through a URL path, not the generic connector's supported header/query methods.
- [ ] Additional languages: English, Hindi and Marathi navigation/voice remain supported; full page translation and other languages require a defined language list and reviewed emergency translations.

## Verification limits
- Browser microphone and speech output require a compatible browser and permission; physical voice recognition was not exercised.
- Incident confirmations remain private owner observations, not independently verified reports.
- Public emergency kit supports offline reopening after preparation on the published app; authenticated app screens still need internet. Editor previews intentionally do not cache an app shell.
- FOX natural-language AI explanations were not independently tested; deterministic actions and source context were verified.
