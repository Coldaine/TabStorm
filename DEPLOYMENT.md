# TabStorm Deployment Guide

## Overview

TabStorm is a Chrome extension that automatically groups your tabs using AI. This guide covers loading the extension locally and preparing it for Chrome Web Store submission.

## Prerequisites

- **Chrome Browser**: Version 88 or higher
- **Node.js**: Version 18+ (for development only)
- **API Key**: At least one LLM provider key (OpenAI, Anthropic, Google Gemini, or Z.ai)

## Quick Start: Load Extension Locally

### Step 1: Install Dependencies (Development Only)

```bash
cd TabStorm
npm install
```

### Step 2: Enable Developer Mode in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle **Developer mode** ON (top-right corner)
3. You should see three new buttons appear: "Load unpacked", "Pack extension", "Update"

### Step 3: Load the Extension

1. Click **"Load unpacked"**
2. Navigate to and select the `TabStorm` directory (the root folder containing `manifest.json`)
3. The extension should appear in your extensions list
4. Pin the extension icon to your toolbar for easy access (click the puzzle piece icon, then pin TabStorm)

### Step 4: Configure API Key

1. Click the TabStorm icon in your toolbar
2. Click **"More Settings"** at the bottom or right-click the extension icon → **"Options"**
3. Select your preferred LLM provider:
   - **OpenAI**: Requires OpenAI API key
   - **Anthropic**: Requires Anthropic API key
   - **Google Gemini**: Requires Google AI API key
   - **Z.ai**: Requires Z.ai API key
4. Enter your API key in the corresponding field
5. Click **"Save Settings"**

**Alternative**: Set environment variables (see Environment Configuration below)

### Step 5: Test Basic Functionality

1. Open the TabStorm popup (click the icon)
2. Verify status shows "Idle" or "Idle (Mock Mode)"
3. Open 5-10 tabs on different topics:
   - Social media (Facebook, Twitter, LinkedIn)
   - Email (Gmail, Outlook)
   - News (CNN, BBC, NY Times)
   - Shopping (Amazon, eBay)
   - Entertainment (YouTube, Netflix)
4. Watch the activity indicator:
   - Should show "Batching X tabs" (wait 2 seconds)
   - Then "Analyzing..." (during API call)
   - Finally "Idle" (when complete)
5. Verify tabs are grouped by topic with colored group labels

## Environment Configuration

TabStorm supports environment variable fallback for API keys. This is useful for:
- Development/testing without configuring UI
- Shared team environments
- CI/CD pipelines

### Supported Environment Variables

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# Google Gemini (either variable)
export GEMINI_API_KEY="AI..."
export GOOGLE_API_KEY="AI..."  # Alternative

# Z.ai (either variable)
export ZAI_API_KEY="..."
export Z_AI_API_KEY="..."  # Alternative

