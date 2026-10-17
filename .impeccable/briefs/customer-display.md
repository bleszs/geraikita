# Customer display access — v0.35

Mode: Operate. Precisely scoped extension of the established cream/terracotta/Nunito system. User asked to continue SRS-priority TODO and explain next work; next complete slice is limited read-only customer display access rather than sharing owner login. No redesign, no new visual identity, preserve DESIGN.md and .impeccable/design.json byte-for-byte.

Owner creates a named expiring link with acknowledgement, sees/copies/opens it only in current memory, can revoke with inline review. Metadata list has no link or token hash. Pending network creation retains its same key/token in memory for explicit retry; never device storage. Scope change/logout/navigation clears sensitive transient UI.

Customer opens a standalone screen with no owner login or application bootstrap. Header explains matching the code provided by staff. Ready lane leads, preparing lane follows. Large tabular order codes, ordinary status text and empty states. No menu names, personal order labels, prices, quantities, stock or notes. Two columns on desktop, one on mobile. Theme follows system and can be toggled locally without storage. Live, offline/reconnecting and revoked states explicit; old codes hidden on loss/revocation. No public order entry or business data mutations.

Surface implementation: public/display-management.js inside existing account settings; public/display-screen.html/css/js delivered via /api/display/screen#token to bypass old PWA navigation workers. The opaque fragment is never sent as URL query/path; requests use bearer header, omit cookies and referrers. Server stores SHA256 only, scoped owner management, expiry, active stream checks. Not production deployment or staff RBAC.

Captures: data/display-captures/management-desktop.png, customer-desktop.png, customer-mobile.png, customer-dark.png, customer-offline.png, customer-revoked.png. Tests tests/display-access.test.mjs, display-http.test.mjs, real-display.spec.js. Reviewer writes only docs/evaluation/CUSTOMER_DISPLAY_UI_REVIEW.md; documenter only docs/evaluation/CUSTOMER_DISPLAY_DESIGN_CHECK.md. No design file changes and no unrelated issue repair.
