# Chrome Web Store Submission Guide

## Overview

This guide walks you through publishing TabStorm to the Chrome Web Store. The process typically takes 1-3 business days for initial review.

## Prerequisites

### Required

- [ ] **Chrome Web Store Developer Account** ($5 one-time registration fee)
  - Sign up at: https://chrome.google.com/webstore/devconsole
  - Payment required via Google Payments

- [ ] **Extension fully tested** following `DEPLOYMENT.md` checklist
- [ ] **All 11 automated tests passing** (`npm test`)
- [ ] **Icons created** (16x16, 48x48, 128x128 PNG format)
- [ ] **Screenshots prepared** (1280x800 or 640x400, 3-5 images)
- [ ] **Privacy Policy URL** (required since extension uses remote code/APIs)

### Nice to Have

- [ ] Promotional images (440x280, 920x680, 1400x560)
- [ ] Demo video (YouTube link)
- [ ] Support email or website

## Step 1: Pre-Submission Checklist

### Verify manifest.json

Current version from `manifest.json`:

```json
{
  "name": "TabStorm",
  "version": "1.0",
  "manifest_version": 3,
  "description": "A browser extension for grouping tabs with a storm theme"
}
```

**Updates needed**:

1. **Version format**: Change `"1.0"` to `"1.0.0"` (semantic versioning)
2. **Description**: Enhance to be more marketing-friendly (max 132 characters)

**Recommended manifest updates**:

```json
{
  "name": "TabStorm",
  "version": "1.0.0",
  "manifest_version": 3,
  "description": "AI-powered tab grouping with multi-LLM support. Keep your browser organized automatically."
}
```

### Required Assets

#### Icons

TabStorm needs icons in three sizes. Check if these exist:

```bash
ls -lh icons/icon16.png icons/icon48.png icons/icon128.png
```

**If missing**, create icons:
- Use a design tool (Figma, Canva, GIMP, Photoshop)
- Theme: Storm/lightning/organization
- Format: PNG with transparency
- Sizes: 16×16, 48×48, 128×128 pixels
- Design tips: Simple, recognizable at small sizes, memorable

**Quick option**: Use a placeholder generator
```
https://via.placeholder.com/128x128/1a73e8/ffffff?text=TS
```

#### Screenshots

Take 3-5 screenshots showing key features:

1. **Main popup with activity indicator**
   - Show "Batching" or "Analyzing" state
   - Highlight the real-time feedback

2. **Tabs grouped by category**
   - Full browser window showing colored tab groups
   - Multiple groups visible (Social, Work, Shopping, etc.)

3. **Options page**
   - Show API key configuration
   - Provider selection dropdown

4. **Batch processing in action**
   - Popup showing "X tabs queued" with "Group Now" button

5. **Error handling** (optional)
   - Show error message UI

**Screenshot requirements**:
- Format: PNG or JPEG
- Size: 1280×800 or 640×400 pixels
- Max: 5 screenshots
- Order: Most important features first

### Privacy Policy

**Required because**: Extension sends data to external APIs (LLM providers)

**Option 1**: Host on GitHub Pages

1. Create `PRIVACY_POLICY.md`:

```markdown
# TabStorm Privacy Policy

Last updated: November 9, 2025

## Data Collection

TabStorm does NOT collect, store, or transmit any user data to TabStorm servers.

## API Keys

- Stored locally in Chrome's sync storage
- Never transmitted to TabStorm servers
- Only used to authenticate with your chosen LLM provider

## Tab Content

When grouping tabs, TabStorm sends the following to your chosen LLM provider:
- Tab titles
- Tab URLs
- Page descriptions (if available)
- Page headings (if available)

This data is processed according to your LLM provider's privacy policy:
- **OpenAI**: https://openai.com/privacy
- **Anthropic**: https://anthropic.com/privacy
- **Google**: https://policies.google.com/privacy
- **Z.ai**: [insert Z.ai privacy policy URL]

## Data Storage

- Settings and API keys: Chrome's local/sync storage (managed by Chrome)
- No data stored on remote servers by TabStorm
- Data may be synced across your Chrome browsers if sync is enabled

## Permissions

TabStorm requires the following permissions:
- `tabs`: Read tab information (URLs, titles)
- `tabGroups`: Create and manage tab groups
- `storage`: Store settings and API keys
- `scripting`: Extract page content for grouping
- `notifications`: Show manual mode grouping suggestions
- `<all_urls>`: Access tab content for better grouping decisions

## Third-Party Services

TabStorm integrates with external LLM APIs. When you use TabStorm:
- Tab data is sent to your chosen provider's API
- API responses are processed locally
- No intermediate servers used by TabStorm

## Changes to This Policy

We may update this privacy policy. Changes will be posted at this URL with an updated "Last updated" date.

## Contact

For privacy concerns: [your-email@example.com]

GitHub: https://github.com/Coldaine/TabStorm
```

2. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Source: Deploy from branch
   - Branch: main / docs or main / root
   - Save

3. Access at: `https://coldaine.github.io/TabStorm/PRIVACY_POLICY.html`

**Option 2**: Host on your own website

**Option 3**: Use GitHub raw URL (not recommended, but works):
```
https://raw.githubusercontent.com/Coldaine/TabStorm/main/PRIVACY_POLICY.md
```

## Step 2: Package the Extension

### Clean Build

```bash
# Ensure dependencies are installed
npm install

# Run all validation
npm run validate

# Should output:
# - Lint: warnings only (no errors)
# - Tests: 11/11 passing
```

### Create ZIP Package

**What to include**:
- All source files (`.js`, `.html`, `.css`)
- `manifest.json`
- `icons/` directory
- `README.md` (optional but recommended)

**What to exclude**:
- `node_modules/` (never include)
- `tests/` directory
- `.git/` directory
- `package.json` and `package-lock.json` (dev only)
- `*.md` files except README (optional)
- `.eslintrc.js`, `.prettierrc`, etc. (dev only)

**Create package**:

```bash
# From TabStorm directory
zip -r tabstorm-v1.0.0.zip . \
  -x "*.git*" \
  -x "node_modules/*" \
  -x "tests/*" \
  -x "*.md" \
  -x "package*.json" \
  -x ".eslintrc*" \
  -x ".prettierrc*" \
  -x "*.test.js"

# Verify package contents
unzip -l tabstorm-v1.0.0.zip
```

**Expected files in ZIP**:
```
manifest.json
background.js
popup.html
popup.js
options.html
options.js
content.js
styles.css
icons/icon16.png
icons/icon48.png
icons/icon128.png
README.md (optional)
```

**Size check**: Should be < 10 MB (likely < 1 MB for TabStorm)

## Step 3: Chrome Web Store Listing

### Access Developer Dashboard

1. Go to: https://chrome.google.com/webstore/devconsole
2. Sign in with your Google account
3. Pay $5 registration fee (if first time)
4. Click **"New Item"**

### Upload Package

1. Click **"Choose file"**
2. Select `tabstorm-v1.0.0.zip`
3. Click **"Upload"**
4. Wait for processing (usually 30 seconds)
5. If errors, fix and re-upload

**Common upload errors**:
- "Manifest version is required": Check manifest.json syntax
- "Invalid icon": Ensure icons are PNG and correct sizes
- "Permissions warnings": Expected for `<all_urls>`, continue

### Store Listing Details

#### Product Details

**Item name**: `TabStorm`
- Must match `manifest.json` name
- Cannot be changed after first submission

**Summary** (132 characters max):
```
AI-powered tab grouping with multi-LLM support. Automatically organize your browser tabs by topic with real-time feedback.
```

**Detailed Description** (16,000 characters max):

