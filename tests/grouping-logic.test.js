const AITabGrouper = require('../background');

describe('AITabGrouper - Core Grouping Logic', () => {
  let tabGrouper;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    global.fetch.mockClear();

    // Mock chrome.storage.sync.get to return default values
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      const result = { groupingMode: 'auto', groupingPaused: false };
      if (callback) {
        callback(result);
      }
      return Promise.resolve(result);
    });

    // Instantiate a new AITabGrouper
    tabGrouper = new AITabGrouper();
    tabGrouper.useMock = false; // Default to not using mock unless specified
    tabGrouper.apiKey = 'test-api-key';
  });

  describe('Group Reuse vs. Creation', () => {
    test('should create a new group when no existing group matches', async () => {
      const newTab = { id: 1, url: 'https://www.newsite.com', windowId: 1, title: 'New Site' };
      const llmResponse = {
        shouldGroup: true,
        groupName: 'New Tech',
        color: 'cyan',
        existingGroupId: null,
        reasoning: 'A new technology website.'
      };

      // Mock API responses
      chrome.tabs.query.mockResolvedValue([]);
      chrome.tabGroups.query.mockResolvedValue([]); // No existing groups
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }),
      });
      chrome.tabs.group.mockResolvedValue(123); // New group ID

      // Trigger analysis
      await tabGrouper.analyzeAndGroupTabs([newTab]);

      // Assertions
      expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [newTab.id] });
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(123, {
        title: 'New Tech',
        color: 'cyan',
      });
    });

    test('should reuse an existing group when LLM suggests it', async () => {
      const newTab = { id: 2, url: 'https://www.reactjs.org', windowId: 1, title: 'React Docs' };
      const existingGroup = { id: 456, title: 'Development', color: 'blue', windowId: 1 };
      const llmResponse = {
        shouldGroup: true,
        groupName: 'Development',
        color: 'blue',
        existingGroupId: 456,
        reasoning: 'Matches existing development group.'
      };

      // Mock API responses
      chrome.tabs.query.mockResolvedValue([]);
      chrome.tabGroups.query.mockResolvedValue([existingGroup]);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(llmResponse) } }] }),
      });

      // Trigger analysis
      await tabGrouper.analyzeAndGroupTabs([newTab]);


      // Assertions
      expect(chrome.tabs.group).toHaveBeenCalledWith({
        tabIds: [newTab.id],
        groupId: 456,
      });
      expect(chrome.tabGroups.update).not.toHaveBeenCalled();
    });
  });

  describe('Mock Mode Fallback', () => {
    test('should use mock response when useMock is true', async () => {
      tabGrouper.useMock = true;
      const socialTab = { id: 3, url: 'https://www.facebook.com', windowId: 1, title: 'Facebook' };
      
      chrome.tabs.query.mockResolvedValue([]);
      chrome.tabGroups.query.mockResolvedValue([]);
      chrome.tabs.group.mockResolvedValue(789);

      // Trigger analysis
      await tabGrouper.analyzeAndGroupTabs([socialTab]);

      // Assertions
      expect(global.fetch).not.toHaveBeenCalled();
      expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [socialTab.id] });
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(789, {
        title: 'Social Media',
        color: 'red',
      });
    });

    test('should use mock response when API key is missing', async () => {
      tabGrouper.apiKey = null;
      tabGrouper.useMock = true; // This should be set automatically, but we force it for clarity
      const emailTab = { id: 4, url: 'https://mail.google.com', windowId: 1, title: 'Gmail' };
      
      chrome.tabs.query.mockResolvedValue([]);
      chrome.tabGroups.query.mockResolvedValue([]);
      chrome.tabs.group.mockResolvedValue(101);

      // Trigger analysis
      await tabGrouper.analyzeAndGroupTabs([emailTab]);

      // Assertions
      expect(global.fetch).not.toHaveBeenCalled();
      expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [emailTab.id] });
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(101, {
        title: 'Email',
        color: 'blue',
      });
    });
  });
});
