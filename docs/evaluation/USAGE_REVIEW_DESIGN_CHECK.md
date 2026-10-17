# v0.27 usage-review design documentation check

Date: 2026-10-16. Outcome: the completed **Periksa pemakaian bahan** panel is an ordinary extension of the existing **Saran kulakan** operating surface. It fits the incumbent design system; no durable visual-system change is needed. The finish review disposition is **ship**, at the scope recorded in [USAGE_REVIEW_UI_REVIEW.md](USAGE_REVIEW_UI_REVIEW.md).

## Evidence checked

- Root `DESIGN.md`: normative palette, Nunito family alias, secondary type sizes, tabular quantities, flat work panels, written status rules, responsive rows, focus and motion guidance.
- `.impeccable/design.json`: existing schema-version-2 extension and component specimens; its existing generation timestamp is recorded below.
- `public/live-views.js:50–75`: recommendation-first placement, ingredient summary, actual report references, newest-first flagged dates, optional all-date disclosure, escaped names, explicit unknown/legacy/offline text and history link.
- `public/styles.css:161–198`: shared semantic color variables, separators, compact type, tabular figures, native disclosure targets and labeled phone rows.
- `server/service.mjs`: the existing `screenUsage` function supplies `usageScreening` beside each recommendation. `public/sw.js` identifies the v27 application shell.
- [USAGE_REVIEW.md](../USAGE_REVIEW.md): shipped interaction, authenticated account scope, offline/legacy distinctions, data limitations and isolated verification procedure.
- Existing finish-review report and `data/usage-review-detector.json`. The detector was not run again.

The finish reviewer inspected six captures under `.impeccable/review/`: `usage-review-desktop.png`, `usage-review-mobile.png`, `usage-review-mobile-dark.png`, `usage-empty-desktop.png`, `usage-empty-mobile.png`, and `usage-review-mobile-all-dates.png`. This documentation pass uses that reviewed evidence and samples the finished source; it does not start another visual review or polish pass. Offline and legacy rendering were covered by source/tests, with no independent captures for those states in the packet.

The handoff reports four focused backend tests and four browser scenarios passed using an isolated in-memory fixture. Those results are carried as supplied verification evidence, not represented as a new test run by this documenter. No dummy business data was added to the active application.

## Comparison with the incumbent system

| Existing rule or pattern | Completed extension |
| --- | --- |
| Warm cream/terracotta ground, matching warm dark assignments | Reuses `--line`, `--accent`, `--warn` and `--muted` with the existing panel surface. No new palette or theme is introduced. |
| Local Nunito reading family, bold hierarchy and compact secondary descriptions | Inherits the family; ingredient headings use 16px, values use bold 20px, and secondary labels use 12px. DESIGN.md already permits 12px secondary descriptions. |
| Legible arithmetic with tabular figures and visible units | Recorded quantity, reference median and bounds retain units; quantities and reference rows use tabular numerals. |
| Flat Workbench Rule; lists use separators inside panels | Ingredient and finding groups use fine line separators without resting shadows or miniature nested cards. |
| Named Status Rule | Flags name higher/lower direction. Coverage distinguishes checked days, unavailable days, insufficient data and absent history. Zero checked days is not a normal result. |
| Existing operating hierarchy and progressive disclosure | Forecasts remain first; per-ingredient summaries lead to flagged dates, eight actual earlier references, then optional all-date coverage and the existing history route. |
| Responsive rows and visible keyboard interaction | Native `details/summary` controls have 44px minimum targets and inherit focus behavior. Amounts stack on phones; all-date table cells keep their labels when they become stacked rows. |
| Honest task state and explicit actions | Offline results are identified as stored data; old snapshots without screening are unavailable. Opening review details changes no transactions. |

The 28-day review period, statistical limitations and order of review evidence remain surface-specific product behavior. They are not promoted into global design rules. No new imagery, decorative motion, font, elevation treatment or reusable token family requires system documentation. Review screenshots are test artifacts; no shipping raster assets were added.

## Preservation and pre-existing drift

`DESIGN.md` and `.impeccable/design.json` were explicitly preserved. This pass writes only this report; application files, PRODUCT.md, the finish-review report and other documentation are outside its write boundary. General product documentation is handled by the parent task. Its v0.27 update supersedes the finish report's earlier observation that PRODUCT.md still introduced v0.26; the historical review text is left intact.

The existing timestamp mismatch predates this extension: DESIGN.md last-write time is `2026-10-15T02:57:20Z`, while the sidecar last-write time is `2026-10-13T17:15:36Z` and its `generatedAt` is `2026-10-13T17:15:36.770Z`. This is reported without silently regenerating either file.

The existing detector output records seven color, one radius and 44 font-size advisories. The finish reviewer identifies legacy color/radius/type-sidecar discrepancies; new 12px secondary labels follow the incumbent compact typography. Its other observations about the prior mobile recommendation table and the date above the page title remain outside this bounded addition. No repair of that pre-existing drift was requested or performed.

Preserved SHA-256 fingerprints, checked before and after writing this report:

| File | SHA-256 |
| --- | --- |
| `DESIGN.md` | `769EC61803FCBC4BBAAD840A21DF02C1FCEB8996F7894891DFD5637C04491C04` |
| `.impeccable/design.json` | `C31FBFCB60AB61B3B4152B3A87E8B22CA5E1ABF008039EA8DC469584C742B51F` |

Documentation outcome: incumbent system retained, extension evidence recorded, and pre-existing drift disclosed. The panel remains a read-only aid for reviewing real records; this change does not train a model, establish accuracy or automatically mutate business data.
