# Changelog

All notable changes to TabStorm will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive README with feature overview, installation, and usage instructions
- Documentation cleanup plan

### Changed
- Improved testing approach with Pragmatic Test Architect methodology

## [1.0.0] - 2025-10-08

### Added
- **Phase 6b: Batch Processing & Notifications**
  - Batch processing for rapid tab creation (2-second window)
  - Reduced API costs by ~80% for burst scenarios
  - Chrome notifications for manual mode suggestions
  - Click-to-group functionality from notifications
  - `pendingTabs` Map for queue management
  - `processPendingTabs()` method for batch operations

- **Phase 6: Robustness and Production Readiness**
  - Exponential backoff retry logic (1s, 2s, 4s delays)
  - Smart error handling (auth errors abort, rate limits retry)
  - Rate limiting protection (20 calls/minute)
  - Network error recovery
  - Max 3 retry attempts per API call

- **Testing Infrastructure**
  - Large-span integration testing framework
  - 11 comprehensive integration tests (11/11 passing)
  - Behavioral fakes instead of brittle mocks
  - End-to-end user journey tests
  - Complete test isolation and cleanup
  - Jest configuration with Chrome API mocks

- **Multi-Provider LLM Support**
  - OpenAI (GPT-3.5, GPT-4)
  - Anthropic (Claude 3 Haiku/Sonnet/Opus)
  - Google Gemini (Gemini 1.5 Flash/Pro)
  - Z.ai (GLM-4.6)
  - Custom OpenAI-compatible endpoints
  - Environment variable fallback for API keys
  - Provider-specific response normalization

### Changed
- Migrated from unit tests to large-span integration tests
- Removed mock-based test files in favor of behavioral fakes
- Updated testing philosophy to focus on user journeys

### Fixed
- Test isolation issues in large-span integration tests
- Batch processing timer conflicts
- API retry logic edge cases

## [0.5.0] - 2025-10-01

### Added
- Content analysis for improved grouping decisions
- Page content extraction via content scripts
- Meta description and keywords analysis
- Heading text extraction

### Changed
- Enhanced grouping accuracy with page content context
- Improved AI prompts with richer tab information

## [0.4.0] - 2025-09-28

### Added
- AI-powered dynamic grouping
- LLM integration framework
- Mock mode for development/testing
- Intelligent group name generation
- Group color selection
- Group reuse logic

### Changed
- Replaced static rules with AI decision-making
- Enhanced prompt engineering for better grouping

## [0.3.0] - 2025-09-25

### Added
- UI and configuration options
- Popup interface for quick controls
- Options page for settings
- API key configuration
- Grouping mode selection (auto/manual/mock)
- LLM provider selection

### Changed
- Improved user experience with visual controls

## [0.2.0] - 2025-09-20

### Added
- Core tab grouping logic with static rules
- Domain-based classification
- URL pattern matching
- Basic group creation and management

### Changed
- Initial grouping rules implementation

## [0.1.0] - 2025-09-15

### Added
- Initial project setup
- Chrome Manifest V3 configuration
- Basic tab monitoring (onCreate, onUpdated)
- Background service worker skeleton
- Project structure and dependencies
- Icons and basic assets

### Security
- Chrome storage for API keys (encrypted by Chrome)
- Incognito mode exclusions
- Restricted URL exclusions (chrome://, chrome-extension://)

---

## Legend

- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements

[Unreleased]: https://github.com/Coldaine/TabStorm/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Coldaine/TabStorm/releases/tag/v1.0.0
[0.5.0]: https://github.com/Coldaine/TabStorm/releases/tag/v0.5.0
[0.4.0]: https://github.com/Coldaine/TabStorm/releases/tag/v0.4.0
[0.3.0]: https://github.com/Coldaine/TabStorm/releases/tag/v0.3.0
[0.2.0]: https://github.com/Coldaine/TabStorm/releases/tag/v0.2.0
[0.1.0]: https://github.com/Coldaine/TabStorm/releases/tag/v0.1.0
