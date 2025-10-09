# Phase 7: Automated Testing Framework Plan

## Testing Strategy

### 1. Unit Tests with Jest
- Test individual methods of AITabGrouper class
- Mock Chrome APIs using jest.mock
- Test files to create:
  - `tests/background.test.js` - Core background logic
  - `tests/llm-integration.test.js` - LLM API calls and retry logic
  - `tests/grouping-logic.test.js` - Grouping decision logic
  - `tests/batch-processing.test.js` - Batch processing tests
  - `tests/notifications.test.js` - Notification handling

### 2. Test Setup
- Install dependencies:
  - `jest` - Testing framework
  - `@types/chrome` - TypeScript definitions for Chrome APIs
  - Chrome API mocks (custom or sinon-chrome)
- Add test scripts to package.json
- Create jest.config.js

### 3. Key Test Scenarios
From MANUAL_TEST_PLAN.md:
- ✅ Mock mode fallback
- ✅ Existing group reuse
- ✅ Incognito/disallowed URL filtering
- ✅ Debounce & rate limiting
- ✅ Environment key fallback
- ✅ Manual mode behavior
- ✅ Error handling & retry logic
- ✅ Batch processing
- ✅ Notification handling

### 4. Chrome API Mocking Pattern
```javascript
global.chrome = {
  tabs: {
    onCreated: { addListener: jest.fn() },
    onUpdated: { addListener: jest.fn() },
    onRemoved: { addListener: jest.fn() },
    query: jest.fn(),
    get: jest.fn(),
    group: jest.fn()
  },
  tabGroups: {
    TAB_GROUP_ID_NONE: -1,
    query: jest.fn(),
    update: jest.fn(),
    onCreated: { addListener: jest.fn() },
    onUpdated: { addListener: jest.fn() },
    onRemoved: { addListener: jest.fn() }
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn(),
    onClicked: { addListener: jest.fn() }
  },
  runtime: {
    onMessage: { addListener: jest.fn() }
  },
  scripting: {
    executeScript: jest.fn()
  }
};
```

### 5. Sample Test Structure
```javascript
describe('AITabGrouper', () => {
  let tabGrouper;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Create fresh instance
    tabGrouper = new AITabGrouper();
  });

  describe('Batch Processing', () => {
    test('should batch multiple rapid tab creations', async () => {
      // ...
    });
  });

  describe('Retry Logic', () => {
    test('should retry on 429 rate limit error', async () => {
      // ...
    });

    test('should not retry on 401 auth error', async () => {
      // ...
    });
  });
});
```

## Implementation Order
1. Set up Jest configuration
2. Create Chrome API mocks
3. Write tests for core grouping logic
4. Write tests for LLM integration & retry
5. Write tests for batch processing
6. Write tests for notifications
7. Run tests and fix any issues
