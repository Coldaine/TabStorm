const AITabGrouper = require('../background');

describe('AITabGrouper - Retry and Error Handling', () => {
  let tabGrouper;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();

    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      const result = { groupingMode: 'auto', groupingPaused: false };
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    tabGrouper = new AITabGrouper();
    tabGrouper.useMock = false;
    tabGrouper.apiKey = 'test-api-key';
  });

  test('should retry on 429 rate limit error', async () => {
    const tab = { id: 1, url: 'https://www.somesite.com', windowId: 1, title: 'Some Site' };
    const llmResponse = { shouldGroup: true, groupName: 'Success Group', color: 'blue' };

    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }),
      });
    
    chrome.tabs.group.mockResolvedValue(2001);

    tabGrouper.analyzeAndGroupTabs([tab]);
    await new Promise(resolve => setTimeout(resolve, 1100)); // 1s for first retry + buffer

    // Assertions
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [1] });
    expect(chrome.tabGroups.update).toHaveBeenCalledWith(2001, {
      title: 'Success Group',
      color: 'blue',
    });
  });

  test('should not retry on 401 authentication error', async () => {
    const tab = { id: 2, url: 'https://www.auth-error.com', windowId: 1, title: 'Auth Error' };

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Invalid API Key'),
    });

    // Mock fallback classification
    chrome.tabGroups.query.mockResolvedValue([]);

    await tabGrouper.analyzeAndGroupTabs([tab]);
    await new Promise(resolve => setTimeout(resolve, 100));


    // Assertions
    expect(global.fetch).toHaveBeenCalledTimes(1);
    // Should not group via LLM
    expect(chrome.tabs.group).not.toHaveBeenCalled();
    // It might fall back to static rules, let's check that it tries
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error during batch tab analysis and grouping:'), expect.any(Error));
  });

  test('should retry on network errors', async () => {
    const tab = { id: 3, url: 'https://www.network-error.com', windowId: 1, title: 'Network Error' };
    const llmResponse = { shouldGroup: true, groupName: 'Network Success', color: 'yellow' };

    global.fetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch')) // Simulate network error
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }),
      });
      
    chrome.tabs.group.mockResolvedValue(2002);

    tabGrouper.analyzeAndGroupTabs([tab]);
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Assertions
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [3] });
  });

  test('should give up after all retries fail', async () => {
    const tab = { id: 4, url: 'https://www.persistent-error.com', windowId: 1, title: 'Persistent Error' };

    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    tabGrouper.analyzeAndGroupTabs([tab]);
    await new Promise(resolve => setTimeout(resolve, 8000)); // 1s + 2s + 4s + buffer

    // Assertions
    // Initial call + 3 retries = 4 calls
    expect(global.fetch).toHaveBeenCalledTimes(4);
    expect(chrome.tabs.group).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('LLM API call failed after 4 attempts.'));
  });

  describe('Rate Limiting', () => {
    test('should delay API calls to respect rate limits', async () => {
      tabGrouper.maxCallsPerMinute = 2;
      tabGrouper.minDelayBetweenCalls = 2000; // 2 seconds for testing

      const llmResponse = { shouldGroup: false };
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }),
      });

      // Fire off three calls immediately
      tabGrouper.callExternalLLM('prompt1');
      tabGrouper.callExternalLLM('prompt2');
      tabGrouper.callExternalLLM('prompt3');

      await new Promise(resolve => setTimeout(resolve, 62000));


      // Assertions
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});
