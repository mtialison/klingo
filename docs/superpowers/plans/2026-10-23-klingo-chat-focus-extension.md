# Klingo Chat Focus Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify for an incoming message in an open Klingo chat only in that tab and only while that Chrome tab/window is in the background.

**Architecture:** A domain-limited MV3 extension reports Chrome foreground state through a DOM attribute; the userscript retains chat detection, cross-tab suppression and notification output. An observer-aware arrival detector handles Klingo's capped/reused message list.

**Tech Stack:** JavaScript, Chrome Manifest V3, Node.js `node:test`, Tampermonkey.

**Spec:** `docs/superpowers/specs/2026-10-23-klingo-chat-focus-extension-design.md`

## Global Constraints

- Extension access limited to Klingo pages; no patient or message content passed to the extension or stored in diagnostics.
- Missing/stale extension state preserves the current document-focus fallback.
- No automatic extension installation or production promotion.
- Publish only to Git branch `testes-codex` after tests and build pass.

## Review Focus

- Rapid tab switching: alert only if the chat tab is inactive at arrival; cover in Task 1.
- Switching Chrome windows or to another application: focused window and active tab must both match; cover in Task 1.
- Extension missing/stale: userscript fallback remains functional; cover in Task 2.
- A capped 50-item list receiving repeated identical messages: each true arrival is detected once; cover in Task 3.
- Modal rerender, history load, or own outbound message: no incoming alert; cover in Task 3.

---

### Task 1: Chrome focus sensor

**Files:**
- Create: `chrome-focus-extension/manifest.json`
- Create: `chrome-focus-extension/background.js`
- Create: `chrome-focus-extension/content.js`
- Create: `tests/chrome-focus-extension.test.cjs`

**Interfaces:**
- Produces DOM attributes `data-tm-chrome-foreground` (`true`/`false`) and `data-tm-chrome-focus-at` (Unix milliseconds) on `document.documentElement`.
- The extension does not receive or inspect chat content.

- [ ] **Step 1: Write failing tests** for manifest host scope, focused-window/active-tab evaluation, initial state, tab/window changes and refresh of the two DOM attributes.
- [ ] **Step 2: Run** `node --test tests/chrome-focus-extension.test.cjs`; **Expected:** fail because extension files/functions do not exist.
- [ ] **Step 3: Implement** the smallest MV3 service worker and content script that publish the documented attributes. State is queried on startup and periodically, and refreshed when browser activation/focus events occur.
- [ ] **Step 4: Run** `node --test tests/chrome-focus-extension.test.cjs`; **Expected:** all tests pass.
- [ ] **Step 5: Commit** `chrome-focus-extension/* tests/chrome-focus-extension.test.cjs`.

### Task 2: Userscript consumes browser foreground state

**Files:**
- Modify: `src/01-notificacao-visual-nova-mensagem.js`
- Modify: `tests/chat-open-notifications.test.cjs`

**Interfaces:**
- Consumes Task 1 DOM attributes.
- Produces `isChatTabBackground()` returning a boolean and uses it for incoming chat alerts and clearing title blink.

- [ ] **Step 1: Write failing tests** for fresh extension foreground/background state, stale/absent state fallback and blink reset on becoming foreground.
- [ ] **Step 2: Run** `node --test tests/chat-open-notifications.test.cjs`; **Expected:** new tests fail for missing `isChatTabBackground()`/focus handling.
- [ ] **Step 3: Implement** `isChatTabBackground()` and focus-change handling in the userscript without modifying unrelated notification paths.
- [ ] **Step 4: Run** `node --test tests/chat-open-notifications.test.cjs`; **Expected:** all tests pass.
- [ ] **Step 5: Commit** the userscript source and tests.

### Task 3: Arrival detection for capped/reused chat list

**Files:**
- Modify: `src/01-notificacao-visual-nova-mensagem.js`
- Modify: `tests/chat-open-notifications.test.cjs`

**Interfaces:**
- Keeps existing `scanOpenChatMessages()` call sites; incoming detection may receive MutationObserver records or maintain a cursor/sequence in memory.
- Calls `notifyOpenChat()` at most once for each genuine incoming arrival while the chat tab is in the background.

- [ ] **Step 1: Write failing tests** for repeated identical incoming messages at 50 items, tail text mutation, modal/history rerender, own outgoing message, and switching sender.
- [ ] **Step 2: Run** `node --test tests/chat-open-notifications.test.cjs`; **Expected:** new tests fail on capped/reused list detection.
- [ ] **Step 3: Implement** DOM-mutation-aware arrival detection with a baseline on modal/sender change and de-duplication across scan and observer callbacks.
- [ ] **Step 4: Run** `node --test tests/chat-open-notifications.test.cjs`; **Expected:** all tests pass.
- [ ] **Step 5: Commit** the detector and tests.

### Task 4: Build, installation instructions and release

**Files:**
- Modify: `tools/build.cjs`
- Modify: `README.md`
- Modify: `klingo.test.user.js` (generated)
- Modify: `klingo.user.js` (generated local artifact, not necessarily tracked on `testes-codex`)

**Interfaces:**
- Builds a test userscript with version `1.48` and unchanged branch-scoped update URLs.
- README describes manual loading via `chrome://extensions`, permissions, and two-tab validation.

- [ ] **Step 1: Write failing test** for version `1.48` and extension setup guidance in the build/docs validation test or a new focused test.
- [ ] **Step 2: Run** the focused test; **Expected:** fail with current version/guidance.
- [ ] **Step 3: Update** build metadata and README; run `node tools/build.cjs`.
- [ ] **Step 4: Run** `node --test tests/*.test.cjs`, `node --check klingo.test.user.js`, and `git diff --check`; **Expected:** all pass.
- [ ] **Step 5: Commit** the build/docs/generated test artifact and the approved spec/plan, then push `testes-codex` and verify remote HEAD.