```
# TabStorm - AI-Powered Tab Grouping

Stop drowning in browser tabs! TabStorm automatically organizes your tabs into color-coded groups using advanced AI, keeping your workspace clean and productive.

## 🌟 Key Features

### Automatic Tab Grouping
- Groups tabs by topic as you browse
- Supports OpenAI, Anthropic (Claude), Google Gemini, and Z.ai
- Real-time activity indicator shows grouping progress
- Batch processing for efficiency

### Flexible Modes
- **Automatic**: Groups tabs instantly
- **Manual**: Review suggestions before grouping
- **Mock**: Test without API costs

### Smart Grouping
- Reuses existing groups when appropriate
- Creates new groups for different topics
- Assigns intuitive colors (Social=red, Work=purple, Shopping=green)
- Groups by similarity, not just domain

### Real-Time Feedback
- Activity indicator shows current status (Idle/Batching/Analyzing)
- Batch countdown with "Group Now" button
- Error messages with recovery actions
- Mock mode indication

## 🚀 Getting Started

1. Install TabStorm
2. Click extension icon → More Settings
3. Choose your LLM provider (OpenAI, Anthropic, Gemini, or Z.ai)
4. Enter your API key
5. Start browsing - tabs group automatically!

## 🔒 Privacy & Security

- Your API keys stay local (never sent to TabStorm servers)
- Tab content analyzed only by your chosen LLM provider
- No tracking or analytics
- Open source: https://github.com/Coldaine/TabStorm

## 💡 Use Cases

Perfect for:
- Researchers managing 50+ tabs
- Developers with docs, dashboards, and PRs
- Students organizing class materials
- Anyone who keeps too many tabs open!

## 🎯 What's Grouped Together?

- **Social Media**: Facebook, Twitter, LinkedIn, Instagram
- **Email**: Gmail, Outlook, Yahoo Mail
- **News**: CNN, BBC, NY Times, Reddit
- **Shopping**: Amazon, eBay, Etsy
- **Entertainment**: YouTube, Netflix, Spotify
- **Work**: Google Docs, Slack, Zoom, Office 365
- And more - AI learns from content!

## 🛠️ Technical Details

- Manifest V3 (latest Chrome standard)
- Batch processing (waits 2s to group multiple tabs efficiently)
- Rate limiting to respect API limits
- Fallback mode if API unavailable
- Environment variable support for dev teams

## 📊 Comparison

| Feature | TabStorm | Other Tab Managers |
|---------|----------|-------------------|
| AI Grouping | ✅ Multi-LLM | ❌ Rule-based only |
| Real-time Status | ✅ Activity indicator | ❌ Silent |
| Batch Processing | ✅ Efficient | ⚠️ One-by-one |
| Manual Mode | ✅ Review first | ❌ Auto only |
| Open Source | ✅ GitHub | ❌ Closed |

## ❓ FAQ

**Q: Do I need an API key?**
A: Yes, for AI grouping. Or use Mock mode for free testing.

**Q: Which LLM is best?**
A: OpenAI (fast, accurate), Anthropic (nuanced), Gemini (cost-effective). Try each!

**Q: How much does it cost?**
A: TabStorm is free. API costs: ~$0.001-0.01 per batch (negligible for normal use).

**Q: Can I use my own LLM endpoint?**
A: Yes! Select "Custom API" and enter your OpenAI-compatible endpoint.

**Q: Does it work in incognito?**
A: No, for privacy reasons. Incognito tabs are never processed.

## 🤝 Support

- GitHub Issues: https://github.com/Coldaine/TabStorm/issues
- Email: [your-support-email]

## 🙏 Credits

Created with ❤️ for tab hoarders everywhere.
```

**Category**: `Productivity`

**Language**: `English`

#### Pricing & Distribution

- **Pricing**: Select "Free"
- **Regions**: All regions (or select specific countries)
- **Visibility**: Public

#### Privacy

**Privacy policy URL**: `https://coldaine.github.io/TabStorm/PRIVACY_POLICY.html`

**Single Purpose Description**:
```
TabStorm's single purpose is to automatically organize browser tabs into groups based on their content, using AI to intelligently categorize tabs by topic.
```

**Permission Justifications**:

| Permission | Justification |
|-----------|---------------|
| `tabs` | Required to read tab URLs and titles for grouping |
| `tabGroups` | Required to create and manage tab groups |
| `storage` | Required to save user settings and API keys |
| `scripting` | Required to extract page content for better grouping |
| `notifications` | Required to show manual mode grouping suggestions |
| `<all_urls>` | Required to read tab content for intelligent grouping across all websites |

**Data Usage**: Check all that apply:
- ☑️ "Communicates with remote servers"
  - Justification: "Sends tab data to user-selected LLM API for grouping analysis"

**Certification**: Check:
- ☑️ "This extension complies with Chrome Web Store policies"

#### Graphics

**Store Icon**: Upload `icons/icon128.png` (128×128)

**Screenshots**: Upload 3-5 screenshots (drag to reorder by importance)

**Promotional Images** (optional but recommended):
- Small: 440×280
- Marquee: 1400×560
- Create in Canva, Figma, or similar

