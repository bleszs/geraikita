# V0.28 guide: incumbent design check

Outcome: ordinary component extension. The optional welcome, contextual tour and searchable reference extend the established Gerai Kita system. No visual-world or system-token change is needed. Root `DESIGN.md` and `.impeccable/design.json` remain preserved.

## Evidence checked

- `PRODUCT.md` v0.28 introduction and `docs/INTERACTIVE_GUIDE.md`: optional help, six-step first workflow, 14 searchable topics / 61 steps, availability conditions, local progress, offline prerequisites and explicit limits.
- Root `DESIGN.md` and schema-version-2 `.impeccable/design.json`: warm Neighborhood Kedai identity, local Nunito Sans under the Nunito CSS alias, flat work surfaces, shared controls, responsive layout and temporary-surface elevation.
- `public/styles.css` guide rules, `public/guide.js` controller and `public/guide-state.js` persistence. The handoff identifies `guide-content.js`, `app.js`, `live-views.js` and v28 `sw.js` as the integration files.
- All seven supplied captures were opened: `.impeccable/review/guide-welcome-desktop.png`, `guide-welcome-mobile.png`, `guide-tour-desktop.png`, `guide-tour-mobile.png`, `guide-tour-mobile-dark.png`, `guide-help-desktop.png` and `guide-help-mobile-dark.png`.
- `docs/evaluation/GUIDE_UI_REVIEW.md`: full finish-review disposition **ship**, no material fixes. `data/guide-detector.json` was read; the detector was not rerun.

This is a documentation comparison, not another visual-polish pass. Browser tests were not rerun by this documenter. The supplied evidence reports six guide Node tests and seven guide browser scenarios passing, including all 61 steps with zero business POSTs; the full suite reports 174 Node tests and 27 browser scenarios passing. These checks do not establish novice comprehension.

## Comparison with the incumbent system

| System commitment | Finished extension and evidence |
| --- | --- |
| Warm cream/terracotta identity and warm dark counterpart | Guide CSS references existing surface, tint, ink, muted, line, accent and focus variables. Welcome and tour captures retain the light palette; dark tour/catalogue captures retain brown grounds and peach accents. No guide palette literals are introduced. |
| Locally hosted rounded reading family and clear hierarchy | Guide text inherits Nunito Sans through the existing Nunito alias. Its headings, body text, labels and counts use the established 20px, 16px, 14px and 13px hierarchy. Bold labels distinguish actions; counts use tabular figures. |
| Flat Operate surfaces and restrained grouping | Welcome uses warm tint; catalogue uses separated rows inside an existing paper panel. Native search, buttons and disclosures carry the work. The catalogue does not turn each topic into a decorated card. |
| Temporary surfaces may use the shipped shadow | The fixed nonmodal tour reuses `var(--shadow)` and the panel radius. Its outer edge has no added border; internal separators distinguish fixed header/footer from the scrolling body. This applies the existing temporary-elevation rule without redefining resting work panels. |
| Progressive, explicit action and status | The short start has six steps; the broader reference has 14 topics of 3–7 steps each. Next, Back, Skip, Pause and Resume preserve user choice. Written prerequisites explain unavailable or role-limited controls. Guidance navigates and highlights; it does not submit business decisions or seed records. |
| Keyboard focus and visible exit | The controller labels its nonmodal section, moves focus to the step heading on step changes and returns focus to guide access on pause. Escape pauses. Shared focus treatment and the target outline remain visible. Header skip and footer navigation stay outside the scrolling body. |
| Readable phone adaptation | The 320px welcome stacks start/skip, catalogue rows stack their actions, and the tour sits above the signed-in bottom bar. Light and dark captures show readable wrapping and reachable controls. Extra document clearance while a tour is active allows work behind it to be scrolled into view. |
| Account/device boundaries and truthful offline behavior | Existing help is available to guests and accounts; account-only targets are described when unavailable. Validated local progress is separated by account/workspace epoch/device with guest isolation and memory fallback. Offline availability depends on prior shell caching, as documented. |

## Preservation and existing drift

The design files already predate this extension and were not regenerated. The previously recorded timestamp mismatch remains: DESIGN.md last-write time is `2026-10-15T02:57:20Z`; the sidecar last-write time is `2026-10-13T17:15:36Z`, with `generatedAt` of `2026-10-13T17:15:36.770Z`. The supplied detector contains seven color, one radius and 44 font-size advisories from the existing system. Existing secondary sizes and prior component/sidecar discrepancies are reported without treating this guide as authorization to repair them.

SHA-256 checksums before and after this documentation write:

| Preserved file | SHA-256 |
| --- | --- |
| `DESIGN.md` | `769EC61803FCBC4BBAAD840A21DF02C1FCEB8996F7894891DFD5637C04491C04` |
| `.impeccable/design.json` | `C31FBFCB60AB61B3B4152B3A87E8B22CA5E1ABF008039EA8DC469584C742B51F` |

Only this evaluation document was written by the documenter. The supplied PNGs are review evidence; no shipping raster asset was added. The ordinary-extension documentation obligation is complete, with the incumbent design authority preserved and prior drift left unchanged.
