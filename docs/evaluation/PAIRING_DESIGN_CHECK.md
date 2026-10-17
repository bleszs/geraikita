# Staff pairing design-system check - v0.42

Disposition: ordinary Operate extension documented; incumbent canon preserved.

Checked on 2026-10-18 against `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/briefs/staff-pairing.md`, `docs/STAFF_PAIRING.md`, the finished `PAIRING_UI_REVIEW.md` (`disposition: ship`), the pairing implementation, and the evidence listed below. The document workflow was used to compare the completed extension with the established system. The accepted task authorizes no visual-world replacement or canon refresh; this report is the documentation artifact. No new tokens, component specimens, raster assets, or design rules were added to the canon.

## Preserved authority

The incumbent frontmatter remains normative. Its Neighborhood Kedai direction, warm cream/terracotta light theme, brown/peach dark theme, locally hosted Nunito Sans under the `Nunito` alias, flat work panels, written statuses, and visible focus treatment remain the governing system. The schema-version-2 sidecar still describes the incumbent ten component specimens and supporting color/type metadata, shadows, motion, and breakpoints.

SHA-256 values were read from disk and matched the supplied baseline exactly:

| Canon file | Preserved SHA-256 |
| --- | --- |
| `DESIGN.md` | `769ec61803fcbc4bbaad840a21df02c1fceb8996f7894891dfd5637c04491c04` |
| `.impeccable/design.json` | `c31fbfcb60ab61b3b4152b3a87e8b22ca5e1abf008039ea8dc469584c742b51f` |

Neither file was edited by this documentation pass. Task-specific composition and account/code behavior remain in the pairing brief and feature documentation; they are not promoted into global visual rules.

## Implementation comparison

| System or task requirement | Checked implementation and evidence | Assessment |
| --- | --- | --- |
| Warm light/dark ground and action roles | `public/styles.css` retains the established theme variables and local font faces. Pairing styles use `var(--line)` and existing controls rather than defining another palette. Light/dark login and owner captures retain the existing character. | Compatible extension. |
| Existing panel, field, action, and icon grammar | `staff-pairing.js` reuses auth layout, section panels, labeled fields, primary/secondary buttons, and existing SVG icons. `staff.css` adds separated result/history blocks and wrapping list rows. No new resting shadow or raster material was introduced. | Compatible extension. |
| Type and clear numeric information | The code uses the existing family, bold weight, tabular figures, and character spacing. Its eight characters are displayed in two groups; expiry is explicitly labeled in WIB. Headings and helpers remain readable in the supplied narrow captures. | Compatible extension; no new global type step established. |
| Responsive task order | Creation fields become one column at the incumbent 760px breakpoint. Result/list actions wrap. The 320px auth/error and 390px owner/account captures preserve labels and primary actions. The long readonly URL remains inside its native field. | Compatible adaptation. |
| Explicit statuses and recovery | Invite metadata renders Belum dipakai, Sudah dipakai, Kedaluwarsa, or Dicabut in words. Invalid-code recovery asks the staff member to request a new code without naming a business. Forms include adjacent alert regions. | Consistent with written-state rules. |
| Honest acknowledged result | `app.js` awaits creation and refresh, then checks current business scope, page, request epoch, and active invite metadata before showing the result. The result labels identity, role, expiry, code, and current-origin login URL. The desktop result capture includes its matching active staff row. | Source and static evidence agree. |
| Correct account distinctions | The primary owner form needs name/role/confirmation. Legacy email creation remains in a named disclosure. Staff lists use Masuk dengan kode when email is absent. `staff-workspace.js` shows return-after-logout instructions when `hasPassword === false`; password accounts retain their password form. | No fabricated email or unusable password form presented. |
| Distinct code and session states | Existing-staff code creation explains that old unused codes are revoked while valid sessions continue. History explains Cabut kode versus Nonaktifkan. Hidden/expired code recovery directs the owner to create another code for the same staff identity. | Truthful task copy retained. |
| Temporary result and uncertain response | `app.js` holds the pending code/key in UI memory for retry, rejects altered uncertain payloads, and guards late results. Expiry removes the result without replacing other forms; hiding returns focus to the creation heading. Navigation/logout cleanup is handled by the existing pairing cleanup path. | Source evidence; not an independent security certification. |
| Guide continuity | `guide-content.js` describes creating, sharing, hiding, history/revocation, legacy email access, and staff login through existing targeted steps. | Extension of the incumbent guide; no new onboarding system. |

