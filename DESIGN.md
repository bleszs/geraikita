---
name: Gerai Kita
description: A warm neighborhood kedai interface for clear stock and collective purchasing decisions.
colors:
  canvas: "#fcfaf6"
  surface: "#fffdf9"
  rail: "#f3eee5"
  tint: "#f8eee3"
  ink: "#382c24"
  muted: "#75665b"
  line: "#e7ded1"
  accent: "#a3452b"
  accent-hover: "#85351f"
  accent-soft: "#f7e7d9"
  accent-ink: "#75351f"
  green: "#3d6653"
  green-bg: "#e9f0e8"
  warn: "#8b5424"
  warn-bg: "#f8ebd6"
  focus: "#8d421e"
  dark-canvas: "#241f1c"
  dark-surface: "#2e2723"
  dark-rail: "#302820"
  dark-tint: "#392e25"
  dark-ink: "#f4e9df"
  dark-muted: "#c7b6a8"
  dark-line: "#514238"
  dark-accent: "#e5a07f"
  dark-accent-hover: "#f0b698"
  dark-accent-soft: "#493124"
  dark-accent-ink: "#f3b798"
  dark-green: "#bad3bd"
  dark-green-bg: "#2f3d32"
  dark-warn: "#f0c295"
  dark-warn-bg: "#453729"
  dark-focus: "#f2bd92"
typography:
  display:
    fontFamily: "Nunito, 'Segoe UI', sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Nunito, 'Segoe UI', sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Nunito, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  subtitle:
    fontFamily: "Nunito, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.55
  body:
    fontFamily: "Nunito, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Nunito, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.55
  action:
    fontFamily: "Nunito, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 800
    lineHeight: 1.55
  status:
    fontFamily: "Nunito, 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 800
    lineHeight: 1.4
rounded:
  tag: "5px"
  field: "8px"
  control: "9px"
  toast: "10px"
  panel: "14px"
  circle: "50%"
spacing:
  compact: "8px"
  item: "12px"
  inset: "16px"
  mobile: "20px"
  section: "24px"
  desktop-narrow: "28px"
  panel: "30px"
  desktop: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.canvas}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-secondary-hover:
    backgroundColor: "{colors.tint}"
  text-action:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    padding: "3px 0"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "42px"
    width: "42px"
  field:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
  navigation:
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  navigation-current:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  tag:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.muted}"
    typography: "{typography.status}"
    rounded: "{rounded.tag}"
    padding: "4px 8px"
  tag-warning:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn}"
  tag-good:
    backgroundColor: "{colors.green-bg}"
    textColor: "{colors.green}"
  tag-warm:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "25px"
  context-panel:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  quantity-flow:
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    padding: "22px 0"
  stock-row:
    textColor: "{colors.ink}"
    padding: "18px 14px"
---

# Design System: Gerai Kita

## Overview

**Creative North Star: "The Neighborhood Kedai"**

Gerai Kita feels like a familiar neighborhood kedai: cream surfaces, deep terracotta actions, warm brown writing, and plain Indonesian labels. The user chose this warm direction. It supports owners making everyday stock and shared purchasing decisions with readable figures and explicit choices.

The implemented interface is moderately dense, with generous panel insets and compact secondary labels. Flat panels and fine separators organize the work; prominent arithmetic connects individual demand, collective demand, approved surplus, and the amount still to purchase. Dark mode preserves that warm material character through brown surfaces and peach terracotta accents.

**Key Characteristics:**

- Cream and terracotta as the familiar base and action pair.
- Rounded Nunito Sans text with bold, tabular figures.
- Flat panels, light borders, and restrained tonal grouping.
- Visible quantity breakdowns, units, and named status labels.
- Responsive task layouts with explicit keyboard focus.

## Colors

The palette combines warm paper and brown ink with terracotta actions, sage success states, and ochre warnings; the frontmatter holds the exact light and dark values.

### Primary

- **Kedai Terracotta** (`accent`, `accent-hover`): main actions, text actions, carets, and selected progress markers.
- **Terracotta Wash and Deep Terracotta Ink** (`accent-soft`, `accent-ink`): collective purchasing panels, selected navigation, and warm tags.
- **Terracotta Focus** (`focus`): the visible keyboard outline, separate from action fill.

### Secondary

- **Sage Status** (`green`, `green-bg`): sufficient stock, successful operations, and approved transfer notices. Always pair the color with words or a recognizable line icon.
- **Ochre Attention** (`warn`, `warn-bg`): low stock and warnings, with explicit status labels.

