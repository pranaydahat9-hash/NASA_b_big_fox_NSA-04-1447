# B fox Android app — implementation and release plan

## Deliverable and boundaries
Build a separate native Android app in Android Studio using Kotlin, Jetpack Compose and Google Nearby Connections. Link it to the existing B fox accounts, contacts and private SOS history in Lovable Cloud. Preserve the existing web app and its features; do not enable its currently disabled nearby controls until actual native transport exists.

This document is a developer handoff, not an APK, finished app or Play Store submission. No account settings or live services are changed by this plan. Proposed defaults below are implementation targets, not measured capabilities.

The native first release delivers nearby communities, text/alert sharing, sign-in, SOS, private history, offline help and settings. Retain access to the existing web maps, satellite reports, trends and prevention pages through clearly labelled online links until native equivalents are implemented. Do not promise complete native feature parity in the first listing.

## 1. Phone experience and screens
Use the existing logo and friendly design, Plus Jakarta Sans, blue default with light/pink/system options. Low = green, medium = yellow, high = red; include written severity and icons so colour is never the only signal. Provide English, Hindi and Marathi resources with reviewed emergency translations. Respect system text sizing, TalkBack and reduced motion. Keep the bottom menu in flow, never over content.

Bottom tabs: Home, Nearby, SOS, History, Settings.

| Screen | Content and working actions | Required states |
|---|---|---|
| First launch | B fox name/logo; sign in or use offline help; explanation of nearby permissions | No sign-in required for nearby guest mode or basic help |
| Sign-in | Existing email/password account; create account, confirm email, reset password; Google/Lovable options only after native authorization is verified | Loading, cancelled, invalid credentials, confirmation pending, offline, expired session |
| Home | Internet status, nearby connection status, SOS shortcut, dated last sync, links to existing online tools | Clearly separate online services from nearby radio availability |
| Nearby identity | Consented alias, device nickname, optional community name | Not visible until user starts discovery/advertising; alias is not verified account identity |
| Nearby discovery | Find nearby; create community; real discovered devices; stop scanning | Permissions denied, radios disabled, Play services unavailable, scanning, no devices, endpoint lost |
| Pairing | Both phones show the Nearby authentication digits; Accept/Reject | Both users compare digits in person; timeout/mismatch rejects; no automatic acceptance |
| Community room | Member list, connection status, text composer, leave/block, per-recipient receipts | Pending, received on device, failed, disconnected; no invented peers |
| Alert composer/detail | Severity, observation text, optional consented location, observed time, expiry, selected recipients | Owner observation / not agency warning; drill visibly marked; expired and partially received states |
| SOS | Hold to activate; contacts, GPS accuracy/time; call 112, SMS draft, nearby help request | Fresh/last-known/missing location; online send unavailable; real delivery states |
| Private history | Account-owned SOS/drills list, event detail and receipt refresh; explicit offline-copy consent | Empty, loading, offline cache dated, expired session, forbidden/not found |
| Offline help | Saved contacts with consent, GPS SMS draft, HELP sign, stoppable distress sound | Explain that calls/SMS need carrier signal and nearby sharing needs participating devices |
| Settings | Account, themes/language/accessibility, contacts, permissions, storage, privacy, sign-out/delete | Explicit consent removal and local-data erase; no silent contact-book import |

Create community starts a user-controlled local session; joiners discover the host and compare codes. It does not create a globally searchable online group. Opening SOS from a chat does not send anything. Nearby alerts do not automatically trigger a recipient's SOS or SMS.

