const AITabGrouper = require('../background');

describe('AITabGrouper - Batch Processing', () => {
  let tabGrouper;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();

    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      const result = { groupingMode: 'auto', groupingPaused: false };
      if (callback) callback(result);
      return Promise.resolve(result);
    });
    
    // Mock chrome.tabs.get to successfully return a tab
    chrome.tabs.get.mockImplementation(tabId => Promise.resolve({ id: tabId, url: `https://www.test${tabId}.com`, windowId: 1, title: `Test Tab ${tabId}` }));

    tabGrouper = new AITabGrouper();
    tabGrouper.useMock = false;
    tabGrouper.apiKey = 'test-api-key';
  });

  test('should batch multiple rapid tab creations into a single LLM call', async () => {
    const tab1 = { id: 1, url: 'https://www.site1.com', windowId: 1, title: 'Site 1' };
    const tab2 = { id: 2, url: 'https://www.site2.com', windowId: 1, title: 'Site 2' };
    const tab3 = { id: 3, url: 'https://www.site3.com', windowId: 1, title: 'Site 3' };

    const llmResponse = {
      shouldGroup: true,
      groupName: 'Batched Group',
      color: 'purple',
      existingGroupId: null,
      reasoning: 'These sites were batched together.'
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }),
    });
    chrome.tabs.group.mockResolvedValue(1001);

    // Simulate rapid tab creation
    tabGrouper.scheduleTabAnalysis(tab1);
    tabGrouper.scheduleTabAnalysis(tab2);
    tabGrouper.scheduleTabAnalysis(tab3);

    // Wait for batch processing to complete
    await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay + 100));

    // Assertions
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    // Check that the prompt contains info for all 3 tabs
    const fetchCallBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    const prompt = fetchCallBody.messages[0].content;
    expect(prompt).toContain('URL: https://www.site1.com');
    expect(prompt).toContain('URL: https://www.site2.com');
    expect(prompt).toContain('URL: https://www.site3.com');

    expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [1, 2, 3] });
    expect(chrome.tabGroups.update).toHaveBeenCalledWith(1001, {
      title: 'Batched Group',
      color: 'purple',
    });
  });

  test('should reset the batch timer if a new tab arrives before delay expires', async () => {
    const tab1 = { id: 1, url: 'https://www.site1.com', windowId: 1, title: 'Site 1' };
    const tab2 = { id: 2, url: 'https://www.site2.com', windowId: 1, title: 'Site 2' };

    // Schedule first tab
    tabGrouper.scheduleTabAnalysis(tab1);
    expect(tabGrouper.batchTimer).not.toBeNull();

    // Wait for a bit, but not enough to trigger the batch
    await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay - 500));

    // Schedule second tab, which should reset the timer
    tabGrouper.scheduleTabAnalysis(tab2);

    // The batch should not have been processed yet
    expect(global.fetch).not.toHaveBeenCalled();
    expect(tabGrouper.pendingTabs.size).toBe(2);

    // Wait for the reset timer to fire
    await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay + 100));

    // Now the batch should be processed
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('should not process tabs that are no longer valid or have been closed', async () => {
    const tab1 = { id: 1, url: 'https://www.valid.com', windowId: 1, title: 'Valid' };
    const tab2 = { id: 2, url: 'https://www.closed.com', windowId: 1, title: 'Closed' };

    // Mock chrome.tabs.get to throw an error for the closed tab
    chrome.tabs.get.mockImplementation(tabId => {
      if (tabId === 2) {
        return Promise.reject(new Error('Tab not found'));
      }
      return Promise.resolve({ id: tabId, url: `https://www.test${tabId}.com`, windowId: 1, title: `Test Tab ${tabId}` });
    });
    
    const llmResponse = { shouldGroup: true, groupName: 'Valid Group', color: 'green' };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }),
    });
    chrome.tabs.group.mockResolvedValue(1002);

    // Schedule both tabs
    tabGrouper.scheduleTabAnalysis(tab1);
    tabGrouper.scheduleTabAnalysis(tab2);

    // Trigger batch processing and wait for it to complete
    await new Promise(resolve => setTimeout(resolve, tabGrouper.batchDelay + 100));

    // Assertions
    expect(global.fetch).toHaveBeenCalledTimes(1);
    // Only the valid tab should be in the prompt and grouped
    const fetchCallBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    const prompt = fetchCallBody.messages[0].content;
    expect(prompt).toContain('URL: https://www.valid.com');
    expect(prompt).not.toContain('URL: https://www.closed.com');
    expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [1] });
  });
});