### Neutral

- **Cream Canvas and Paper Surface** (`canvas`, `surface`): page ground and contained work areas.
- **Oat Rail and Warm Tint** (`rail`, `tint`): persistent navigation, table headings, icon containers, and contextual explanation panels.
- **Brown Ink and Muted Brown** (`ink`, `muted`): main reading and secondary descriptions.
- **Paper Edge** (`line`): panel borders and separators.
- **Warm Dark Counterparts** (`dark-*`): the complete alternate set assigned to the same CSS variables under `data-theme="dark"`. Keep the semantic assignments when changing theme.

### Named Rules

**The Warm Ground Rule.** Use the cream canvas and paper surfaces for light mode; carry the same warm character into the brown dark theme.

**The Named Status Rule.** Success and warning colors accompany a written status; color alone does not explain a stock or approval state.

## Typography

**Display Font:** Nunito Sans, hosted locally under the CSS family alias `Nunito`, with Segoe UI and sans-serif fallbacks.
**Body Font:** The same family and fallbacks. Local font files provide weights 400, 600, 700, 800, and 900.

**Character:** Rounded letters make a practical interface approachable. Strong headings and tabular figures provide clear emphasis without switching to a decorative display family.

### Hierarchy

- **Display:** the quantity-flow role, bold and tightly spaced. The standard flow uses the frontmatter display token; the compact feature uses (38px), rising to (48px) on wide screens and reducing to (32px) on phones and (28px) below the smallest breakpoint.
- **Headline:** the page title, with balanced wrapping. It reduces from the frontmatter headline size to (28px) at the narrower desktop breakpoint; phone titles remain (28px), then (26px) at the smallest breakpoint.
- **Title:** section headings. List-panel headings often use (18px), while signature feature headings use (27px) in the main desktop layout.
- **Subtitle:** local subsection headings and item group titles.
- **Body:** the base reading style. Supporting page and panel explanations commonly use (14px); paragraphs have a maximum width of (70ch).
- **Label:** form labels and compact explanations. Secondary descriptions frequently use (12px) or (11px).
- **Action:** bold, plainly labeled buttons.
- **Status:** compact sentence-case badges with the explicit state written out.

### Named Rules

**The Legible Arithmetic Rule.** Use tabular numerals for quantity flows, financial totals, ingredient calculations, and transaction values. Keep units visible and subordinate to the number.

## Layout

The desktop shell has a persistent rail (244px) beside a flexible work area. A top bar (76px) and a centered main region with maximum width (1440px) frame the content. The normal main inset is (30px 40px 0); large displays increase its top padding to (42px).

Repeated gaps and insets come from the spacing vocabulary in the frontmatter, with optical adjustments already present in specific components. Panels use (25px) padding at the standard desktop size, (22px) in narrower layouts, and (18px) on the smallest screens. Content grids use flexible `minmax(0, 1fr)` columns. Related list panels use an approximately equal two-column layout; task and context areas use a (1.6fr / 1fr) split.

At maximum width (1200px), the rail reduces to (220px) and the main horizontal inset to (28px). At (1000px), the main feature and task columns stack. At (760px), the rail becomes a toggleable fixed drawer (260px) below a sticky top bar (65px), the main inset becomes (24px 20px 0), and the main title action fills the available width. At (360px), horizontal insets reduce to (16px). The wide-layout adjustment starts at (1600px).

On phones, group allocations form a single column. The stock table becomes stacked two-column rows with the product identity spanning both columns and written shelf-life context below. Desktop-only summary metrics may be omitted, while the quantity equation remains visible with smaller figures and units on their own lines.

## Elevation & Depth

The resting interface uses flat tonal layers, fine borders, and separators. Shadows belong to temporary surfaces: the open phone drawer, toast, and reset dialog. The dialog also dims its surroundings through a translucent warm backdrop.

### Shadow Vocabulary

- **Temporary Surface:** `0 12px 36px rgb(56 44 36 / .13)` in light mode; `0 12px 36px rgb(0 0 0 / .3)` in dark mode.
- **Dialog Backdrop:** `rgb(30 22 18 / .5)`.

### Named Rules

**The Flat Workbench Rule.** Resting work panels use tone and borders. Reserve the shipped shadow for temporary surfaces.

The toast enters over (0.2s) with `cubic-bezier(.16,1,.3,1)` and an (8px) vertical translation. Buttons and navigation change color directly; the implementation has no decorative hover lift. Reduced-motion preference removes animations and transitions.

