# Staff roles: incumbent design preservation check

Checked 2026-10-17 for v0.36.0. **Outcome: the staff extension preserves the incumbent visual system.** `DESIGN.md` and `.impeccable/design.json` remain byte-identical to their supplied baselines. This records an ordinary, code-led extension against `.impeccable/briefs/staff-roles.md` and the v0.36 product context; it establishes no new visual world, tokens, assets, approved composition or design-system approval.

## Authority and unchanged artifacts

Read the Impeccable document reference in scan mode, the role brief, `PRODUCT.md`, `DESIGN.md`, the sidecar, staff implementation, relevant application/guide code, final review, release evidence and recorded test evidence. The document reference's design-refresh workflow does not apply: the task explicitly preserves the existing design artifacts and authorizes this check only.

Fresh SHA-256 reads match both pinned values:

| Artifact | SHA-256 |
| --- | --- |
| `DESIGN.md` | `769ec61803fcbc4bbaad840a21df02c1fceb8996f7894891dfd5637c04491c04` |
| `.impeccable/design.json` | `c31fbfcb60ab61b3b4152b3a87e8b22ca5e1abf008039ea8dc469584c742b51f` |

No design artifact or implementation was edited during this check. The sole written artifact is this document.

## Checked visual evidence

Reopened all six current PNGs under `.impeccable/review/staff/` at original detail. Read PNG dimensions independently. Each starts at the document top, has settled typography, and shows the intended role/page without a loading veil or toast. Full-page images were inspected through their final controls/footer. Desktop and mobile viewport widths are 1440px and 390px; full-page image heights vary with content.

| Capture | Dimensions | Observed evidence |
| --- | --- | --- |
| `cashier-desktop.png` | 1440 × 1661 | Three active orders beside labeled intake; warm primary shortcut and explicit return action; totals and written states. |
| `cashier-mobile.png` | 390 × 2664 | Wrapped header, single task column, **Pesanan baru** before the three-order queue; complete intake and **Kembali ke antrean** below it. |
| `kitchen-desktop.png` | 1440 × 1781 | Three orders, preparation stage controls, station/time context and voice/text section; no displayed prices or owner navigation. |
| `kitchen-mobile-dark.png` | 390 × 2065 | Same three orders on brown surfaces, peach accents, wrapped controls and written task states; complete voice/text section. |
| `owner-staff-desktop.png` | 1440 × 3294 | Existing owner settings shell, staff creation confirmation/password explanation, and both active staff rows with role/change controls. |
| `owner-staff-mobile.png` | 390 × 4035 | Complete settings page, wrapped staff identity/actions and footer; existing fixed bottom navigation appears at the initial viewport boundary. |

The captures contain isolated synthetic test fixtures, including the three-order queue. They are review artifacts, not application imagery or evidence of staff insertion into real accounts.

## Comparison with the incumbent system

| Incumbent invariant | Final extension evidence |
| --- | --- |
| Cream canvas, paper surfaces, brown ink and terracotta actions; warm dark counterparts | Staff CSS consumes existing semantic variables. Both light staff roles and the dark kitchen capture retain their assignments. No parallel palette is introduced. |
| Locally hosted Nunito Sans and existing hierarchy | The global `Nunito` alias still loads local Nunito Sans weights. Staff markup inherits body, headings, fields, buttons and status typography. Cashier totals explicitly retain tabular figures. |
| Flat work panels, thin borders and rounded controls | Staff creation, orders, intake and voice/text controls reuse existing panel, button, field and tag classes. No resting shadow, illustration or dashboard metric strip is added. |
| Written states and explicit Indonesian actions | Orders show Menunggu/Dikerjakan; owner rows name role and Aktif/Nonaktif in source. Stage, submission and access-change controls describe their outcomes. |
| Responsive work layout | Cashier queue/intake uses a flexible desktop split and stacks at 1000px. At 760px staff header controls wrap and tasks become columns. Owner staff rows wrap via the existing action language. |
| Visible keyboard focus and purposeful interaction | Shared global focus styling remains. `staffFocusBefore()`/`restoreStaffFocus()` preserve the logical control across shared rerenders within the same account/role revision, with task/order/queue fallbacks. Shortcut handlers move focus and scroll below the sticky staff header. |
| Existing forms and guided disclosure | Owner creation/change forms require explicit confirmation and explain initial passwords/session effects. Staff password forms and role-specific next/skip tours reuse existing primitives. These states were checked in source; the six captures do not depict every form/tour state. |

The restricted staff shell replaces the owner rail with two relevant destinations, business identity and personal role/name. Its task-specific composition follows the role brief; the shared materials and controls retain the incumbent world. Kitchen receives preparation context; cashier receives menu prices, availability, intake and handover controls. Source supplies connection/recovery copy and disables mutations offline; these captures show connected operation.

## Existing differences retained

`DESIGN.md` describes the owner phone bottom bar as Overview, Orders, Stock, Collective and More. Both the incumbent `HEAD:public/app.js` and current application instead use Dapur, Catat, Stok, Bersama and Menu; the owner mobile capture confirms that existing navigation. This is pre-existing documentation drift, not a staff change. It was reported without updating either design artifact or repairing navigation.

The existing global `.form-grid` stays two columns unless a specific editor overrides it. The owner customer-display and new staff form retain that behavior at 390px; staff rows wrap and the cashier task/intake layout stacks. The design's one-column form descriptions concern named editors, so this observation is not promoted to a universal design violation or a new approved pattern. Existing kitchen-specific component styles also predate this extension and are reused rather than recast into new system tokens.

## Review disposition, verification and limits

`docs/evaluation/STAFF_ROLES_UI_REVIEW.md` records historical initial disposition **fix**, followed by verdict-pass disposition **ship**: both listed fixes are resolved. Those fixes are (1) keyboard position lost during shared queue updates and (2) mobile intake buried beneath the active queue. Source and the recorded browser assertions support focus restoration after refresh/remote insertions/removal, first-viewport shortcut access with three orders, input focus below the sticky header, and return focus to the queue. This document preserves that two-fix scope; it does not issue a fresh whole-surface or production verdict.

`docs/evaluation/staff-release.json` records final command exit **0** for `PLAYWRIGHT_CHANNEL=chromium npm test` using a PowerShell environment variable: **227 Node tests and 44 browser tests, 271 total passed**. The final `data/staff-npm-test-v036.log` contains those totals; its freshly read SHA-256 matches release evidence (`ffee632600a0117afa2a53bf04da3952647c7902c7333ac0265439500e37f0fd`). Earlier failed/cancelled attempts are distinguished in the release record. This reviewer inspected the log and relevant test source; no test suite or browser session was rerun.

The supplied `data/staff-detector.json` contains only the cream-palette advisory. Cream is the explicitly pinned incumbent direction. The detector was not rerun and its advisory prompted no palette change.

The main/demo preservation reports each record all **25 original tables preserved**, with added `account_roles` and empty `staff_actions` tables. Owner role rows derive from existing accounts; both reports show zero staff and zero dedupe actions, integrity `ok`, and no foreign-key violations. The release record additionally reports all 27 tables unchanged from the post-migration state. These are inspected recorded checks, not fresh database queries by this reviewer; no automatic staff or dummy business data was requested or added here.

Static captures establish appearance at the two supplied widths, not keyboard behavior, all error/offline/tour states, field usability or security. Behavioral statements above rest on inspected source and recorded passing assertions. Production deployment, a field pilot, equipment/staff capacity, partial waste and two-second voice performance remain outside the completed scope. No model, benchmark or weights change is established by this design check.
