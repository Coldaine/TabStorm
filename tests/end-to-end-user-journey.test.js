// tests/end-to-end-user-journey.test.js
// End-to-end tests covering complete user journeys from start to finish
// These tests verify the entire user experience, not just code units

describe('TabStorm - End-to-End User Journeys', () => {
  let env;
  let tabGrouper;
  let AITabGrouper;

  beforeAll(() => {
    // Require after behavioral fakes are set up
    AITabGrouper = require('../background');
  });

  beforeEach(() => {
    env = global.testEnv;
    tabGrouper = new AITabGrouper();

    // Configure for testing
    tabGrouper.useMock = false;
    tabGrouper.apiKey = 'test-key';
    tabGrouper.llmProvider = 'openai';
  });

  afterEach(() => {
    env.reset();
  });

  describe('First-Time User Experience', () => {
    test('should guide new user through complete setup and first grouping', async () => {
      // User installs extension - no settings configured yet
      expect(env.storage.storage.get('groupingMode')).toBeUndefined();
      expect(env.storage.storage.get('apiKey')).toBeUndefined();

      // User opens extension popup for first time
      // (Simulated by checking default behavior)

      // User opens some tabs to group
      const gmailTab = await env.createTab('https://mail.google.com');
      const calendarTab = await env.createTab('https://calendar.google.com');
      const docsTab = await env.createTab('https://docs.google.com');

      // Extension should use mock mode initially (no API key)
      tabGrouper.apiKey = null;
      tabGrouper.useMock = true;

      // Wait for automatic grouping
      await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay + 100));

      // Verify tabs were grouped using pattern matching
      const groups = env.getGroupsInWindow();
      expect(groups).toHaveLength(1);
      expect(groups[0].title).toBe('Work'); // Pattern-based grouping
      expect(groups[0].color).toBe('purple');

      // Verify all tabs are in the group
      const groupedTabs = env.getTabsInWindow().filter(tab => tab.groupId === groups[0].id);
      expect(groupedTabs).toHaveLength(3);

      // User notices grouping worked and decides to set up AI
      // Simulate setting API key via options
      env.runtime._sendMessage({
        action: 'updateApiKey',
        apiKey: 'sk-test123',
        llmProvider: 'openai'
      });

      // Verify API key was updated
      expect(tabGrouper.apiKey).toBe('sk-test123');
      expect(tabGrouper.llmProvider).toBe('openai');
      expect(tabGrouper.useMock).toBe(false);

      // User opens more tabs to test AI grouping
      env.llmProvider.addResponse(JSON.stringify({
        shouldGroup: true,
        groupName: 'Creative Projects',
        color: 'pink',
        existingGroupId: null,
        reasoning: 'Design and creative work tools'
      }));

      const figmaTab = await env.createTab('https://figma.com');
      const canvaTab = await env.createTab('https://canva.com');

      // Wait for AI-powered grouping
      await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay + 100));

      // Verify AI grouping worked
      const allGroups = env.getGroupsInWindow();
      expect(allGroups).toHaveLength(2); // Original work group + new creative group

      const creativeGroup = allGroups.find(g => g.title === 'Creative Projects');
      expect(creativeGroup).toBeDefined();
      expect(creativeGroup.color).toBe('pink');

      // Verify LLM was called for the new tabs
      expect(env.llmProvider.getCallHistory()).toHaveLength(1);
    });
  });

  describe('Power User Workflow', () => {
    beforeEach(async () => {
      // Set up experienced user configuration
      env.storage.sync.set({
        groupingMode: 'auto',
        groupingPaused: false
      });

      tabGrouper.apiKey = 'sk-experienced-user';
      tabGrouper.llmProvider = 'anthropic';
      tabGrouper.useMock = false;
    });

    test('should handle complex multi-group workspace efficiently', async () => {
      // User has multiple existing groups
      const workGroup = env.createGroup('Development', 'blue');
      const researchGroup = env.createGroup('Research', 'yellow');
      const entertainmentGroup = env.createGroup('Entertainment', 'red');

      // Add some tabs to existing groups
      await env.tabs.update(1, { groupId: workGroup.id });
      await env.tabs.update(2, { groupId: researchGroup.id });

      // Set up AI responses for different batches
      env.llmProvider.addResponse(JSON.stringify({
        shouldGroup: true,
        groupName: 'Development',
        color: 'blue',
        existingGroupId: workGroup.id,
        reasoning: 'Additional development tools'
      }));

      env.llmProvider.addResponse(JSON.stringify({
        shouldGroup: true,
        groupName: 'Research Papers',
        color: 'yellow',
        existingGroupId: researchGroup.id,
        reasoning: 'Academic research materials'
      }));

      env.llmProvider.addResponse(JSON.stringify({
        shouldGroup: false,
        reasoning: 'Unrelated personal and work tabs'
      }));

      // User opens multiple batches of tabs
      // Batch 1: More development tools
      const vscodeTab = await env.createTab('https://vscode.dev');
      const githubTab = await env.createTab('https://github.com');

      // Batch 2: Research papers
      const arxivTab = await env.createTab('https://arxiv.org');
      const scholarTab = await env.createTab('https://scholar.google.com');

      // Batch 3: Mixed personal/work
      const redditTab = await env.createTab('https://reddit.com');
      const linkedinTab = await env.createTab('https://linkedin.com');

      // Wait for all batch processing
      await new Promise(resolve => setTimeout(resolve, (tabGrouper.batchDelay + 100) * 3));

      // Verify correct grouping decisions
      const finalGroups = env.getGroupsInWindow();
      expect(finalGroups).toHaveLength(3); // Same number of groups

      // Verify development group grew
      const devTabs = env.getTabsInWindow().filter(tab => tab.groupId === workGroup.id);
      expect(devTabs).toHaveLength(3); // Original + vscode + github

      // Verify research group grew
      const researchTabs = env.getTabsInWindow().filter(tab => tab.groupId === researchGroup.id);
      expect(researchTabs).toHaveLength(3); // Original + arxiv + scholar

      // Verify mixed tabs stayed ungrouped
      const ungroupedTabs = env.getTabsInWindow().filter(tab => tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE);
      expect(ungroupedTabs).toHaveLength(2); // reddit + linkedin

      // Verify AI was called for each batch
      expect(env.llmProvider.getCallHistory()).toHaveLength(3);
    });

    test('should handle manual mode for precise control', async () => {
      // Switch to manual mode
      env.storage.sync.set({ groupingMode: 'manual' });

      // Set up AI suggestions
      env.llmProvider.addResponse(JSON.stringify({
        shouldGroup: true,
        groupName: 'Shopping',
        color: 'green',
        existingGroupId: null,
        reasoning: 'E-commerce and shopping sites'
      }));

      env.llmProvider.addResponse(JSON.stringify({
        shouldGroup: true,
        groupName: 'News & Media',
        color: 'orange',
        existingGroupId: null,
        reasoning: 'News and media consumption'
      }));

      // User opens shopping tabs
      const amazonTab = await env.createTab('https://amazon.com');
      const ebayTab = await env.createTab('https://ebay.com');

      // User opens news tabs
      const cnnTab = await env.createTab('https://cnn.com');
      const nytTab = await env.createTab('https://nytimes.com');

      // Wait for notifications
      await new Promise(resolve => setTimeout(resolve, (tabGrouper.batchDelay + 100) * 2));

      // Verify notifications were created
      const notifications = Array.from(env.notifications.notifications.values());
      expect(notifications).toHaveLength(2);

      const shoppingNotification = notifications.find(n => n.message.includes('Shopping'));
      const newsNotification = notifications.find(n => n.message.includes('News & Media'));

      expect(shoppingNotification).toBeDefined();
      expect(newsNotification).toBeDefined();

      // User approves shopping grouping
      env.clickNotification(shoppingNotification.id);

      // Verify shopping group was created
      let groups = env.getGroupsInWindow();
      expect(groups).toHaveLength(1);
      expect(groups[0].title).toBe('Shopping');

      // User ignores news notification (doesn't click)
      // Verify news tabs remain ungrouped
      const ungroupedTabs = env.getTabsInWindow().filter(tab => tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE);
      expect(ungroupedTabs).toHaveLength(2); // cnn + nyt

      // Verify notifications are managed correctly
      expect(env.notifications.notifications.has(shoppingNotification.id)).toBe(false); // Cleared
      expect(env.notifications.notifications.has(newsNotification.id)).toBe(true); // Still there
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover gracefully from API failures and continue working', async () => {
      // Start with working API
      env.llmProvider.addResponse(JSON.stringify({
        shouldGroup: true,
        groupName: 'Working Group',
        color: 'blue',
        existingGroupId: null,
        reasoning: 'Initial working response'
      }));

      // Create initial tabs
      const tab1 = await env.createTab('https://working1.com');
      const tab2 = await env.createTab('https://working2.com');

      // Wait for successful grouping
      await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay + 100));

      let groups = env.getGroupsInWindow();
      expect(groups).toHaveLength(1);
      expect(groups[0].title).toBe('Working Group');

      // Now simulate API failure
      env.llmProvider.setFailureMode(true);

      // Create more tabs
      const tab3 = await env.createTab('https://failing1.com');
      const tab4 = await env.createTab('https://failing2.com');

      // Wait for processing with failure
      await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay + 100));

      // Verify fallback to pattern matching still worked
      groups = env.getGroupsInWindow();
      expect(groups).toHaveLength(2); // New group created via fallback

      const fallbackGroup = groups.find(g => g.title !== 'Working Group');
      expect(fallbackGroup).toBeDefined();
      expect(['Social Media', 'Email', 'News', 'Shopping', 'Entertainment', 'Work'].includes(fallbackGroup.title)).toBe(true);

      // Verify all tabs are still grouped
      const totalGroupedTabs = env.getTabsInWindow().filter(tab => tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE);
      expect(totalGroupedTabs).toHaveLength(4);

      // API recovers
      env.llmProvider.setFailureMode(false);
      env.llmProvider.addResponse(JSON.stringify({
        shouldGroup: true,
        groupName: 'Recovered Group',
        color: 'green',
        existingGroupId: null,
        reasoning: 'API recovered and working again'
      }));

      // Create final tabs
      const tab5 = await env.createTab('https://recovered1.com');
      const tab6 = await env.createTab('https://recovered2.com');

      // Wait for recovered processing
      await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay + 100));

      // Verify AI grouping works again
      groups = env.getGroupsInWindow();
      expect(groups).toHaveLength(3);

      const recoveredGroup = groups.find(g => g.title === 'Recovered Group');
      expect(recoveredGroup).toBeDefined();
      expect(recoveredGroup.color).toBe('green');
    });

    test('should handle configuration changes during operation', async () => {
      // Start with auto mode
      env.storage.sync.set({ groupingMode: 'auto' });

      env.llmProvider.addResponse(JSON.stringify({
        shouldGroup: true,
        groupName: 'Auto Group',
        color: 'blue',
        existingGroupId: null,
        reasoning: 'Auto mode grouping'
      }));

      // Create tabs in auto mode
      const tab1 = await env.createTab('https://auto1.com');
      const tab2 = await env.createTab('https://auto2.com');

      // Wait for auto grouping
      await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay + 100));

      expect(env.getGroupsInWindow()).toHaveLength(1);

      // User changes to manual mode via popup
      env.runtime._sendMessage({
        action: 'updateGroupingMode',
        mode: 'manual'
      });

      // Verify mode changed
      expect(tabGrouper.groupingMode).toBe('manual');

      // Create more tabs in manual mode
      env.llmProvider.addResponse(JSON.stringify({
        shouldGroup: true,
        groupName: 'Manual Group',
        color: 'red',
        existingGroupId: null,
        reasoning: 'Manual mode suggestion'
      }));

      const tab3 = await env.createTab('https://manual1.com');
      const tab4 = await env.createTab('https://manual2.com');

      // Wait for manual processing (notifications)
      await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay + 100));

      // Verify notification was created instead of automatic grouping
      const notifications = Array.from(env.notifications.notifications.values());
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Tab Grouping Suggestion');

      // Tabs should not be grouped yet
      const ungroupedTabs = env.getTabsInWindow().filter(tab => tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE);
      expect(ungroupedTabs).toHaveLength(2); // manual1 + manual2
    });
  });

  describe('Performance and Scale', () => {
    test('should handle rapid tab creation bursts efficiently', async () => {
      jest.useFakeTimers();

      // Set up AI response
      env.llmProvider.addResponse(JSON.stringify({
        shouldGroup: true,
        groupName: 'Burst Group',
        color: 'cyan',
        existingGroupId: null,
        reasoning: 'Handling rapid tab creation'
      }));

      // Simulate rapid tab creation (like opening multiple tabs at once)
      const tabs = [];
      for (let i = 0; i < 10; i++) {
        const tab = await env.createTab(`https://burst${i}.com`);
        tabs.push(tab);
        tabGrouper.scheduleTabAnalysis(tab);
      }

      // Advance time to process batch
      jest.advanceTimersByTime(tabGrouper.batchDelay + 100);

      // Verify efficient processing: only one LLM call for the entire batch
      expect(env.llmProvider.getCallHistory()).toHaveLength(1);

      // Verify all tabs were grouped together
      const groups = env.getGroupsInWindow();
      expect(groups).toHaveLength(1);

      const groupedTabs = env.getTabsInWindow().filter(tab => tab.groupId === groups[0].id);
      expect(groupedTabs).toHaveLength(10);

      jest.useRealTimers();
    });

    test('should maintain performance with many existing groups', async () => {
      // Create many existing groups (simulating long-term usage)
      const existingGroups = [];
      for (let i = 0; i < 20; i++) {
        const group = env.createGroup(`Group ${i}`, 'blue');
        existingGroups.push(group);
      }

      // Set up AI response that reuses an existing group
      env.llmProvider.addResponse(JSON.stringify({
        shouldGroup: true,
        groupName: 'Group 5',
        color: 'blue',
        existingGroupId: existingGroups[5].id,
        reasoning: 'Reusing existing group'
      }));

      // Create tabs to group
      const tab1 = await env.createTab('https://test1.com');
      const tab2 = await env.createTab('https://test2.com');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay + 100));

      // Verify efficient group reuse
      const groups = env.getGroupsInWindow();
      expect(groups).toHaveLength(20); // No new groups created

      // Verify tabs were added to the correct existing group
      const targetGroupTabs = env.getTabsInWindow().filter(tab => tab.groupId === existingGroups[5].id);
      expect(targetGroupTabs).toHaveLength(2);

      // Verify only one LLM call was made
      expect(env.llmProvider.getCallHistory()).toHaveLength(1);
    });
  });
});