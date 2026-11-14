# Existing-app upgrade
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
- Saved guidance works while the app remains open offline; a fresh offline launch is not supported.
- FOX natural-language AI explanations were not independently tested; deterministic actions and source context were verified.