## Shapes

Panels have gentle corners using the panel radius. Controls and navigation use the tighter control radius; fields and notices use the field radius; compact tags use the tag radius. Circular avatars and progress numbers are small identity and sequence markers, rather than card decoration.

Panel borders and content separators use a single-pixel paper-edge stroke. Collective feature separators mix the action color at (20%) with transparency. Inline SVG icons share a (24-unit) viewBox, rounded caps and joins, and a stroke width of (1.7); most render at (20px). The favicon and shop mark are vector geometry. No raster imagery ships in this visual system; review screenshots are QA artifacts.

## Components

### Buttons

Confident controls use explicit Indonesian action labels and compact line icons.

- **Primary:** terracotta fill and canvas-colored text, with the action typography and control radius; minimum height (46px).
- **Secondary:** transparent fill, brown ink, and a single-pixel paper-edge border. Hover adds warm tint and changes the border to muted brown.
- **Text action:** terracotta text, minimum height (36px), and an underline on hover with offset (4px).
- **Icon button:** square outline control; hover adds warm tint. Header controls become smaller and borderless on phones.
- **Focus:** a (3px) solid focus-color outline with offset (4px).
- **Disabled:** opacity (0.55), unavailable cursor, and no primary or secondary hover change.

### Chips

Compact rectangular tags use the status typography and tag radius. Neutral, warm, warning, and good variants pair semantic text and background colors. Tags communicate state; they are not filter buttons.

### Cards / Containers

Paper panels use a single-pixel border and the panel radius, with no resting shadow. Warm-tint context panels explain recommendations. Terracotta-wash panels group collective demand and the remaining purchase amount. Content lists use separators inside the panel rather than separate miniature cards.

### Inputs / Fields

Fields use the canvas ground, ink text, a single-pixel paper-edge border, the field radius, and minimum height (45px). Font size is (14px); placeholders use muted brown and the caret uses terracotta. Labels sit above the field. Focus uses the shared visible outline. Textareas have line height (1.8), minimum height (180px), and vertical resizing. Validation explanations are written near the task; no special invalid-field border treatment is defined.

Menu and stock-receipt editors reuse these fields and paper panels inline. Related fields form two columns on desktop and one on phones; phone editor inputs use (16px). Recipe labels state ingredient, per-portion quantity and unit. Receipt previews group the resulting balance and purchase cost above the save action. Ingredient quantities preserve up to four decimal places; count-based receipts use whole units. Editor headings have a scroll margin so the phone header does not hide them. Alias errors preserve inputs and appear next to the save action.

### Navigation

The desktop rail holds vertically stacked links with line icons, minimum height (46px), and bold (14px) labels. Default text is muted brown. Hover and `aria-current="page"` share the terracotta wash and deep accent text; the current link increases its weight to (800). The phone drawer uses the same link language and an explicitly labeled toggle.

### Quantity Breakdown

The signature component is a five-part grid: three labeled numeric columns connected by subtraction and equality signs. Demand minus approved surplus equals the remaining purchase quantity. Numbers use tabular figures; units stay adjacent on desktop and move below on phones. Collective membership labels and explanatory status text must match the displayed quantity state. Component specimens use synthetic values solely to show this visual relationship.

### Stock Rows

Desktop inventory rows align product identity, amount, state badge, and shelf-life context in a table. Mobile rows preserve those meanings while stacking them. Written warnings and sufficient-stock labels remain visible after the layout change.

### Surplus Offer Editor

An inline paper form keeps quantity, unit price and pickup duration together, with a full-width condition textarea. The heading names the shared ingredient. Readonly controls and written status distinguish an uncertain publication from an editable draft; offline disables mutations. The offer rows retain the existing material/context and add pending/completed quantities, a partial-request input and an owner withdrawal action. Conditions use an explicit label and wrap on phones. Transfer success preserves the recorded price and receiving status when a remaining offer is withdrawn.

### Next Steps and Mobile Navigation

The overview adds a restrained paper panel between the metric strip and collective breakdown. One priority row stays open; a native disclosure reveals the remaining steps. A symbol, short title, contextual sentence and labeled route link express the task without executing it. Offline uses an explicit last-data title. An active-business label accompanies the header avatar.

The phone bottom bar uses five equal touch targets for Overview, Orders, Stock, Collective and More. Shared tokens show the current destination; the complete sidebar remains available via More and the header toggle. Opening the sidebar hides the bottom bar, Escape restores focus to its trigger, and safe-area padding keeps the final page actions reachable. Desktop retains the sidebar.

