const AITabGrouper = require('../background');

describe('AITabGrouper - Notifications', () => {
  let tabGrouper;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();

    // Set grouping mode to 'manual'
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      const result = { groupingMode: 'manual', groupingPaused: false };
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    tabGrouper = new AITabGrouper();
    tabGrouper.useMock = false;
    tabGrouper.apiKey = 'test-api-key';
  });

  test('should send a notification in manual mode if LLM suggests grouping', async () => {
    const tab = { id: 1, url: 'https://www.manual-mode.com', windowId: 1, title: 'Manual Mode' };
    const llmResponse = {
      shouldGroup: true,
      groupName: 'Suggested Group',
      color: 'pink',
      reasoning: 'This is a suggestion.'
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }),
    });

    await tabGrouper.analyzeAndGroupTabs([tab]);

    // Assertions
    expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
    expect(chrome.notifications.create).toHaveBeenCalledWith(
      expect.stringContaining('group-suggestion-'),
      {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Tab Grouping Suggestion',
        message: 'Group 1 tab into "Suggested Group"?',
        priority: 2,
      }
    );
    // Grouping should NOT have been executed yet
    expect(chrome.tabs.group).not.toHaveBeenCalled();
  });

  test('should NOT send a notification in manual mode if LLM suggests no grouping', async () => {
    const tab = { id: 2, url: 'https://www.no-group.com', windowId: 1, title: 'No Group' };
    const llmResponse = {
      shouldGroup: false,
      reasoning: 'No action needed.'
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }),
    });

    await tabGrouper.analyzeAndGroupTabs([tab]);

    // Assertions
    expect(chrome.notifications.create).not.toHaveBeenCalled();
    expect(chrome.tabs.group).not.toHaveBeenCalled();
  });

  test('should execute grouping when a notification is clicked', async () => {
    const tabs = [{ id: 1, url: 'https://www.manual-mode.com' }];
    const decision = {
      shouldGroup: true,
      groupName: 'Clicked Group',
      color: 'cyan',
    };
    const notificationId = 'group-suggestion-12345';

    // Manually store an action as if a notification was sent
    tabGrouper.notificationActions.set(notificationId, { tabs, decision });
    chrome.tabs.group.mockResolvedValue(3001);

    // Simulate the notification click
    await tabGrouper.handleNotificationClick(notificationId);

    // Assertions
    expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [1] });
    expect(chrome.tabGroups.update).toHaveBeenCalledWith(3001, {
      title: 'Clicked Group',
      color: 'cyan',
    });
    expect(chrome.notifications.clear).toHaveBeenCalledWith(notificationId);
    // The action should be removed after being handled
    expect(tabGrouper.notificationActions.has(notificationId)).toBe(false);
  });
});
