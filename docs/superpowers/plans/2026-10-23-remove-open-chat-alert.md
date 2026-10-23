# Remove Open Chat Alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove only the unreliable custom alert for an already-open chat and its Chrome focus extension.

**Architecture:** Keep existing cross-tab presence, native-toast suppression and unread-count adjustment. Delete the separate incoming-message scanner, custom Audio/title alert and Chrome focus sensor; retain unrelated toast title blinking.

**Tech Stack:** JavaScript, Node.js `node:test`, Tampermonkey.

**Spec:** `docs/superpowers/specs/2026-10-23-remove-open-chat-alert-design.md`

## Global Constraints

- Preserve cross-tab suppression and count adjustment for the sender whose chat is open.
- Remove only the custom open-chat sound/title alert and focus extension.
- Do not change production `main`; publish test artifact only on `testes-codex`.

## Review Focus

- Incoming message in an open chat must not create a new Audio object or custom title blink; Task 1.
- Other senders' toast alerts must still work; Task 1.
- Opening/closing chat still publishes/clears shared presence; Task 1.
- Unread count still excludes the open sender; Task 1.
- Build output must update test userscript version and contain no focus-extension dependency; Task 2.

---

### Task 1: Remove custom open-chat notification

**Files:** `src/01-notificacao-visual-nova-mensagem.js`, `tests/chat-open-notifications.test.cjs`

**Interfaces:** Existing `checkMessages()`, `syncOpenChat()`, `isChatOpen()`, and unread-count logic remain; custom `scanOpenChatMessages()` and `notifyOpenChat()` go away.

- [ ] **Step 1: Write a failing behavioral test** proving an open conversation does not play script-created audio or start a custom title blink on a new received message, while other toast behavior stays intact.
- [ ] **Step 2: Run** `node --test tests/chat-open-notifications.test.cjs`; **Expected:** the new test fails on the current custom alert.
- [ ] **Step 3: Delete** the custom scanner, audio, focus observer and related state/calls; retain native-alert filtering and count logic. Remove tests that exclusively exercise removed functionality.
- [ ] **Step 4: Run** `node --test tests/chat-open-notifications.test.cjs`; **Expected:** all retained/new tests pass.
- [ ] **Step 5: Commit** source and tests.

### Task 2: Remove extension and publish test artifact

**Files:** `chrome-focus-extension/*` (delete), `tests/chrome-focus-extension.test.cjs` (delete), `README.md`, `tools/build.cjs`, `tests/architecture.test.cjs`, `klingo.test.user.js` (generated), approved spec/plan.

**Interfaces:** Test userscript version becomes `1.49`; branch URLs remain scoped to `testes-codex`.

- [ ] **Step 1: Update the release metadata test to require `1.49` and run** `node --test tests/architecture.test.cjs`; **Expected:** fail on current `1.48`.
- [ ] **Step 2: Remove** extension files and installation directions; change test build version to `1.49`; run `node tools/build.cjs`.
- [ ] **Step 3: Run** `node --test tests/*.test.cjs`, `node --check klingo.test.user.js`, `git diff --check`; **Expected:** all pass.
- [ ] **Step 4: Commit** files and push `testes-codex`; verify remote HEAD equals local HEAD.