### Ingredient Editor

The ingredient form reuses the paper panel, two-column desktop fields and single-column phone layout. Name, unit, low-stock threshold and optional storage note stay labeled. Unit is readonly after creation; the shared egg name also stays readonly. Stock rows provide a labeled edit action with a 44px target. Empty stock has a written warning even at a zero threshold. Validation keeps field values and provides a catalog reload action; offline disables catalog mutations.

### Connection and Pending Orders

The connection banner uses the warning surface/text tokens, shared border/radius and explicit server status with the last snapshot timestamp. Desktop places recovery beside the text; phones stack it. A pending-count shortcut reaches the existing order route. Pending orders reuse separated transaction rows, with (44px) text-action targets, original saved-price context and explicit draft/uncertain delivery labels. Offline order entry states that manual input is available; server actions are disabled. These components describe connection state without implying stock was updated by a device draft.

### Collective Receiving

The collective route switches from planning to receiving after explicit approval and saving the plan. A three-column quantity breakdown shows agreed, received and remaining supplier portions with tabular figures; units stack on phones. The existing paper form and warm context panel separate the next receipt preview from recorded costs. Member progress and personal cycle history reuse transaction separators and written status tags. Partial quantities, the one-time shipping share and completed surplus stay explicit; a saved plan never implies goods were received.

The schema-version-2 sidecar contains ten self-contained component specimens with scoped CSS, inline SVG geometry, and the shipped hover, focus, and disabled states where applicable. It extends these tokens rather than redefining a separate system.

## Do's and Don'ts

### Do:

- **Do** keep cream surfaces, terracotta actions, and warm brown text together in light mode.
- **Do** retain the matching warm dark color assignments when switching theme.
- **Do** pair tabular quantities with clear units and written explanations.
- **Do** name stock and approval states in words as well as color.
- **Do** preserve the visible focus outline and the reduced-motion behavior.
- **Do** keep quantity breakdowns readable when their units stack on phones.

### Don't:

- **Don't** add resting shadows to ordinary work panels.
- **Don't** replace the locally hosted reading family with a decorative display face.
- **Don't** replace semantic stock and approval labels with color-only markers.
- **Don't** hide the remaining purchase quantity or its units to fit a smaller layout.

Extraction scope: `public/styles.css`, `public/index.html`, rendered component patterns in `public/app.js`, inline geometry in `public/icons.js`, the confirmed surface direction, and final light/dark desktop and mobile QA screenshots. This records the current local prototype; it does not establish backend behavior. `PRODUCT.md` remains in its existing legacy structure and was not migrated. The PWA installation and browser theme metadata use the terracotta accent; the application canvas remains cream.

Collective receipt correction reuses the inline paper form and warm cost ledger. The editor states quantity, original cost, and shipping before the reason field and explicit stock/cost confirmation. Cancelled rows retain their original figures with a written status, reason and timestamp; active totals exclude them. Only the latest eligible own batch offers a correction action. Validation preserves the reason, stale stock can be refreshed, and an uncertain response locks the original payload until recovery. Actions stack at 320px; labels and status text remain visible.

Metric receipt entry adds a native unit selector beside the ingredient, followed by quantity and input price. Helper text names the unchanged stock unit and the price unit. The preview writes the equality explicitly (250 gram = 0,25 kg), then projected stock and total cost. Changing ingredient or unit clears quantity/price; validation preserves other fields and clears stale server errors when edited. History pairs canonical quantity with original received quantity and price. Existing paper surfaces, type and terracotta actions stay unchanged.

A personal receipt with an uncertain response reuses the inline editor as a review surface: its heading, intro and helper text switch to recovery copy. Quantity, received unit, price and supplier stay locked to their original values. The preview shows original quantity/cost and asks for current stock to be checked, without projecting another stock increment. Closing the form keeps a written pending notice with a reopen action, including offline; explicit retry requires the server. The overview links to the same recovery surface.

Personal receipt cancellation extends the existing inline review pattern in History. A quantity/cost breakdown precedes the reason and explicit stock/cost checkbox. A stale-stock rejection retains the reason and offers a refresh; an uncertain response locks the original reason until recovery. Original amounts and cancellation reasons remain in the receipt ledger and CSV. Pending cancellation links from Overview and Stock return to History; new receipt entry waits while recovery is unresolved. Existing surfaces, spacing, type and terracotta actions stay in place.
