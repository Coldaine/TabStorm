# Roadmap Status – AI Tab Grouper

Last updated: October 8, 2025

This document captures the current progress against the implementation plan and highlights remaining work.

## Phase-by-Phase Progress

| Phase | Scope | Status | Notes |
|-------|-------|--------|-------|
| 0 | Project setup & planning | ✅ Complete | Manifest skeleton, icons, repo scaffolding in place prior to current iteration. |
| 1 | Manifest & permissions | ✅ Complete | MV3 manifest with `tabs`, `tabGroups`, `storage`, `scripting`, `content_scripts`, host permissions, popup/options defined. |
| 2 | Background service worker skeleton | ✅ Complete | `AITabGrouper` class instantiation, tab lifecycle listeners, mock fallback, rate limiting, configuration loading. |
| 3 | Tab grouping core logic | ✅ Complete | `executeGrouping`, `isUngrouped`, fallback rule-based classifier, group creation/reuse, tab content extraction. |
| 4 | LLM integration (mock) | ✅ Complete | Deterministic mock responses, manual mode, grouping toggle, storage-driven feature flag. |
| 5 | Real LLM API integration | 🟡 In progress | OpenAI/Anthropic previously wired. Current iteration added Gemini (`models.generateContent`) and Z.ai (`chat/completions`) with environment-key fallback and provider-specific normalization. Remaining: extended retry/backoff tuning, per-provider model/base overrides in UI, live endpoint validation. |
| 6 | Robustness & edge cases | ⬜ Not started | Debounce, incognito exclusion, disallowed scheme guard already present, but plan items like enhanced batching, notification flows, telemetry still pending. |
| 7 | Testing & debugging | 🟡 In progress | Manual test plan drafted (`MANUAL_TEST_PLAN.md`); no automated tests yet. Scenarios cover provider-switching, env fallback, debounce, error handling. |
| 8 | Optional UI controls | ⬜ Not started | Popup/options already expose grouping mode and provider selection; additional UX (API key manager, domain exclusions, etc.) outstanding. |

## Key Implementation Highlights

- **Provider configuration**: `providerDefaults` centralizes base URLs, default models, and response normalization logic for OpenAI, Anthropic, Gemini, Z.ai, and custom endpoints.
- **API key sourcing**: `resolveApiKey` respects per-provider overrides from storage and falls back to environment variables when present, logging the discovery once per provider.
- **Request handling**: `callExternalLLM` enforces rate limits, selects provider-specific URLs/payloads, injects the correct auth headers (`Authorization`, `x-goog-api-key`), and normalizes responses before parsing.
- **UI updates**: Popup and options pages now include Z.ai in the provider list; options validation warns (instead of blocking) when Gemini/Z.ai keys are omitted but env keys are available.
- **Testing guidance**: Updated manual test plan enumerates scenarios for OpenAI, Gemini, and Z.ai, including environment fallback verification.

## Outstanding Work & Next Steps

1. **Robustness & Production Readiness**
   - Rate limit handling & backoff strategies for all providers.
   - Batch/tab-window heuristics to reduce duplicate prompts.
   - Optional user notifications in manual mode.
   - Structured logging / telemetry for production debugging.

2. **Automated testing**
   - Add unit tests with mocked `chrome.*` APIs (`sinon-chrome` or custom stubs).
   - Consider integration harness (e.g., Puppeteer/Playwright) for validating grouping flows.

3. **UI/UX polish**
   - API key manager UX (per-provider storage, visibility toggles).
   - Domain exclusion lists, manual regroup actions, or status indicators in popup.

4. **Release preparation**
   - Verify packaging requirements (icons, versioning, Chrome Web Store metadata).
   - Run through manual test plan on clean profiles ahead of submission.

Feel free to update this document as additional phases are completed or requirements evolve.