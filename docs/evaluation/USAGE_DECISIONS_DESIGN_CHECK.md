# Usage decisions design check — v0.32

Disposition: **ship**, following the [fresh finish review](USAGE_DECISIONS_UI_REVIEW.md). The ordinary extension documentation obligation is fulfilled. This is a bounded addition to the existing Operate surface, with no new visual world or design-system revision.

## Authority and scope

The [surface brief](../../.impeccable/briefs/usage-decisions.md), [PRODUCT.md](../../PRODUCT.md), and [behavior documentation](../USAGE_DECISIONS.md) define this change: an owner can explicitly save a review of a usage date, read it after reopening, and see when changed evidence requires another review. The per-ingredient summary remains compact; dates, references, saved notes, and editing appear on demand.

The incumbent [DESIGN.md](../../DESIGN.md) and [sidecar](../../.impeccable/design.json) remain authoritative and unchanged. Their warm cream/terracotta palette, locally hosted Nunito Sans, flat work panels, borders, visible focus, written statuses, and warm dark theme cover the added controls. No new token, visual identity, modal, decorative surface, or shipping raster asset is required. The old global direction's synthetic-data sentence is superseded by the explicit no-dummy-data requirement and current PRODUCT.md; review fixtures do not authorize sample records in the active app.

The document reference was read for this handoff. Its extraction and regeneration workflow does not require replacing an established system to record this ordinary local extension. The previously disclosed timestamp drift is retained: the sidecar records `generatedAt: 2026-10-13T17:15:36.770Z`; DESIGN.md has a later filesystem modification time, `2026-10-15T02:57:20Z`. No drift repair was performed.

## Implemented pattern

| Element | Design contract and checked source |
| --- | --- |
| Owner status | `usageReview()` in `public/live-views.js` adds a written owner status, timestamp, escaped note, and review action beside the existing date evidence. It retains the statistical flag as a separate result. |
| Inline editor | The same function creates one labeled region identifying ingredient and date, a native two-option select, optional note, explicit confirmation, save, and close without saving. Opening moves focus to its heading. |
| Summary | Saved, follow-up, and recheck counts remain one sentence per ingredient. Detailed dates and comparison observations stay behind native disclosures. |
| Saved and stale states | Saved status and note use the ordinary reading hierarchy. Changed evidence uses the explicit recheck wording rather than silently replacing the owner's prior assessment. |
| Material and wrapping | `public/styles.css` adds owner-review spacing, a fine separator above the editor, bounded reading widths, and wrapping notes/headings/buttons. It reuses existing variables and native form styles. |
| Actions and recovery | The `usage-decision` branch and open/close actions in `public/app.js` use explicit save, refresh, and close. The editor carries its snapshot, latest revision, and retry key. Offline disables mutation and preserves current-page text; reconnect does not send it automatically. |
| Guidance | `public/guide-content.js` explains review, note, confirmation, save, and close controls in the existing Saran kulakan topic. |

These are local component behaviors, not new global visual rules. Keep human review, statistical screening, and data freshness distinct. A saved assessment must not imply a stock correction or a validated anomaly label.

## Evidence checked

This documentation pass read the authority documents, sampled the implementation listed above, read the finish review and existing detector result, checked the seven screenshot artifacts are present, and read the preservation report. It did not run a browser, rerun tests or the detector, or conduct another visual hunt.

The fresh reviewer opened and validated all seven required full-page captures and returned **ship**, with no material fixes:

- [Desktop editor](../../.impeccable/review/usage-decision-editor-desktop.png)
- [Phone editor](../../.impeccable/review/usage-decision-editor-mobile.png)
- [Phone dark editor](../../.impeccable/review/usage-decision-editor-mobile-dark.png)
- [Desktop saved result](../../.impeccable/review/usage-decision-saved-desktop.png)
- [Desktop stale result](../../.impeccable/review/usage-decision-stale-desktop.png)
- [Phone stale result](../../.impeccable/review/usage-decision-stale-mobile.png)
- [Phone offline editor](../../.impeccable/review/usage-decision-offline-mobile.png)

That review records loaded content at desktop 1440px and phone 320px, readable light/dark editing, separate saved/statistical statuses, stale wording, and explicit offline recovery. The phone bottom bar crossing a full-page capture at viewport height is expected fixed navigation. The incumbent forecast table's horizontal scroll is outside this extension. The reviewer found the local craft ceiling reached and requested no fixes.

The existing [detector output](../../data/usage-decisions-detector.json) is `[]`. The [preservation report](usage-decisions-data-preservation.json) records all original 19 table schemas/rows unchanged and the added twentieth table, `usage_review_decisions`, empty. It also records no active usage history, zero screened days, and no example reviews inserted. These are existing artifacts read here, not newly executed audits.

The supplied implementation handoff reports eight focused backend tests and four browser scenarios passing; [USAGE_DECISIONS.md](../USAGE_DECISIONS.md) states their scope. No test execution is claimed by this documentation pass. Full regression status belongs to its separate execution report.

## Preservation check

SHA-256 values before and after this documentation-only write:

| File | Before | After |
| --- | --- | --- |
| `DESIGN.md` | `769EC61803FCBC4BBAAD840A21DF02C1FCEB8996F7894891DFD5637C04491C04` | `769EC61803FCBC4BBAAD840A21DF02C1FCEB8996F7894891DFD5637C04491C04` |
| `.impeccable/design.json` | `C31FBFCB60AB61B3B4152B3A87E8B22CA5E1ABF008039EA8DC469584C742B51F` | `C31FBFCB60AB61B3B4152B3A87E8B22CA5E1ABF008039EA8DC469584C742B51F` |

Only this design-check document was written by the documenter. The existing system was preserved byte-for-byte.

## Limits

The ship disposition covers this local UI extension and its supplied software evidence. It makes no claim of novice comprehension, user acceptance, field anomaly accuracy, or AI accuracy. Operational reviews made after seeing screening results are not blind research labels and do not automatically become training or evaluation data. Unsaved text persists only within the current page session; saved reviews are account records. Forecasts, ledger transactions, inventory, screening rules, and the active AI model remain outside this extension's mutation scope.
