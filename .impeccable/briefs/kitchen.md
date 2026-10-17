# Operasional dapur

Mode: Operate. Ordinary extension of Gerai Kita's established cream/terracotta/Nunito system, not a redesign. The user's new three-page Smart Kitchen Command Center SRS takes functional priority. They explicitly approved retaining Node.js and vanilla modules rather than a Java/C++/React rewrite.

Task: the owner enters actual orders, follows SJF with aging per preparation station, marks passive work to free staff, marks ready and closes the order once. A second authenticated display follows state. Inventory is reserved at entry and consumed on completion using immutable recipes. Cancellation before work releases reserves; started work can only be closed with an explicit whole-order waste acknowledgement. Empty accounts remain empty.

First viewport: title and routes expose kitchen and service display in the familiar app shell. The board must be visible without hunting beneath setup fields; intake and voice are secondary tools. Mobile stacks the board and intake with no horizontal overflow. Large existing buttons and readable menu/label/station are the working vocabulary.

Signature interaction: passive task frees the active station; its next shortest task appears as the next action. A separate screen updates through scoped authenticated SSE. Voice is opt-in, four-second local capture batches, exact command/menu/label matching, no ambiguous state updates, stopped on navigation/logout/hide/error. No two-second latency or field accuracy claim.

Keep existing workflows, palette, fonts, DESIGN.md and .impeccable/design.json unchanged. No sample data added to live accounts. Demo synthetic records remain isolated. No public customer-token screen, staff RBAC, equipment capacity engine, external channel adapters or production SLA claim in this iteration.

Review evidence: public/kitchen-view.js, public/app.js, public/styles.css; tests/real-kitchen.spec.js; data/kitchen-captures/{desktop,mobile,dark}.png. Review empty and populated actual test-created records, command rejection, destructive acknowledgement and responsive layout. Documenter writes only docs/evaluation/KITCHEN_DESIGN_CHECK.md; reviewer only docs/evaluation/KITCHEN_UI_REVIEW.md.
