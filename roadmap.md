# Existing-app upgrade
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
