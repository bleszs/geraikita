# Railway voice disclosure design check

Date: 2026-10-18. Result: the scoped correction fits the incumbent design system; no canon refresh is required.

## Scope and authority

Read `reference/document.md`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/briefs/railway-voice-copy.md` and the fresh `RAILWAY_VOICE_UI_REVIEW.md` ship verdict. This is a narrow Operate extension for the authorized Railway deployment. Historical localhost-only product statements do not describe a hosted speech service; the disclosure now works in either environment. This handoff records the correction without replacing the existing visual world or migrating product history.

The inspected correction is limited to the voice-panel disclosure and working message in `public/live-views.js`, the stop-recording guide step in `public/guide-content.js`, the available-service reason in `server/transcriber.mjs`, and cache version `gerai-kita-shell-v43-railway` in `public/sw.js`. Speech is sent to the application's service for transcription, and the recording is not saved by the inspected application path. This is an application-level statement, not an infrastructure retention audit. Recording consent, editable transcript review, explicit use/discard actions and separate transaction confirmation remain intact. No latency or accuracy promise is added.

## Design fit and evidence

The existing Neighborhood Kedai world remains authoritative: cream and terracotta in light mode, warm brown and peach assignments in dark mode, local Nunito, flat bordered work panels, explicit Indonesian labels and visible focus. The copy change introduces no new token, font, component, imagery, layout or motion rule. It therefore requires neither a new `DESIGN.md` extraction nor a sidecar regeneration.

The fresh UI review inspected the four authoritative settled full-page captures at original detail and returned **ship**:

| Capture | Viewport and theme | Full-page size |
| --- | --- | --- |
| `.impeccable/review/voice-idle-desktop.png` | 1440 x 1000, light | 1440 x 1197 |
| `.impeccable/review/voice-idle-mobile-dark.png` | 320 x 900, dark | 320 x 1333 |
| `.impeccable/review/voice-review-desktop.png` | 1440 x 1000, light | 1440 x 1411 |
| `.impeccable/review/voice-review-mobile.png` | 320 x 900, dark | 320 x 1622 |

That review establishes readable disclosure placement before recording/transcript controls, preserved hierarchy and no clipping or horizontal overflow in the inspected states. The disclosure wraps to two lines on desktop and four at 320px. Transcript editing and use/discard controls remain distinct from customer notes and order preparation. Working-state and guide wording were checked in source rather than separately rendered. These captures use isolated localhost memory fixtures and establish no real or cloud database population. This documenter relies on that fresh visual review and performed no new browser run or capture.

## Existing drift

The existing `data/railway-voice-detector.json` contains 113 findings: one cream-palette warning and 112 inherited advisories (99 font-size, one radius, 12 color). Cream is explicitly pinned by the brief and canon. The advisories record existing implementation/canon differences; they are not introduced by the disclosure replacement. No detector rerun or drift repair is appropriate within this copy-only scope. Product history also retains older localhost-only wording; it is reported here without rewriting the product canon.

## Preservation and verification limits

Verified the preserved SHA-256 values:

- `DESIGN.md`: `769EC61803FCBC4BBAAD840A21DF02C1FCEB8996F7894891DFD5637C04491C04`
- `.impeccable/design.json`: `C31FBFCB60AB61B3B4152B3A87E8B22CA5E1ABF008039EA8DC469584C742B51F`

The supplied initial full-suite result is 270 Node plus 54 browser tests (324 passes, exit 0). The final full suite subsequently completed normally in session 2309 with exit 0: `data/railway-npm-test-final.log` records 270 Node passes with zero failures and 54 browser tests passed (5.2 minutes), for 324 total passes. This records completed local verification; it does not establish production readiness. No additional tests, detector, captures, source changes or canon changes were performed by this handoff. Only this report was written.

This design check approves the disclosure's fit with the existing interface. It does not certify production hosting, all AI services, resource readiness, speech accuracy, microphone performance or production release readiness.
