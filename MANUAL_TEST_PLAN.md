# Manual Test Plan

## Extension Setup
- Load the unpacked extension in `chrome://extensions` and ensure it starts without manifest errors.
- Open the background service worker console to watch logs emitted by `AITabGrouper`.

## Scenario 1 – Baseline Grouping
- Open a fresh Chrome window.
- Navigate to three development tabs (e.g., `https://github.com`, `https://stackoverflow.com`, `https://developer.mozilla.org`).
- Expectation: tabs group under an AI-generated or rule-based title (`Work`, `Development`, etc.) with an allowed color.

## Scenario 2 – Mock Mode
- Remove the API key in the options page to trigger mock responses.
- Open `https://www.facebook.com`, `https://www.instagram.com`, and `https://www.twitter.com`.
- Expectation: mock grouping creates a "Social Media" group (red).

## Scenario 3 – Existing Group Reuse
- With a "Email" group already created, open `https://mail.google.com`.
- Expectation: tab joins the existing "Email" group; log should show reuse of the group ID.

## Scenario 4 – Incognito and Disallowed Schemes
- Open an incognito window and navigate to any site.
- Expectation: background logs note skipping incognito; no grouping occurs.
- Navigate to `chrome://extensions`.
- Expectation: tab is ignored with log stating unsupported scheme.

## Scenario 5 – Debounce & Rate Limits
- Set provider to `openai`, then fire off 8–10 tabs quickly (e.g., multiple news sites via middle-click). Expect only one analysis per tab and no bursty API calls.
- Repeat with provider `gemini`; confirm the debounce behavior and that failed responses cleanly pop the rate-limit history.
- Repeat with provider `zai`; confirm identical rate-limit handling and that the service worker logs denote the Z.ai endpoint.

## Scenario 6 – Environment Key Fallback
- Clear any stored API key in options and set provider to `gemini`; reload the service worker.
- Trigger a grouping event and verify a single INFO log announcing environment key usage, with a POST to `https://generativelanguage.googleapis.com/v1/models/{model}:generateContent` carrying the `x-goog-api-key` header.
- Clear logs, set provider to `zai`, and trigger another grouping. Expect a POST to `https://api.z.ai/api/paas/v4/chat/completions` with `Authorization: Bearer ...` and a `glm-4.6` model payload.
- Remove environment keys entirely (or stub them out) and ensure a WARN is logged and no network call fires.

## Scenario 7 – Manual Mode
- In the popup, switch grouping mode to `manual`.
- Open a new tab such as `https://www.netflix.com`.
- Expectation: log indicates manual mode; no auto-grouping applied.

## Scenario 8 – Error Handling
- Temporarily provide an invalid API key via options.
- Open `https://www.bbc.com`.
- Expectation: API call fails gracefully with log output; tab remains ungrouped and service worker stays responsive.

## Scenario 9 – Popup Controls
- Use popup to pause grouping.
- Open `https://www.amazon.com`.
- Expectation: status indicator shows `Paused`; tab remains ungrouped.
- Resume grouping, reload the tab, and verify it now groups.
