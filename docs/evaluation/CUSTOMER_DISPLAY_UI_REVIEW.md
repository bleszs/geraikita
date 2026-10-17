## verdict

1. **Resolved — scope-clear promise.** `clearDisplaySecrets()` in `public/app.js` now clears the link, pending creation token/key, revoke state and deferred focus, and increments the creation epoch. All three authentication-loss handlers invoke it before clearing account state; logout and adoption from signed-out state also invoke it. The account-switch browser case asserts the former token/result is absent after a mocked 401 and registration of another account; its pass is recorded in `data/display-browser-reviewed.log`. The recaptured management view preserves the existing result and controls for the current account.
2. **Resolved — hide-old-codes promise.** `public/display-screen.js` now clears codes when visibility pauses the stream and at connection start before a fresh authorized payload can render. The hide/revoke/resume browser case asserts immediate code removal while hidden and no codes after revoked authorization on resume; its pass is recorded in the same log. Reopened desktop/mobile/dark captures preserve the live board, while reopened offline/revoked captures contain no order codes.

All six recaptured files at the original supplied paths are valid and were reopened. No material regression from this fix batch is visible in those captures or the changed lifecycle paths. The log records six individual passes and a `6 passed` summary; this review does not certify the runner's process exit. This verdict scores the two prior findings only and does not repeat the whole-surface review.

## remaining

Clear for the two scored material fixes. Preserve the cream/terracotta/Nunito system and durable design files.

disposition: ship
