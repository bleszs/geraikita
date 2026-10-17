# Railway voice disclosure UI review

Date: 2026-10-18. **disposition: ship**

This verdict covers the narrowly scoped voice processing copy correction and its integration into the existing order-entry interface. The authorized Railway deployment makes the former unconditional laptop-only wording inaccurate. The correction now describes the application's speech service in terms that work on localhost and a hosted server. This is an ordinary Operate extension under `.impeccable/briefs/railway-voice-copy.md`, with the incumbent cream/terracotta, local Nunito and warm dark system pinned.

## persistence

Read the brief, PRODUCT.md, DESIGN.md, `.impeccable/design.json`, the craft-floor reference and the finish contract in `reference/new-work.md`. PRODUCT.md contains historical localhost-only statements; the current deployment authorization and scoped brief provide the controlling context for this correction.

Inspected `public/live-views.js:63`, the voice guide steps at `public/guide-content.js:87`, the available-service reason at `server/transcriber.mjs:45`, and the shell cache declaration in `public/sw.js:1`. The four target files each have a one-line replacement. Controls, transcript editing and explicit text use remain in place; the guide retains the separate order review and confirmation step. The service-worker cache is `gerai-kita-shell-v43-railway` and includes both changed UI modules.

The visible paragraph says audio is sent to the application's service to become text and that the recording is not saved. The working message simply says speech is being converted into text. Neither adds a latency or accuracy claim. Static inspection of the speech runner and `server/ml/transcribe.py` supports the application-level recording statement: audio travels through process memory/stdin and a BytesIO decoder, with no recording-file write in the inspected path. This is not an infrastructure retention audit.

No source, product canon, design canon, browser state or database was changed by this review. The preserved SHA-256 values are:

- `DESIGN.md`: `769EC61803FCBC4BBAAD840A21DF02C1FCEB8996F7894891DFD5637C04491C04`
- `.impeccable/design.json`: `C31FBFCB60AB61B3B4152B3A87E8B22CA5E1ABF008039EA8DC469584C742B51F`

## fidelity

Opened every required full-page capture at original detail and verified its actual dimensions:

| Capture | Viewport | Full-page image |
| --- | --- | --- |
| `.impeccable/review/voice-idle-desktop.png` | 1440 × 1000, light | 1440 × 1197 |
| `.impeccable/review/voice-idle-mobile-dark.png` | 320 × 900, dark | 320 × 1333 |
| `.impeccable/review/voice-review-desktop.png` | 1440 × 1000, light | 1440 × 1411 |
| `.impeccable/review/voice-review-mobile.png` | 320 × 900, dark | 320 × 1622 |

All four show the intended route and state from the document top, with readable settled content and no blank or partially loaded region. The mobile review image is 1622px high, correcting the packet's approximate 1633px height. The mobile bottom bar appears at the viewport boundary in the full-page image, as expected for fixed navigation; it does not obscure the corrected disclosure or transcript-use controls. These are isolated localhost memory-fixture captures, not evidence of seeded real or cloud business data.

The new disclosure remains directly beneath “Ucapkan pesanan” and above recording or transcript controls. It occupies two short lines on desktop and four readable lines at 320px, without clipping or horizontal overflow. Light-mode muted brown text and dark-mode warm secondary text preserve the incumbent hierarchy. The review state clearly separates the editable transcript, “Gunakan teks” and “Buang hasil suara” from the existing customer-note field and “Susun rincian pesanan” action. Panel insets, plain labels, line icons, local typography and light/dark assignments remain consistent with the established design.

Working-state and guide wording were checked in source; they were not separately rendered in this screenshot matrix. No approved comp, raster asset, new visual world or QUALITY BAR card applies to this local copy correction.

## ceiling

The brief's own inspection and one confirmation are exhausted. This reviewer did not rerun the browser, server, detector or tests, and requests no further polishing or capture round.

The existing detector artifact, `data/railway-voice-detector.json`, contains one cream-palette warning and 112 design-system advisories. The cream palette is explicitly pinned by the brief and DESIGN.md. The remaining inherited size/radius/color advisories do not establish a defect introduced by these text replacements and do not require a system rewrite within this scope.

The supplied test history reports a pre-copy full-suite pass of 270 Node plus 54 browser tests. It also reports an initial focused four-test pass and a later 3-pass/1-fail confirmation caused by a screenshot helper blurring a focus target before an assertion; the assertion was subsequently moved ahead of passive screenshot capture. The final full suite in `data/railway-npm-test-final.log` was pending in the review packet; this verdict makes no claim about its result.

This is approval of copy truth, readability and visual integration at the inspected states and viewports. Hosting/security readiness, Qwen resource decisions, microphone performance, speech recognition accuracy and production release approval are outside this review.

## material_fixes

None required within the scoped correction. The former laptop-only assertion is removed from the inspected panel, working state, guide step and successful-service reason. The replacement disclosure is understandable before recording, and no changed control or transaction flow is introduced.

## keep

- Keep the direct service disclosure and the application-level statement that recordings are not saved.
- Keep recording opt-in, editable transcript review, explicit use/discard actions and separate transaction confirmation.
- Keep cream/terracotta, local Nunito, warm dark assignments and the existing flat work panels.
- Keep the isolated fixture boundary and the distinction between a UI-copy verdict and production readiness.
- Preserve DESIGN.md and `.impeccable/design.json`; report inherited drift separately if future work opens that scope.