The static evidence does not independently establish keyboard execution, motion, expanded history/confirmation behavior, or cross-device delivery. Semantic controls, focus handling, inherited focus/reduced-motion CSS, and account branches were checked in source; functional results are separate recorded evidence.

## Rendered evidence checked

All eight existing PNGs in `.impeccable/review/pairing/` were opened at original detail. No browser, server, test, or detector was started by this pass.

| Capture | Observed scope |
| --- | --- |
| `code-login-desktop.png` | Light desktop login; one code field and clear email alternative. |
| `code-login-mobile-dark.png` | Dark 320px login; wrapped explanation and visible actions. |
| `owner-create-desktop.png` | Light Settings task; name/role/confirmation, legacy disclosure, deliberate empty staff state. |
| `owner-create-mobile-dark.png` | Dark 390px Settings task; stacked fields and confirmation. |
| `owner-code-desktop.png` | Acknowledged result, local login address, copy/hide, history disclosure, matching staff row. |
| `owner-code-mobile.png` | 390px result and staff list; URL contained in its field and wrapping actions. |
| `staff-account-mobile.png` | 390px code-only account explanation with refresh/logout and staff navigation. |
| `used-code-mobile.png` | 320px generic invalid/used/expired message with recovery and both login actions. |

Owner images intentionally show the task below other Settings sections, as authorized by the brief, with stable navigation. The login and staff-account images show page tops. Captured names/codes belong to isolated test fixtures; they are not production staff or reusable demo credentials. The loopback address shown in the result is the actual test origin, not a public deployment claim.

## Recorded detector findings and inherited drift

The already-produced `data/pairing-detector.json` was read, not rerun. Its 113 entries comprise:

| Finding | Count | Treatment |
| --- | ---: | --- |
| Cream palette warning | 1 | Deliberately pinned by the user and incumbent Warm Ground rule; preserve. |
| Font-size advisories | 99 | Existing `public/styles.css` values outside the frontmatter type ramp. Some responsive sizes already have prose context; the recorded advisories still stand. |
| Radius advisory | 1 | Existing 11px radius at `public/styles.css:268`, outside the rounded scale. |
| Color advisories | 12 | Existing `public/styles.css` literal colors outside the documented palette/ramps. |

All 112 design-system advisories point to `public/styles.css`; the palette warning points to `public/index.html`. They document inherited implementation/canon differences, not an approved expansion of the system. This pass neither repairs those differences nor silently adds them to DESIGN.md/sidecar. The finished UI review found no material pairing defect from them. A future authorized design-system reconciliation can evaluate their intent separately.

## Recorded validation and limits

`docs/evaluation/pairing-release.json` records 317 unique passing tests (263 Node and 54 Chromium), npm test exit 0, 18 anonymous runtime-path checks, three demo roles, and three passing data-preservation reports. This pass checked that the stored test log ends with 54 browser passes, that its SHA-256 matches `20635bd179d06f614bbd67b57448539d541fe1632ef1c020a1e588d33692dd67`, and that the runtime and all three preservation reports state `passed: true`. These checks read existing evidence; they do not represent another test run or independent database audit.

Feature documentation accurately retains the local/loopback limit and the distinction between code revocation and session termination. HTTPS, public hosting, cookie/origin/host configuration, persistent storage/backup operations, production security assessment, and cross-device pilot remain future work. No production seed, model/weights change, voice latency, field accuracy, or deployment result is asserted here.

Documentation disposition: complete for this ordinary extension. The release manifest already records the UI review's ship disposition; its `designDocumentationComplete` field and this report's evidence hash still need final assembly by the release owner after this report lands. That administrative update is outside this documenter's write boundary. No scoped design documentation blocker was found.
