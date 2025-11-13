# MVP Deployment Guide for TabStorm

This document provides essential steps for deploying the MVP version of TabStorm to the Chrome Web Store.

## Quick Start Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Coldaine/TabStorm.git
    cd TabStorm
    ```
2.  **Checkout the release branch:**
    ```bash
    git checkout release/mvp-v1.0
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Load the extension in Chrome:**
    *   Navigate to `chrome://extensions/`.
    *   Enable "Developer mode" in the top right corner.
    *   Click "Load unpacked".
    *   Select the `TabStorm` directory.

## API Key Configuration

TabStorm requires API keys for the LLM providers to function.

1.  **Open TabStorm Options:**
    *   Click the TabStorm icon in the Chrome toolbar.
    *   Select "Options" from the menu.
2.  **Configure your provider:**
    *   Select your preferred LLM provider (e.g., OpenAI, Anthropic).
    *   Enter your API key in the corresponding input field.
    *   The key will be saved securely in `chrome.storage.sync`.

**Note:** As a fallback, you can set environment variables before launching Chrome.

```bash
export OPENAI_API_KEY="your-key-here"
# Launch Chrome from the same terminal
```

## Basic Troubleshooting

*   **Extension not working:**
    *   Ensure "Developer mode" is enabled in `chrome://extensions/`.
    *   Check the service worker console for errors. Click the "Inspect views" link for the service worker on the extensions page.
    *   Verify your API key is correct and has sufficient credits.
*   **Tabs not grouping:**
    *   Check if the grouping mode is set to "Automatic" or "Manual" in the options.
    *   Some URLs (like `chrome://` pages) cannot be processed.
    *   Check the service worker logs for any API errors.

## Chrome Web Store Preparation Checklist

1.  **Final Code Review:**
    *   [ ] Ensure no `console.log` statements are present in the production code.
    *   [ ] Verify the version number in `manifest.json` is correct (`1.0.0`).
    *   [ ] Run all tests one last time: `npm test`.
2.  **Create Production Build:**
    *   [ ] Create a `.zip` file of the entire extension directory. **Do not** include the `.git` folder or `node_modules`.
3.  **Prepare Store Listing Assets:**
    *   [ ] **Extension Name:** TabStorm
    *   [ ] **Short Description:** AI-powered Chrome extension for intelligent tab grouping.
    *   [ ] **Screenshots:** At least one screenshot of the extension in action (popup, options page).
    *   [ ] **Icons:** Ensure you have 16x16, 48x48, and 128x128 icons.
    *   [ ] **Promotional Tile (Optional):** A 440x280 image.
4.  **Developer Account:**
    *   [ ] Ensure you have a registered Chrome Web Store developer account.
5.  **Submit for Review:**
    *   [ ] Upload the `.zip` file to the developer dashboard.
    *   [ ] Fill out the privacy policy and other required fields.
    *   [ ] Submit the extension for review.
