# Kitchen design preservation check

Date: 2026-10-17. Scope: the Operate kitchen and authenticated service-display extension in `.impeccable/briefs/kitchen.md`. This is an ordinary extension of Gerai Kita's incumbent identity. The existing `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `public/kitchen-view.js`, `public/app.js`, shared/appended CSS and `tests/real-kitchen.spec.js` were inspected. This document records the implemented extension; it does not replace the design system.

## Identity and extracted evidence

| Aspect | Observed implementation | Relationship to incumbent |
| --- | --- | --- |
| Ground and writing | Shared `--canvas: #fcfaf6`, `--surface: #fffdf9`, `--rail: #f3eee5`, `--ink: #382c24`, `--muted: #75665b`, `--line: #e7ded1` | Same cream, paper and brown token assignments. New kitchen CSS introduces no color literals. |
| Actions and focus | Shared `--accent: #a3452b`, hover `#85351f`, selected wash `#f7e7d9`, selected ink `#75351f`, focus `#8d421e` | Existing terracotta controls, selected navigation and visible focus. |
| Dark theme | Shared canvas `#241f1c`, surface `#2e2723`, rail `#302820`, ink `#f4e9df`, muted `#c7b6a8`, line `#514238`, accent `#e5a07f`, focus `#f2bd92` | Same semantic variables switch under `data-theme=dark`; dark capture preserves warm brown/peach character. |
| Font | Local `/assets/nunito-sans-{400,600,700,800,900}.woff2`, CSS alias `Nunito`, then `'Segoe UI', sans-serif`; body 15px / 1.55 | Existing Nunito Sans family and weights. No font added. Captures were taken after `document.fonts.ready` in the supplied test. |
| Hierarchy | Shared h1 32px / 800 / 1.2; h2 20px / 800 / 1.3; queue section heading 18px; kitchen order h3 22px; service labels 26px, 22px on phones | Shared hierarchy with local task-label sizing, not a new display family. Service labels and task tags explicitly use tabular numerals. |
| Controls | Shared `.button`: 46px minimum height, 11px 18px padding, 9px radius, 14px / 800; secondary fine border; `.text-link`: 36px minimum; fields: 45px minimum, 8px radius, 14px text | Existing primary, secondary, link and field components. Native labels, selects, numeric inputs, fieldsets and legends remain explicit. |
| Panels and tags | Shared paper surface, 1px edge and 14px radius; kitchen panel inset 24px desktop / 20px phone; tags 5px radius, 11px / 800, written stage names | Flat Workbench and Named Status rules preserved. New resting panels have no shadows. |
| Motion | New kitchen CSS adds no animation; inherited global reduced-motion rule removes animation and transitions | Existing preference behavior retained. |

## Layout and components

`kitchenView` places the board before the intake/voice tools in the generated DOM. The top title and kitchen/service links precede it. At desktop width the grid uses `minmax(0,1.3fr) minmax(310px,1fr)` with a 24px gap. At 1100px and below the board becomes one column and secondary tools become two columns; at 760px and below those tools stack. Task actions, long menu/order labels and station-priority rows wrap. Phone service rows wrap and their labels reduce to 22px. This is a surface-specific layout extension, not a change to the incumbent shell breakpoints or token system.

The priority list identifies the station and eligible task; an occupied station says it is working on an active item. Order panels preserve menu, portion count, station, estimated duration, optional notes and written status. Passive work has a distinct action and reminder to inspect doneness. Intake explains reservation versus final stock/sales recording and labels external channels as manually entered. Empty-menu and empty-queue states explain how to proceed; no sample order is inserted by the view. Service rows show order label and written state, with refresh and a return link. The page states that authentication remains required and restricted public display mode is unavailable.

## Keyboard, rejection and connection states

The shared keyboard outline is `3px solid var(--focus)` with 4px offset. Native controls remain keyboard operable. `restoreKitchenFocus` restores the command field, newly added menu field, acknowledgement checkbox, next task button or task/order/queue heading after a render; fallback headings use `tabindex=-1`. The supplied browser assertions cover command focus after a successful command, waste-checkbox focus on opening the form, and return to the order heading after cancellation. They do not constitute a complete assistive-technology audit.

Errors use the existing inline `role=alert` form container. The captures show a rejected negated command beside the command field. Closing a started order as used ingredients opens an inline explanation of the whole-order stock consequence and requires a checked acknowledgement. Ordinary cancellation is offered only while all tasks remain queued. Opt-in voice copy names the four-second capture batches and constrained menu/order matching; unavailable speech leaves written recovery and text/button alternatives. The latest `data/kitchen-voice-browser-final.log` records all three kitchen cases passing, including mocked capture/navigation release; mocked transcription is technical transport evidence and does not establish microphone recognition accuracy.

`app.js` retains shared busy, disabled, offline snapshot and pending-action recovery behavior. Offline disables kitchen mutations and names the saved-data state. SSE open updates written live status; SSE error explicitly says the status may be old, announces retry and points to manual refresh. Service status has `role=status`. Source avoids replacing the kitchen form while a field is focused or waste acknowledgement is open. The supplied service-reconnecting capture visibly retains the last order while warning about stale status and offering `Perbarui status`.

## Rendered evidence and limits

All five current captures were opened:

- `data/kitchen-captures/desktop.png`: 1440px desktop, light theme, actual test-created order, board beside intake and voice, disabled unavailable speech and inline command rejection.
- `data/kitchen-captures/mobile.png`: 390px phone, board before intake/voice; named state and wrapped controls; fixed bottom navigation appears at the captured viewport edge of the full-page image.
- `data/kitchen-captures/dark.png`: same working order and layout using the inherited warm dark assignments.
- `data/kitchen-captures/service.png`: authenticated dark service display, active live status and named test order.
- `data/kitchen-captures/service-reconnecting.png`: light service display with explicit stale/reconnecting text and manual refresh.

The supplied Playwright source checks `document.documentElement.scrollWidth <= innerWidth` at 1440px light/dark and 390px light. Its multi-item flow exercises reservation, passive release, next-task start, ready state, one-time completion, synchronization and subsequent empty lists. This document uses those supplied tests/logs; the documenter did not rerun the application or change its data. Empty-account copy and offline controls were inspected in source, not independently captured here. No production, field accuracy, model-quality or latency claim follows from this review.

## Existing documentation gaps retained

The incumbent design prose is older than some shared implementation: it describes an active-business label accompanying a header avatar, while current shared `app.js` renders the business label without that avatar. The existing guide overlay/header controls and usage-review surfaces are not exhaustively catalogued in the incumbent sidecar's ten specimens. These observed documentation gaps were recorded only; no design artifact or shared implementation was repaired.

The kitchen extension also changes the first quick-navigation destination from the Overview named in older design prose to Dapur, and adds the surface-specific 1100px kitchen stacking threshold and local sizes above. Those are explicit task-scope adaptations, not claimed pre-existing drift and not new system-wide rules. `DESIGN.md` and the sidecar remain authoritative for the inherited visual primitives. The finish reviewer records `disposition: ship` in `docs/evaluation/KITCHEN_UI_REVIEW.md`.

## Preservation receipt

The only documenter write is this file. SHA-256 values checked before and after writing:

| Preserved file | SHA-256 |
| --- | --- |
| `DESIGN.md` | `769EC61803FCBC4BBAAD840A21DF02C1FCEB8996F7894891DFD5637C04491C04` |
| `.impeccable/design.json` | `C31FBFCB60AB61B3B4152B3A87E8B22CA5E1ABF008039EA8DC469584C742B51F` |
