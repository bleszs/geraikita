# Scope / disposition

**ship** — within the branch integration scope. Reviewed the merged interface against feature source `5318dfd`, incoming interface `b6bae4d`, and the [pinned Operate brief](../../.impeccable/briefs/branch-integration.md). The authored cream/terracotta/Nunito direction, role workspaces, capacity/waste controls and customer catalog remain coherent. No material UI defect requires a rebuild or another capture round.

This is a review of integration usability and incumbent compatibility, not authorization for public deployment.

## Capture validity

All eight supplied PNGs were opened at original detail, including the tall owner captures. Their widths match the requested device classes; content is rendered and readable, with no unsettled font, loading screen or transient toast obscuring the review. Capture preparation reports full-page top position and settled fonts/toasts; this review did not independently operate a browser.

| Capture | Dimensions | Reviewed state |
| --- | --- | --- |
| [Auth desktop](../../.impeccable/review/integration/auth-desktop.png) | 1440 × 1254 | Registration, manual help, theme control and visible field focus |
| [Auth mobile](../../.impeccable/review/integration/auth-mobile.png) | 320 × 1399 | Wrapped heading, stacked choices and complete form |
| [Guide mobile dark](../../.impeccable/review/integration/guide-mobile-dark.png) | 320 × 1028 | Arrow to the actual stock action; next/back, skip and pause visible |
| [Capacity/waste desktop](../../.impeccable/review/integration/capacity-waste-desktop.png) | 1440 × 2696 | Partial waste confirmation, passive-capacity warning and station settings |
| [Capacity/waste mobile](../../.impeccable/review/integration/capacity-waste-mobile.png) | 390 × 4587 | Labels, limits, confirmation and submit controls fit the narrow layout |
| [Kitchen dark](../../.impeccable/review/integration/kitchen-dark.png) | 1440 × 2412 | Warm dark workbench, unavailable voice state and rejected negated command |
| [Cashier mobile](../../.impeccable/review/integration/cashier-mobile.png) | 390 × 2608 | Business/role, intake shortcut, queue and intake form |
| [Catalog mobile](../../.impeccable/review/integration/catalog-mobile.png) | 390 × 1416 | Quantity controls, prices, total and explicit request submission |

The fixed bottom navigation appearing at the viewport boundary inside the long owner screenshot is expected full-page capture behavior. The actual forms continue below it and remain scrollable; it is not evidence of horizontal clipping.

## Direction / craft

The two sources share the same visual system. The integration retains the local reading family, warm dark palette, written task/status labels, bordered work surfaces and strong terracotta actions. The cashier's first viewport identifies the business and role and exposes **Pesanan baru**. The catalog explains that staff confirmation precedes cooking. Approximate queue times use `~` and item estimates say **Perkiraan selesai**.

The 320 px guide keeps its highlighted target distinct from the explanation and keeps all exits visible. Source inspection preserves next/back/skip/pause, role-specific help, registration-only autoplay, per-page progress and non-submitting tour actions. Capacity and partial-waste forms retain units, maximums, explicit confirmation and a return action. The long owner page is an inherited operational layout; rearranging it would exceed this merge's direction contract.

The existing detector report contains 119 findings: 106 font-size, three radius and eight color advisories, plus two cream-palette warnings. Its numeric and color values already occur in `5318dfd` or `b6bae4d`; these are documentation alignment advisories, not evidence of a newly invented visual system. Cream is explicitly user-pinned. DESIGN.md and its sidecar were not repaired. No detector rerun was performed.

Core token checks support the visible reading contrast: light muted text is 4.81:1 on tint and 5.29:1 on canvas; the light primary pair is 5.85:1. Dark muted text on surface is 7.47:1. Source includes themed selection/caret/scrollbars, visible keyboard focus and reduced-motion handling. These checks do not constitute a complete accessibility audit of every state.

## Prioritized material findings

No P0 or P1 finding, material direction mismatch, or capture defect was found in the reviewed scope.

**Resolved P3 — integration text encoding.** The initial dark kitchen capture exposed a malformed command-feedback separator. The correction restored six punctuation occurrences in `public/app.js` and two in `public/guide-content.js`, including the password-length range. UTF-8 source inspection confirmed clean middle dots/en dashes with no malformed markers in either file. A narrowly recaptured `kitchen-dark.png` was opened at original detail and now shows the clean separator between menu and order label. No open finding remains from this correction; no further visual pass was required.

## Evidence / limits

Read the brief, PRODUCT.md, DESIGN.md/sidecar, integration notes, app/guide controller/content/layout/state, owner kitchen view, staff workspace and catalog source. The final release suite completed with verified exit code 0: 246 Node tests plus 49 browser cases, **295 passed**, recorded in `data/integration-npm-test-release.log`. After the copy-only punctuation correction, syntax checks passed and the supplementary typed-command check completed with exit code 0 and one case passed (`data/integration-copy-check.log`); it generated the corrected dark capture. This repeated case is not added to the 295 unique suite results. Focused domain and queue-spotlight logs report 30 and one passed respectively.

[Live data preservation](integration-data-preservation.json) and [separate demo preservation](integration-demo-preservation.json) report original rows/columns preserved. Capture business/menu/order values are isolated synthetic test fixtures, not production seed data. Screenshots cannot prove role authorization, persistence or ETA arithmetic on their own; those depend on the accompanying implementation and functional evidence.

No model, benchmark or field-accuracy claim follows from this UI verdict. Public deployment, device-to-device pilot validation, real kitchen ETA accuracy and the two-second voice target remain open as described in [the integration plan](../BRANCH_INTEGRATION.md).
