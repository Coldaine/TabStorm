# TabStorm Release Checklist - v1.0.0

This checklist outlines the final steps to ensure a smooth and successful release of TabStorm to the Chrome Web Store.

## 1. Pre-Submission Finalization

*   [ ] **Code Freeze:** Confirm that no new features or major changes are merged into the `release/mvp-v1.0` branch. Only critical bug fixes are allowed.
*   [ ] **Version Verification:** Double-check that `manifest.json` and `package.json` are both at version `1.0.0`.
*   [ ] **Final Test Suite Run:** Execute all automated tests and ensure they pass.
    ```bash
    npm test
    ```
*   [ ] **Manual Smoke Testing:** Perform a manual run-through of the core user journeys:
    *   [ ] Install the unpacked extension on a clean Chrome profile.
    *   [ ] Configure API keys for at least two different providers (e.g., OpenAI and a mock).
    *   [ ] Test Automatic Mode: Open several related tabs and confirm they are grouped as expected.
    *   [ ] Test Manual Mode: Open tabs, wait for a notification, and approve the grouping.
    *   [ ] Test Options Page: Change settings (mode, provider) and ensure they take effect immediately.
    *   [ ] Check for any errors in the service worker console.
*   [ ] **Documentation Review:** Read through `README.md` and `docs/MVP_DEPLOYMENT.md` to ensure accuracy and clarity.
*   [ ] **Create Production `.zip`:** Create a compressed archive of the extension's directory.
    *   **Important:** Exclude `node_modules`, `.git`, `.idea`, and any other development-specific files or folders.

## 2. Chrome Web Store Submission

*   [ ] **Developer Dashboard:** Log in to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard).
*   [ ] **Upload New Item:** Upload the prepared `.zip` file.
*   [ ] **Store Listing Details:**
    *   [ ] **Title:** `TabStorm`
    *   [ ] **Short Description:** Fill in a concise and compelling summary.
    *   [ ] **Detailed Description:** Provide a comprehensive overview of the features and benefits.
    *   [ ] **Icons:** Upload all required icon sizes (128x128, 48x48, 16x16).
    *   [ ] **Screenshots:** Upload high-quality screenshots that showcase the extension's UI and functionality.
    *   [ ] **Category:** Select "Productivity".
    *   [ ] **Language:** Set to "English (United States)".
*   [ ] **Privacy Practices:**
    *   [ ] **Single Purpose:** Justify why the extension's purpose is narrow and easy to understand.
    *   [ ] **Permissions Justification:** Clearly explain why each permission (`tabs`, `storage`, etc.) is necessary for the extension to function.
    *   [ ] **Data Usage:** Accurately disclose what user data is collected and how it is used. State that API keys are stored locally and transmitted only to the selected LLM provider.
*   [ ] **Publishing Options:**
    *   [ ] **Visibility:** Set to "Public".
    *   [ ] **Pricing:** Set to "Free".
*   [ ] **Submit for Review:** Click the "Submit for review" button.

## 3. Post-Release Monitoring

*   [ ] **Initial Monitoring (First 24-48 Hours):**
    *   [ ] Keep a close eye on the Developer Dashboard for any review feedback or issues.
    *   [ ] Monitor user feedback and reviews on the Chrome Web Store page.
    *   [ ] Check for any unexpected spikes in API usage on the LLM provider dashboards.
*   [ ] **Ongoing Support:**
    *   [ ] Establish a regular cadence for checking user reviews and support requests.
    *   [ ] Triage and prioritize any reported bugs or feature requests for future releases.
*   [ ] **Analytics (Future):**
    *   (Consider adding basic, privacy-preserving analytics in a future release to track active users and popular features).
