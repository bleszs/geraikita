# Customer display design check — v0.35

Date: 2026-10-17. Scope: the owner access controls and standalone customer status screen described in `docs/CUSTOMER_DISPLAY.md` and `.impeccable/briefs/customer-display.md`. This is a scan of an ordinary extension of the established **Neighborhood Kedai** identity. It records implementation evidence without refreshing the incumbent design system.

## Result and preservation

The inspected extension preserves the cream/terracotta/Nunito family, flat separators, named states, and warm dark theme. The six supplied captures were opened successfully: `management-desktop.png`, `customer-desktop.png`, `customer-mobile.png`, `customer-dark.png`, `customer-offline.png`, and `customer-revoked.png` under `data/display-captures/`. The desktop board leads with ready orders; the phone stacks the same lanes; offline and revoked captures contain no order codes. The owner capture contains the current creation result and the access metadata list inside existing account settings.

`DESIGN.md` and `.impeccable/design.json` remain the visual authority and were not edited. Their SHA-256 values were checked against the supplied original values:

| File | Verified SHA-256 |
| --- | --- |
| `DESIGN.md` | `769ec61803fcbc4bbaad840a21df02c1fceb8996f7894891dfd5637c04491c04` |
| `.impeccable/design.json` | `c31fbfcb60ab61b3b4152b3a87e8b22ca5e1abf008039ea8dc469584c742b51f` |

## Extracted implementation

The viewer imports `public/styles.css` before `public/display-screen.css`. It uses the existing semantic custom properties rather than a second palette. Representative exact values are below; this table describes the inspected CSS and does not redefine the normative tokens.

| Role | Light | Dark |
| --- | --- | --- |
| Canvas / paper | `#fcfaf6` / `#fffdf9` | `#241f1c` / `#2e2723` |
| Main / secondary ink | `#382c24` / `#75665b` | `#f4e9df` / `#c7b6a8` |
| Separator | `#e7ded1` | `#514238` |
| Terracotta action / hover | `#a3452b` / `#85351f` | `#e5a07f` / `#f0b698` |
| Ready / attention | `#3d6653` / `#8b5424` | `#bad3bd` / `#f0c295` |
| Focus | `#8d421e` | `#f2bd92` |

Local Nunito Sans files are served under CSS family alias `Nunito` with Segoe UI/sans-serif fallback; available weights are 400, 600, 700, 800 and 900. Body text remains 15px/1.55. The viewer heading uses `clamp(30px,4vw,52px)` with inherited 800 weight, 1.2 line height and −.025em tracking; lane headings use 24px. Codes use `clamp(24px,3vw,38px)`, weight 800, tabular numerals, .02em tracking and `overflow-wrap:anywhere`.

The board has two `minmax(0,1fr)` columns with a 48px gap. At 760px it becomes one column with a 36px gap. Horizontal insets use `clamp(20px,5vw,80px)`; the viewer explicitly removes the shared main container's maximum width. Rows use 22px vertical padding and a fine top border. The footer wraps and stays after the flexible main region. No resting shadow or decorative motion is added.

The owner reuses the existing 14px-radius paper panel, 8px-radius fields, and 9px-radius buttons. Primary actions use terracotta; secondary actions use transparent fill, ink text and a fine border, with warm tint on hover. Shared buttons have 46px minimum height and 11px 18px padding; fields have 45px minimum height and 11px 12px padding. The creation result and access rows use separators rather than nested cards. Revoke review is inline, names the selected screen, and offers explicit confirm/back controls.

## Focus, state and access evidence

Shared `:focus-visible` supplies a 3px semantic focus outline with 4px offset; reduced-motion preference disables animation, transitions and smooth scrolling. Creation moves programmatic focus to the result, hiding a link returns focus to the section heading, revoke review focuses confirmation, cancellation returns to that row's revoke button, and successful revocation returns to the heading. The result and heading have `tabindex="-1"`; controls retain native labels, buttons and fields. Shared main focus suppression is inherited, but these focus targets are the result/heading rather than main. Browser assertions verify creation/confirmation/post-revoke focus; the supplied suite does not constitute a complete keyboard or assistive-technology audit.

The viewer uses a polite status region, plain written ready/preparing labels and specific empty states. It validates eight-character hexadecimal codes and allowed statuses before rendering. It shows no owner navigation, login, menu names, prices, quantities, customer labels, stock or notes. Dark mode is selected from the system when opened; the local toggle changes the document attribute without persisting theme or credentials.

`display-screen.js` reads the fragment into memory and fetches only `/api/display/events` for live data with a bearer header, `credentials:'omit'`, `cache:'no-store'` and `referrerPolicy:'no-referrer'`. The HTML also declares no-referrer. The server's `/api/display/screen` route sends no-store/no-referrer headers and bypasses legacy PWA navigation caching. The viewer imports its own module rather than the owner application bootstrap and registers no service worker. The browser case checks zero anonymous-context cookies, no owner bootstrap/kitchen requests, rejection of owner mutation, and absence of the token in bootstrap/device snapshots.

The 12-second watchdog, stream failure and offline handler hide old codes. Hidden/pagehide lifecycle handlers abort the stream, invalidate its epoch, clear timers and remove codes; a resumed connection clears first and waits for fresh authorization. Revoked events and 401 responses replace the board with the ended-access message and hide retry. The corrected hidden/revoke/resume browser case confirms codes cannot reappear from the old payload.

Owner creation uses a 32-byte Web Crypto token and UUID idempotency key in `ui.displayCreatePending`; an uncertain response retains the same payload for explicit retry. The result URL exists in `ui.displayLink` only. `clearDisplaySecrets()` clears link, pending creation, revoke and deferred focus state and increments the creation epoch. It is called on all three authentication-loss handlers, logout, and adoption from signed-out state. Scope changes and hash navigation also invalidate and clear transient link/pending state. A successful late creation response requires the original scope, epoch and settings route before exposing a link. The account-switch regression checks that the prior token/result is absent after 401 and another account signs in. This is page-state cleanup; the viewer URL intentionally retains its fragment, and explicit copying can place it in the user's clipboard.

## Detector findings and existing drift

`data/display-design-detect.json` flags the cream background and fluid type endpoints. The cream background is the pinned incumbent identity, supported by PRODUCT.md and DESIGN.md. The larger same-family heading and 24px lane role are intentional surface adaptations for a customer/TV board; their exact sizing is recorded here rather than promoted into the global system. TV viewing-distance legibility and code comprehension with real customers remain unvalidated.

The frozen design artifacts predate this surface and do not catalogue the viewer's fluid heading/code roles or board component. The broader stylesheet already contains local size values outside the frontmatter roles, such as 29px metric figures and a 26px brand wordmark. These documentation-coverage differences are recorded, not repaired. No palette or family drift was found in this extension; `Nunito` is the documented local alias for Nunito Sans rather than an extra font.

`data/display-browser-reviewed.log` records six individual browser passes and `6 passed (55.4s)`, covering live/revoke, offline/reconnect/expiry, legacy worker bypass/navigation cleanup, lost-response idempotency, account-switch cleanup and hidden-tab reauthorization. `CUSTOMER_DISPLAY_UI_REVIEW.md` marks the two material safety fixes resolved with scoped disposition `ship`. This design check does not certify full-release regression, production security, cross-device deployment or field TV testing; those remain separate evidence and scope.
