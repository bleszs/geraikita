# V0.29 arrow guide: incumbent design check

Outcome: ordinary local extension of the established Gerai Kita interface. The corrected guide introduces the application, connects its explanation to a real feature with a visible arrow, and advances feature by feature through Lanjut. No visual identity or system-token change is required. `DESIGN.md` and `.impeccable/design.json` are preserved.

## Authority and evidence checked

The controlling authority is the user's correction requesting actual arrows, an explanation of the application first, and Next to the following feature. The earlier v0.28 review does not establish satisfaction of that correction. `PRODUCT.md` v0.29 and `docs/INTERACTIVE_GUIDE.md` now record the 11-step main tour, five-step guest introduction, 14 topics/67 total steps, unavailable-target behavior and progress v2.

This documentation comparison checked the incumbent `DESIGN.md`, schema-version-2 sidecar, guide CSS, `public/guide-layout.js`, controller positioning/navigation hooks in `public/guide.js`, progress storage implementation, the canonical guide documentation and the existing detector output. The fresh finish review at `docs/evaluation/GUIDE_ARROW_UI_REVIEW.md` has disposition **ship**, with no material fixes.

All nine supplied PNGs under `.impeccable/review/` were opened: `guide-arrow-intro-desktop.png`, `guide-arrow-guest-intro-mobile.png`, `guide-arrow-tour-desktop.png`, `guide-arrow-tour-mobile.png`, `guide-arrow-tour-mobile-dark.png`, `guide-arrow-welcome-desktop.png`, `guide-arrow-welcome-mobile.png`, `guide-arrow-help-desktop.png` and `guide-arrow-help-mobile-dark.png`. They show the named introduction, stock target, optional welcome and searchable help states in the incumbent light/dark interface. These are review captures, not new shipping raster assets.

The supplied verification reports eight guide Node tests and eight guide browser scenarios passing, including all 67 steps without business POSTs, actual arrows through all 11 main steps and arrow endpoints after resize/scroll. The release handoff reports the full regression suite passing: 176 Node tests and 28 browser scenarios (204 total). This documenter did not rerun tests or perform another browser/polish review. User acceptance and novice comprehension remain unmeasured.

## Comparison with the incumbent system

| Incumbent commitment | Finished extension and evidence |
| --- | --- |
| Warm cream/terracotta and warm dark counterpart | Explanation panels, spotlight and SVG connectors use the existing surface, ink and accent variables. Light and dark captures retain the established grounds and accents. The dimmer is a temporary focus treatment, not a replacement palette. |
| Locally hosted Nunito Sans under the Nunito CSS alias | Guide content inherits the existing family. Twenty-pixel headings, fourteen-pixel explanatory copy and thirteen-pixel progress preserve the established hierarchy. The 320-pixel captures show readable wrapping. |
| Flat Operate surfaces, native controls and restrained grouping | The welcome uses existing tint; the catalogue uses separated topic rows, a native search field and explicit Start actions. Existing work surfaces keep their incumbent treatment. The explanation panel alone uses the established temporary-surface shadow and radius. |
| Purposeful visual emphasis | The SVG overlay dims the surroundings, leaves the real target visible, outlines it in the shared accent and draws a curved connector from the nearby explanation. The arrow halo uses the existing surface color. No illustration, physical texture or decorative raster is introduced. |
| Responsive layout follows actual content | Pure geometry derives the spotlight and arrow from the current target rectangle and available viewport space. Controller hooks update placement on scroll, resize and ResizeObserver changes. Desktop explanation sits beside the stock control; narrow light/dark explanations sit below it, above mobile navigation. Missing or wrong-route targets receive no invented arrow. |
| Explicit actions, truthful conditions and optional help | The application introduction comes first, followed by the main features through Lanjut. Back, Skip and Pause remain available. Unavailable features carry prerequisite explanations. The guide navigates/explains without simulated business actions, automatic input or dummy business records. |
| Visible focus and reachable exits | Native buttons and the existing focus treatment remain in use. The nonmodal panel has a focusable step heading, Escape pause and focus restoration; it does not trap keyboard focus. The overlay ignores pointer events. Panel header/footer remain outside its scrolling explanation body. |
| Honest account/device boundaries | Progress v2 uses a separate namespace for the changed sequence, retains old data and validates scope and step values. Guest help and signed-in help remain distinct where account-only controls are unavailable. |

## Preservation and existing drift

The existing detector file `data/guide-arrow-detector.json` was read once as evidence; the detector was not rerun. It contains eight color, one radius and 44 font-size advisories. Seven color findings and the radius/type findings belong to previously disclosed system drift. The additional guide dimmer (`rgb(30 22 18 / .55)`) intentionally retains the existing dialog-backdrop hue (`rgb(30 22 18 / .5)`) with slightly stronger opacity for target focus. The finish reviewer accepted this local transient treatment. It does not authorize rewriting the durable palette or normalizing other advisory findings.

The previously disclosed DESIGN.md/sidecar timestamp and component discrepancies remain unchanged; the sidecar's `generatedAt` is `2026-10-13T17:15:36.770Z`. Neither design file was regenerated or repaired. SHA-256 checksums before and after this documentation write:

| Preserved file | SHA-256 |
| --- | --- |
| `DESIGN.md` | `769EC61803FCBC4BBAAD840A21DF02C1FCEB8996F7894891DFD5637C04491C04` |
| `.impeccable/design.json` | `C31FBFCB60AB61B3B4152B3A87E8B22CA5E1ABF008039EA8DC469584C742B51F` |

Only this evaluation document was written by the documenter. The ordinary-extension documentation obligation is complete at the reviewed v0.29 scope; the incumbent design authority and prior drift remain preserved.
