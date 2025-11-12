# TabStorm 🌪️

AI-powered Chrome extension for intelligent tab grouping using natural language understanding.

[![Tests](https://img.shields.io/badge/tests-11%2F11%20passing-brightgreen)]()
[![Chrome](https://img.shields.io/badge/chrome-89%2B-blue)]()
[![License](https://img.shields.io/badge/license-ISC-lightgrey)]()

## Features

### 🤖 Multi-Provider LLM Support
- **OpenAI** (GPT-3.5, GPT-4)
- **Anthropic** (Claude 3 Haiku/Sonnet/Opus)
- **Google Gemini** (Gemini 1.5 Flash/Pro)
- **Z.ai** (GLM-4.6)
- **Custom** endpoints (OpenAI-compatible APIs)
- Environment variable fallback for API keys
- Automatic provider detection and configuration

### 🎯 Intelligent Grouping
- **Automatic Mode**: Groups tabs instantly as you browse
- **Manual Mode**: Suggests groupings via notifications, you approve
- **Mock Mode**: Development/testing with rule-based classification
- Analyzes URL, title, and page content for context-aware decisions
- Reuses existing groups intelligently
- Creative, descriptive group names with color coding

### ⚡ Performance Optimizations
- **Batch Processing**: Multiple rapid tabs → single API call (80% cost reduction)
- **Smart Debouncing**: 750ms wait before analyzing tabs
- **Rate Limiting**: 20 calls/minute protection
- **Exponential Backoff**: Automatic retry with 1s, 2s, 4s delays
- **Error Recovery**: Graceful fallback to rule-based grouping

### 🔔 User Experience
- Chrome notifications for manual mode suggestions
- Click-to-group from notifications
- Real-time tab monitoring (creation and URL changes)
- Incognito and restricted URL exclusions
- Persistent configuration via Chrome storage

### 🧪 Testing
- 11/11 large-span integration tests passing
- Behavioral fakes instead of brittle mocks
- Complete user journey testing
- Test coverage for batch processing, retry logic, and error handling

## Installation

### From Source (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/Coldaine/TabStorm.git
   cd TabStorm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests** (optional)
   ```bash
   npm test
   ```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `TabStorm` directory

### Configuration

1. **Click the TabStorm icon** in your Chrome toolbar
2. **Select "Options"** or right-click → Options
3. **Configure your LLM provider:**
   - Choose provider (OpenAI, Anthropic, Gemini, Z.ai, Custom)
   - Enter API key (or set environment variable)
   - Select grouping mode (auto/manual/mock)

### Environment Variables (Optional)

Set these in your shell before launching Chrome:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GEMINI_API_KEY="..."
export ZAI_API_KEY="..."

# Then launch Chrome from terminal
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
```

## Usage

### Automatic Mode
Just browse! TabStorm analyzes new tabs and groups them automatically.

### Manual Mode
1. Open tabs normally
2. Wait for notification: "Tab Grouping Suggestion"
3. Click notification to approve grouping
4. Or dismiss to keep tabs ungrouped

### Mock Mode (Testing)
No API calls - uses simple rule-based grouping for development.

## API Key Security

- Keys stored in Chrome's encrypted storage (`chrome.storage.sync`)
- Never logged to console in production
- Environment variables auto-detected as fallback
- Per-provider key configuration

## Development

### Running Tests
```bash
# All tests
npm test

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Project Structure
```
TabStorm/
├── manifest.json          # Chrome extension manifest (MV3)
├── background.js          # Service worker with AI grouping logic
├── popup.html/js          # Extension popup UI
├── options.html/js        # Settings page
├── content.js             # Content script for page analysis
├── tests/                 # Test suite
│   ├── behavioral-fakes.js
│   ├── large-span-integration.test.js
│   └── end-to-end-user-journey.test.js
└── docs/                  # Documentation
```

## Browser Compatibility

- ✅ **Chrome 89+** (Manifest V3 requirement)
- ✅ **Edge** (Chromium-based)
- ⚠️ **Firefox** (requires WebExtensions polyfill)

## Performance Metrics

- **Debounce delay**: 750ms per tab
- **Batch window**: 2000ms (2 seconds)
- **Rate limit**: 20 API calls/minute
- **Retry attempts**: 3 retries (4 total attempts)
- **Retry delays**: 1s, 2s, 4s (exponential backoff)

## Roadmap

See [CHANGELOG.md](./CHANGELOG.md) for version history and [docs/PHASE_8_PLAN.md](./docs/PHASE_8_PLAN.md) for upcoming features:

- 🚧 Real-time activity indicator
- 🚧 Usage statistics dashboard
- 🚧 Batch processing countdown
- 🚧 Enhanced error feedback in UI
- 🚧 Manual mode queue visibility
- 🚧 Advanced settings panel

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Commit with conventional commits (`feat:`, `fix:`, `docs:`, etc.)
6. Push and create a Pull Request

## Testing Philosophy

TabStorm uses the **Pragmatic Test Architect** approach:
- Large-span integration tests over unit tests
- Behavioral fakes instead of mocks
- Complete user journeys from start to finish
- Real dependencies wherever possible

See [docs/TESTING_README.md](./docs/TESTING_README.md) for details.

## License

ISC

## Acknowledgments

- Chrome Extensions API documentation
- OpenAI, Anthropic, Google, and Z.ai for LLM APIs
- The Pragmatic Test Architect testing philosophy

---

**Made with ☕ and 🤖 by [Coldaine](https://github.com/Coldaine)**