**Video** (optional): YouTube or Vimeo URL showing extension in action

### Save Draft

Click **"Save Draft"** frequently to avoid losing changes.

## Step 4: Submit for Review

### Final Checklist

Before clicking "Submit for Review":

- [ ] All fields completed
- [ ] Privacy policy link works
- [ ] Screenshots show key features
- [ ] Description has no typos
- [ ] Icon looks good in preview
- [ ] Version is 1.0.0 in manifest
- [ ] Package ZIP tested by loading unpacked

### Submit

1. Click **"Submit for Review"**
2. Confirm you've tested the extension
3. Confirm compliance with policies

### Review Timeline

- **Typical**: 1-3 business days
- **First submission**: May take longer (up to 1 week)
- **Updates**: Usually faster (same day to 2 days)

**You'll receive email updates**:
- "Submission received" (immediate)
- "Under review" (within 24 hours)
- "Approved" or "Rejected with feedback" (1-3 days)

## Step 5: After Approval

### Publication

Once approved:
- Extension goes live immediately
- Available at: `https://chrome.google.com/webstore/detail/[extension-id]`
- Share link with users!

### Monitoring

**Developer Dashboard**:
- View install count
- Monitor ratings/reviews
- Check crash reports
- Track usage stats (if analytics added)

**Respond to Reviews**:
- Reply to user feedback within 7 days
- Address bug reports quickly
- Thank positive reviewers

### Updates

To publish an update:
1. Increment version in `manifest.json` (e.g., `1.0.0` → `1.0.1`)
2. Create new ZIP package
3. Upload to existing item (don't create new item)
4. Add "What's New" description
5. Submit for review

**Update review**: Usually faster than initial (24-48 hours)

## Common Rejection Reasons

### 1. Privacy Policy Missing/Incomplete

**Fix**: Ensure privacy policy:
- Is hosted and accessible
- Covers data sent to LLM APIs
- Explains permissions clearly
- Has contact information

### 2. Overly Broad Permissions

**Issue**: Reviewers may question `<all_urls>`

**Response**: Explain in appeal:
> "TabStorm requires `<all_urls>` permission to read tab content (titles, URLs, descriptions) for intelligent AI-based grouping. Without this permission, the extension cannot analyze tabs to determine appropriate groups. The permission is essential to the extension's core functionality."

### 3. Unclear Description

**Fix**: Ensure description clearly explains:
- What the extension does
- Why it needs permissions
- How user data is handled

### 4. Missing Justifications

**Fix**: Fill out all permission justification fields in the privacy section

### 5. Trademark Issues

**Issue**: "TabStorm" might conflict with existing trademarks

**Fix**: Search USPTO database first, or choose alternative name

## Tips for Faster Approval

1. **Test thoroughly**: Fewer bugs = faster review
2. **Clear description**: Reviewers should understand instantly
3. **Professional assets**: Good icons/screenshots signal quality
4. **Follow guidelines**: Read Chrome Web Store policies
5. **Respond quickly**: If reviewers ask questions, reply within 24 hours
6. **Be patient**: Don't re-submit while under review

## Post-Launch Checklist

After publishing:

- [ ] Test installation from Web Store
- [ ] Verify all features work in production
- [ ] Add Web Store link to README
- [ ] Share on social media / Product Hunt
- [ ] Monitor for crash reports
- [ ] Collect user feedback
- [ ] Plan first update based on feedback

## Resources

- **Chrome Web Store Developer Console**: https://chrome.google.com/webstore/devconsole
- **Program Policies**: https://developer.chrome.com/docs/webstore/program-policies
- **Branding Guidelines**: https://developer.chrome.com/docs/webstore/branding
- **Best Practices**: https://developer.chrome.com/docs/webstore/best_practices

## Estimated Timeline

| Phase | Duration |
|-------|----------|
| Prepare assets | 2-4 hours |
| Create listing | 1 hour |
| Initial review | 1-3 days |
| Fixes (if needed) | 1-2 hours |
| Re-review | 1-2 days |
| **Total** | **3-7 days** |

## Success Metrics

Track these after launch:
- Weekly active users (WAU)
- Average rating (target: 4.5+)
- Review sentiment
- Crash rate (target: <1%)
- Uninstall rate

Good luck! 🚀
