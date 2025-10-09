# TabStorm Testing Philosophy

Following the **Pragmatic Test Architect** approach, we focus on **large-span, behavior-first testing** that verifies complete user experiences rather than isolated code units.

## Core Testing Philosophy

### 🧭 What We Test

- **Complete user journeys** from start to finish
- **Observable behaviors** that users actually experience
- **Integration confidence** over isolated verification
- **Real dependencies** instead of mocks wherever possible

### 🧭 What We Don't Test

- Implementation details that change during refactoring
- Individual functions in isolation
- Mocked behaviors that don't reflect reality
- Code coverage for coverage's sake

## Test Layers

### Large-Span Integration Tests (`tests/large-span-integration.test.js`)

**Purpose**: Test complete features and user workflows
**Scope**: Service + real dependencies
**Speed**: <500ms per test
**Dependencies**: Behavioral fakes, test containers when needed

**Examples**:

- Complete tab creation → AI analysis → grouping workflow
- Settings changes and their effects on behavior
- Error handling and recovery scenarios
- Batch processing optimization

### End-to-End User Journey Tests (`tests/end-to-end-user-journey.test.js`)

**Purpose**: Test complete user experiences from installation to usage
**Scope**: Full system behavior
**Speed**: <2s per test
**Dependencies**: Everything real (via behavioral fakes)

**Examples**:

- First-time user setup and onboarding
- Power user workflows with complex configurations
- Error recovery and resilience
- Performance under load

### Legacy Unit Tests (Being Refactored)

**Purpose**: Complex algorithms only
**Scope**: Single functions with edge cases
**Speed**: <50ms per test
**Dependencies**: None (pure logic)

**Examples**:

- URL pattern matching algorithms
- API response parsing
- Rate limiting logic

## Behavioral Fakes vs Mocks

### Behavioral Fakes (What We Use)

```javascript
// Maintains state, simulates real behavior, fails like real systems
class FakeChromeTabs {
  create(properties) {
    // Actually creates tab objects, maintains state
    // Simulates real Chrome API behavior
  }
}
```

### Mocks (What We Avoid)

```javascript
// Just verifies calls, doesn't simulate real behavior
mockTabGroup.query = jest.fn().mockReturnValue([]);
```

## Test Infrastructure

### TabStormTestEnvironment

A comprehensive test environment that coordinates all behavioral fakes:

```javascript
const env = new TabStormTestEnvironment();

// Create realistic tabs
const tab = await env.createTab('https://github.com');

// Simulate user interactions
env.clickNotification(notificationId);

// Inspect results
const groups = env.getGroupsInWindow();
```

### LLM Provider Fake

Simulates AI API calls with configurable responses:

```javascript
// Set up expected AI responses
env.llmProvider.addResponse(JSON.stringify({
  shouldGroup: true,
  groupName: 'Development',
  color: 'blue',
  existingGroupId: null,
  reasoning: 'Programming tools'
}));

// Test failure scenarios
env.llmProvider.setFailureMode(true);
```

## Running Tests

```bash
# Run all tests
npm test

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Writing New Tests

### Template for Large-Span Tests

```javascript
describe('Feature Name', () => {
  test('should complete user journey from X to Y', async () => {
    // Setup: Configure environment and AI responses
    env.llmProvider.addResponse(/* expected AI decision */);

    // Execute: Perform user actions
    const tab1 = await env.createTab('url1');
    const tab2 = await env.createTab('url2');

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay + 100));

    // Verify: Check complete behavior
    const groups = env.getGroupsInWindow();
    expect(groups[0].title).toBe('Expected Group');

    const groupedTabs = env.getTabsInWindow().filter(tab => tab.groupId === groups[0].id);
    expect(groupedTabs).toHaveLength(2);
  });
});
```

## Test Organization

```
tests/
├── behavioral-fakes.js          # Core test infrastructure
├── setup.js                     # Jest configuration
├── large-span-integration.test.js    # Feature integration tests
├── end-to-end-user-journey.test.js   # Complete user workflows
├── retry-logic.test.js          # Legacy (being refactored)
├── grouping-logic.test.js       # Legacy (being refactored)
├── batch-processing.test.js     # Legacy (being refactored)
└── notifications.test.js        # Legacy (being refactored)
```


## Migration Strategy

### Phase 1: Infrastructure (Current)

- ✅ Create behavioral fakes
- ✅ Set up test environment
- ✅ Write large-span integration tests
- ✅ Write E2E user journey tests

### Phase 2: Consolidation (Next)

- 🔄 Identify tests that duplicate large-span coverage
- 🔄 Remove redundant micro-tests
- 🔄 Update remaining tests to use behavioral fakes

### Phase 3: Optimization (Future)

- 📋 Add performance assertions
- 📋 Implement trace-based testing for distributed flows
- 📋 Add contract tests for external API boundaries

## Success Metrics

| Metric | Target | Current Status |
|--------|--------|----------------|
| Test Count | -50% | In progress |
| Test Execution Time | <5 minutes | ✅ <30 seconds |
| Test Flakiness | <0.1% | ✅ 0% |
| Lines of Test Code | -30% | In progress |
| Production Bugs | -60% | N/A (new approach) |
| Test Failures on Refactor | <5% | ✅ Behavior-focused |

## Decision Framework

### Use Large-Span Tests When:

- Testing any user-facing feature
- Verifying complete workflows
- Checking error handling
- Validating performance
- **Default choice for 90% of tests**

### Use E2E Tests When:

- Testing first-time user experience
- Verifying installation → configuration → usage
- Checking cross-feature interactions
- Validating recovery scenarios

### Use Legacy Unit Tests Only When:

- Testing complex algorithms
- Verifying parsing logic
- Checking mathematical calculations
- **Can you explain why this can't be part of a larger test?**

## Common Patterns

### Testing AI Grouping Decisions

```javascript
env.llmProvider.addResponse(JSON.stringify({
  shouldGroup: true,
  groupName: 'Social Media',
  color: 'red',
  existingGroupId: null,
  reasoning: 'All tabs are social platforms'
}));
```

### Testing Error Scenarios

```javascript
env.llmProvider.setFailureMode(true);
// Test continues with fallback behavior
```

### Testing Configuration Changes

```javascript
env.runtime._sendMessage({
  action: 'updateGroupingMode',
  mode: 'manual'
});
// Verify behavior changes
```

### Testing Notifications

```javascript
env.clickNotification(notificationId);
// Verify grouping was executed
```

Remember: **Every test should tell a complete story about value delivered to users**. If you can't explain what user-facing behavior a test verifies, it shouldn't exist.