# Custom endpoint (optional)
export CUSTOM_API_URL="https://your-api.com/v1"
```

### Priority Order

When resolving API keys, TabStorm checks in this order:
1. **Storage API key** (set via Options page) - **HIGHEST PRIORITY**
2. **Environment variable** - Fallback if storage is empty
3. **Mock mode** - Used if neither available

## Manual Testing Checklist

Before submitting to Chrome Web Store, verify all functionality:

### Core Features
- [ ] Extension loads without manifest errors
- [ ] Popup opens and displays current status
- [ ] Activity indicator shows correct states (Idle/Batching/Analyzing)
- [ ] Options page opens and saves settings
- [ ] API key persists after browser restart

### Tab Grouping
- [ ] Tabs group automatically in "auto" mode
- [ ] Tabs group correctly with OpenAI
- [ ] Tabs group correctly with Anthropic
- [ ] Tabs group correctly with Google Gemini
- [ ] Tabs group correctly with Z.ai
- [ ] Existing groups are reused when appropriate
- [ ] New groups are created when needed
- [ ] Group colors are assigned correctly

### Batch Processing
- [ ] Multiple tabs opened quickly (5-10) batch together
- [ ] Batch timer shows countdown in popup
- [ ] "Group Now" button triggers immediate grouping
- [ ] Batching completes within 5 seconds

### Manual Mode
- [ ] Manual mode requires user approval (notification shown)
- [ ] Notification click triggers grouping
- [ ] No automatic grouping occurs in manual mode

### Mock Mode
- [ ] Mock mode works without API key
- [ ] Mock mode creates deterministic groups
- [ ] Mock mode indicated in activity indicator

### Error Handling
- [ ] Invalid API key shows error message (check background console)
- [ ] Network errors handled gracefully
- [ ] Extension remains responsive after errors
- [ ] Tabs don't break if extension crashes

### Edge Cases
- [ ] Incognito tabs ignored (extension doesn't process them)
- [ ] Chrome internal pages ignored (chrome://, chrome-extension://)
- [ ] Extension survives browser restart
- [ ] No memory leaks after extended use (check Task Manager)

### Performance
- [ ] No lag when opening tabs
- [ ] Background page CPU usage reasonable (<5% idle)
- [ ] Memory usage stable (<50MB typical)

## Troubleshooting

### Extension Won't Load

**Error**: "Manifest file is missing or unreadable"
- **Solution**: Ensure you selected the root `TabStorm` directory, not a subdirectory
- **Verify**: Directory should contain `manifest.json` at the top level

**Error**: "Failed to load extension"
- **Solution**: Check console for syntax errors: `npm run lint`
- **Solution**: Verify manifest.json is valid JSON

### Tabs Not Grouping

**Check 1**: Open background page console
- Go to `chrome://extensions/`
- Find TabStorm
- Click "background page" under "Inspect views"
- Look for error messages

**Check 2**: Verify API key is configured
- Open Options page
- Check that API key field is filled
- Try re-entering the key

**Check 3**: Check grouping mode
- Open popup
- Verify mode is set to "Automatic"
- Not "Manual" or "Disabled"

**Check 4**: Verify provider is correct
- If using OpenAI key, provider must be set to "OpenAI"
- Mismatched provider/key combinations won't work

### Extension Crashes or Freezes

1. Check background page console for errors
2. Disable other extensions to check for conflicts
3. Try reloading the extension: `chrome://extensions/` → Reload button
4. As last resort, remove and reinstall extension

### API Rate Limits

If you hit rate limits:
- Check background console for "429" errors
- Wait a few minutes before trying again
- Consider upgrading your API plan
- Reduce tab opening frequency

## Advanced Configuration

### Batch Window Adjustment

The extension waits 2 seconds before processing a batch of tabs. To adjust:

1. Open `background.js`
2. Find: `this.batchDelay = 2000; // 2 seconds for batching`
3. Change to desired milliseconds (e.g., `3000` for 3 seconds)
4. Reload extension

**Trade-offs**:
- Lower delay = faster grouping, more API calls
- Higher delay = fewer API calls, but slower user experience

### Custom LLM Endpoint

To use a custom OpenAI-compatible endpoint:

1. Set environment variable: `export CUSTOM_API_URL="https://your-api.com/v1"`
2. In popup, select "Custom API" as provider
3. Enter your API key in Options
4. Extension will send requests to your endpoint

## Development Mode

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Linting

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

### Validate Before Submission

```bash
# Run all checks (lint + tests)
npm run validate
```

## Next Steps

Once you've verified everything works:

1. **Test with real usage**: Use the extension for a full day of normal browsing
2. **Check for edge cases**: Try unusual scenarios (100+ tabs, rapid opening/closing)
3. **Get feedback**: Have team members test the extension
4. **Prepare for submission**: See `CHROME_WEB_STORE_SUBMISSION.md`

## Support

If you encounter issues:
1. Check the [troubleshooting section](#troubleshooting) above
2. Review background page console logs
3. Check `MANUAL_TEST_PLAN.md` for test scenarios
4. Open an issue on GitHub with logs and steps to reproduce

## Security Notes

- API keys are stored locally in Chrome's storage (never sent to TabStorm servers)
- Tab URLs and titles are sent only to your chosen LLM provider
- No telemetry or analytics collected by TabStorm
- Extension requires `<all_urls>` permission to read tab content for grouping
- Environment variables are only read at startup (not monitored continuously)

## License

See LICENSE file in repository root.