## 2. Nearby Connections behavior
Use `ConnectionsClient` with `Strategy.P2P_CLUSTER`, a stable application service ID, `ConnectionLifecycleCallback`, `EndpointDiscoveryCallback` and `PayloadCallback`. Google supports M-to-N connections; this is not automatic mesh routing. Both endpoints must accept, and Google explicitly recommends token comparison. [1](https://developers.google.com/nearby/connections/android/manage-connections) [2](https://developers.google.com/android/reference/com/google/android/gms/nearby/connection/Strategy)

Implement this state machine:
```text
Idle -> Permissions -> Discovering/Advertising -> Pairing -> Connected
                         |                         |           |
                         +-> Stopped/Error         +-> Rejected+-> Disconnected
```

- Only scan/advertise after an explicit action. Use an alias and random session ID, never email, phone number, account UUID or GPS in advertisements.
- Show discovered endpoints only while actually present. Offer user-selected connections; reject blocked devices and mismatched verification codes.
- First-release community host connects to members and forwards messages only within that approved session. Disclose host visibility of relayed text; Nearby encrypts each link, not host-blind end-to-end group messages. Do not claim E2E group encryption.
- Stop discovery after a proposed 60-second window, with a visible retry. Proposed initial cap: 8 connected members and 1,000 characters per message; validate this on real devices before retaining the limits.
- On disconnect retain consented pending drafts, not a fake sent state. Retry on a newly verified connection; expire alerts by their TTL. Never call `sendPayload` success “received.”
- First release: no unattended multi-hop mesh, no automatic forwarding between communities, no internet gateway, no anonymous rescue network. Later relaying needs separate threat modelling, consent, expiry, signatures and field trials.
- Nearby may work without internet using Bluetooth/Wi-Fi, but requires supported Play services, permissions and active radios. No fixed range, delivery time, responder availability or emergency rescue guarantee.

## 3. Message protocol and storage
Use Kotlin serialization and small BYTES payloads. Version each envelope with: protocol version, message UUID, community-session UUID, sender-session UUID, type (`text`, `alert`, `drill`, `ack`), body, severity where applicable, observed/sent time, TTL, optional location/accuracy, and recipient list. These are local identities, not proof of B fox account ownership.

Validate UTF-8 size, length, type, severity, coordinates, timestamps and protocol version before storing. Proposed maximum envelope 8 KiB; reject oversized/unknown payloads and rate-limit peers. Deduplicate by sender-session + message UUID. Treat remote text as text, never executable commands or assistant instructions.

After a recipient persists the message, it sends a matching ACK over the verified connection. Render per-recipient “Received on device” only after that ACK. Read receipts are optional explicit actions; neither receipt means help is coming. Host relays must retain sender identity and label the relay, not impersonate the originator.

Use Room for messages/outbox and DataStore for non-sensitive settings. Keep drafts in memory by default; durable offline conversations and history require separate consent. Encrypt sensitive local records with Android Keystore-backed keys, exclude tokens/history/contacts from backup, and partition records by account or guest session. Retention default proposal: delete nearby conversations after 7 days, alerts expire after 30 minutes; expose settings and immediate erase. Enforce expiry even when device clocks differ, and label remote times as device-reported.

## 4. B fox sign-in and account linking
Use the same existing account identity, not a duplicate native user database. Online sign-in is needed to fetch contacts/history; nearby guest mode remains available without it. Offline cached identity cannot establish a fresh sign-in or authorize Cloud writes.

Implement a provider-supported native authorization flow: system browser/Custom Tabs, authorization code + PKCE S256, random state, verified HTTPS Android App Link callback, and managed OAuth client registration. Never embed a confidential client secret, use a WebView login, copy browser tokens, or send tokens in callback URLs. Store refresh credentials encrypted using Keystore; serialize refresh and revoke/clear on sign-out.

Prerequisites: confirm managed OAuth supports public native clients and PKCE; register release/debug callbacks and signing certificates; configure the consent return through existing email/Google/Lovable sign-in. The current web sign-in redirects to Dashboard and must preserve the consent destination before this flow will work. Provider presence in source is not evidence of hosted provider settings. If native OAuth cannot be supported, stop account-link release rather than inventing a token bridge.

Identity scopes do not grant app-data access. Use the user's resulting supported Cloud credentials for owner-scoped data access only after integration testing. For asymmetric verification, confirm the active signing algorithm from a fresh token, not merely a populated key list; alternatively use managed online token validation. Never bundle administrative keys or SMS/NASA credentials.

## 5. Private SOS history and server integration
Existing records: `profiles`, `emergency_contacts`, `saved_locations`, `sos_events`; history already stores ID, owner ID, activation time, coordinates, accuracy, message, trigger and delivery JSON. Nearby chat is separate and must not expose these tables to peers.

- Fetch history through the Cloud Data API with user authorization and enforced owner-only policies. Paginate newest first using time + ID; details and refresh are also owner-scoped. Server derives ownership from the verified identity, never a submitted user ID.
- Audit existing grants and policies before native release. Test account A cannot list/read/update/delete account B events, even with known UUIDs. No anonymous history, shared cache, public export link or unrestricted provider-ID lookup.
- A physical Android client must not call TanStack's internal serialized server-function URLs. Plan stable versioned JSON action handlers under `/api/public/native/v1/` for SOS activation, drill activation, status refresh and deletion. This prefix bypasses site authentication: each handler must independently verify the caller and authorization. Return opaque event IDs and safe status summaries only, not contact names/numbers, coordinates, message bodies or other PII; fetch private details through the owner-protected Data API.
- Refactor shared server-only SOS business logic so web functions and native handlers use the same validation and provider service. Ordinary data access uses the user's authorization; reserve privileged deletion for a reauthenticated owner. No new Edge Functions or Node-only server dependencies.
- Add a durable owner-scoped idempotency record through a reviewed migration before sending SMS. Persist the activation intent before dispatch, track attempts and provider outcome, and reconcile uncertain outcomes without blind resend. Existing send-then-save behavior is insufficient for native retries. Return event ID even if delivery is unavailable; never claim successful history persistence after a failed save.
- SMS status `delivered` alone confirms provider delivery. `accepted`, `queued`, `sending` and `sent` are not confirmed delivery. Refresh by owner-scoped SOS event ID, not client-provided provider ID. Mask contact numbers in lists.
- Offline SOS offers separate nearby request, dialer and SMS composer actions. Use `ACTION_DIAL` and `ACTION_SENDTO` so the user controls sending; avoid restricted `SEND_SMS`, call-log and background-location permissions. Do not queue an actual SOS for silent sending hours later. Reconnection presents a fresh confirmation with the original timestamp.
- Server creates the DRILL prefix and ignores emergency-looking drill notes. Running a practice alarm never sends SMS; contact practice requires separate confirmation. Recipient nearby observations remain unverified; no automatic dispatch from informational emergency questions.
- History and contacts never accompany a nearby broadcast. Location sharing is separately consented. Clear cached private records on sign-out/account switch and revoke offline consent; warn copies already received by peers cannot be remotely erased.

## 6. Technical implementation and Android permissions
Use Kotlin, Compose/Material 3, Navigation Compose, coroutines/StateFlow, Hilt, Room, DataStore, Kotlin serialization, OkHttp/Retrofit, Nearby Play services, Fused Location Provider and WorkManager. Wrap transport/auth/location behind interfaces for testing. WorkManager handles consented sync, not continuous radio discovery or delayed SOS sending.

Organize Android packages into `core/{auth,network,security,storage}`, `nearby/{transport,protocol,repository}`, and `feature/{home,signin,community,sos,history,settings,help}`. Keep UI, transport events and Cloud repositories separate. One explicit user-started nearby service owns connection callbacks; cancel tasks and disconnect safely on stop.

Proposed minimum Android 8/API 26; target Android 16/API 36 or higher per current Play requirements. Pin compatible stable dependencies at implementation time, not guessed versions. Phones without supported Google Play services get a clear unavailable state and retain offline help. [3](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)

Follow Google's version-specific permission matrix: older Bluetooth/location/Wi-Fi permissions with SDK limits; Android 12+ Bluetooth scan/connect/advertise; Android 13+ nearby Wi-Fi where required. GPS permission is independent and requested only for location actions. Check actual dependency guidance before declaring `neverForLocation`. Nearby refuses discovery/advertising without its required permissions. [4](https://developers.google.com/nearby/connections/android/get-started)

Request notifications only for opted-in alerts. A user-started continuing nearby session needs the appropriate foreground-service type/permissions and a visible Stop notification; verify current Android background-start rules. Do not promise discovery when force-stopped or radios are off. Explain denial and offer settings without repeatedly nagging. No microphone permission until an explicitly enabled, independently tested voice feature exists.

## 7. Build phases and acceptance gates
1. **Foundation:** Android Studio project, signing separation, design/localization, offline help and permission-denial states.
2. **Nearby transport:** two physical devices; discover, compare codes, connect, send text, persist ACK, block, leave and recover from disconnect. Test with internet disconnected but radios on, including three-device host/member relay.
3. **Accounts:** managed native OAuth, existing-account identity match, confirm/reset flows, cancellation, token expiry, App Link hijack/state mismatch and logout/cache erasure tests.
4. **Private history/SOS:** two-account isolation, pagination, consented cache, actual event read-back across web/native, idempotent retry, server drill safety and owner-only refresh. Use controlled consenting recipients; never test by calling emergency services.
5. **Hardening/release:** accessibility, translations, battery/background behavior, data-deletion path, privacy review and Play closed testing.

Unit tests cover malformed/oversized payloads, duplicates, TTL, invalid coordinates, ACK matching, severity and drill rules. Instrumentation covers process death, denied permissions, cancelled sign-in and large text. Physical tests cover multiple Android versions/manufacturers, host loss, partial receipts, weak radio conditions, notification denial and no carrier signal. Emulators alone cannot prove Nearby delivery.

Known integration blockers to recheck: SMS-capable Twilio sender and actual delivery, missing NASA FIRMS key, native OAuth readiness, current data policies, Play developer account and signing ownership. Do not mark these complete based on source code. A developer must produce an installable test APK and signed release AAB outside this web workspace.

## 8. Draft Play Store listing
Use only after these features pass acceptance tests; remove any undelivered feature before submission.

**App name:** B fox

**Short description:** Nearby messages, offline help and private SOS history for disaster readiness.

**Full description:**

B fox helps you prepare for emergencies and share information with people nearby.

Connect participating Android phones using Bluetooth and local Wi-Fi, even when internet access is unavailable. Compare the connection code on both phones before joining. Exchange text messages and low, medium or high alert observations within your connected community. See which recipient devices have acknowledged a message.

Sign in to your existing B fox account to access your emergency contacts and private SOS history when online. Choose whether to keep an encrypted offline copy on your phone. Share a nearby help request, open a location-aware SMS draft or use the phone dialer. Saved offline help includes a HELP sign and a stoppable distress sound.

Choose blue, light or pink themes and supported English, Hindi or Marathi text. Access B fox's existing satellite maps, prevention information and reports through online links.

Important: both phones need B fox, supported Google Play services, permissions and active Bluetooth/Wi-Fi. Range and delivery depend on devices and surroundings. Nearby observations are not official warnings. Device receipts do not mean rescue is on the way. Calls and SMS require mobile service; account services require internet. B fox is not an emergency service and cannot guarantee delivery or rescue. Contact local emergency services when possible. B fox is independently developed and is not endorsed by NASA.

**Suggested category:** Tools, subject to Play Console review. Audience: general users; complete the actual content-rating and target-audience forms rather than inventing a rating. Pricing and ads: owner decision, not assumed.

**Listing assets:** existing approved logo as a 512×512 store icon, 1024×500 feature graphic, and real phone screenshots of discovery/code check, conversation receipts, alert detail, SOS choices and private history. No fake peers, fabricated warnings, misleading “rescue confirmed” image or unsupported NASA branding. Verify logo rights.

**Required owner details:** real support email, public privacy-policy URL, publisher/legal identity, account-deletion web URL, release signing ownership and Play Console account. None are invented here.

**Release checklist:** signed AAB/Play App Signing; current API compliance; Data safety reflecting account/location/contact/message handling and SDK behavior; in-app and web account deletion; permission/foreground-service declarations; reviewer account with synthetic data; privacy policy including peer copies and retention. Avoid SMS/call-log permissions. No claim of safety certification.

For personal developer accounts created after November 13, 2023, Google's current rule requires at least 12 testers opted into a closed test continuously for 14 days before applying for production access; approval is not automatic. Recheck policies when submitting. [5](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)

## Approval outcome
Approving this plan approves the implementation scope, not a working native app or publication. Android development, device testing, provider setup and Play submission remain separate execution work. The existing B fox website stays unchanged by this planning request.