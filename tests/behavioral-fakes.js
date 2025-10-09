// tests/behavioral-fakes.js
// Behavioral fakes that simulate real Chrome extension behavior
// These maintain state and simulate real failure modes, unlike mocks

class FakeChromeTabs {
  constructor(tabGroups = null) {
    this.tabs = new Map();
    this.nextTabId = 1;
    this.tabGroups = tabGroups; // Reference to tabGroups for coordination
    this.listeners = {
      onCreated: [],
      onUpdated: [],
      onRemoved: [],
      onActivated: []
    };
  }

  // Create a new tab
  create(createProperties) {
    const tab = {
      id: this.nextTabId++,
      windowId: createProperties.windowId || 1,
      url: createProperties.url || 'about:blank',
      title: createProperties.title || 'New Tab',
      active: createProperties.active || false,
      incognito: false,
      groupId: -1, // TAB_GROUP_ID_NONE
      ...createProperties
    };

    this.tabs.set(tab.id, tab);

    // Notify onCreated listeners
    this.listeners.onCreated.forEach(listener => {
      try {
        listener(tab);
      } catch (error) {
        console.error('Error in onCreated listener:', error);
      }
    });

    // Simulate tab loading completion
    setTimeout(() => {
      const updatedTab = { ...tab, status: 'complete' };
      this.tabs.set(tab.id, updatedTab);
      this.listeners.onUpdated.forEach(listener => {
        try {
          listener(tab.id, { status: 'complete', url: tab.url }, updatedTab);
        } catch (error) {
          console.error('Error in onUpdated listener:', error);
        }
      });
    }, 10); // Small delay to simulate loading

    return Promise.resolve(tab);
  }

  // Query tabs
  query(queryInfo = {}) {
    let results = Array.from(this.tabs.values());

    if (queryInfo.windowId) {
      results = results.filter(tab => tab.windowId === queryInfo.windowId);
    }

    if (queryInfo.groupId !== undefined) {
      results = results.filter(tab => tab.groupId === queryInfo.groupId);
    }

    if (queryInfo.url) {
      const urlPattern = queryInfo.url;
      results = results.filter(tab => tab.url.includes(urlPattern));
    }

    return Promise.resolve(results);
  }

  // Get a specific tab
  get(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      throw new Error(`Tab ${tabId} not found`);
    }
    return Promise.resolve(tab);
  }

  // Update a tab
  update(tabId, updateProperties) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      throw new Error(`Tab ${tabId} not found`);
    }

    const updatedTab = { ...tab, ...updateProperties };
    this.tabs.set(tabId, updatedTab);

    // Notify listeners if URL changed
    if (updateProperties.url && updateProperties.status === 'complete') {
      this.listeners.onUpdated.forEach(listener => {
        try {
          listener(tabId, { status: 'complete', url: updateProperties.url }, updatedTab);
        } catch (error) {
          console.error('Error in onUpdated listener:', error);
        }
      });
    }

    return Promise.resolve(updatedTab);
  }

  // Group tabs
  group(options) {
    const { tabIds, groupId } = options;
    const newGroupId = groupId || this.tabGroups.nextGroupId++;

    // Validate that all tabs exist (Chrome would throw an error for invalid tab IDs)
    const validTabIds = tabIds.filter(tabId => this.tabs.has(tabId));
    if (validTabIds.length !== tabIds.length) {
      const invalidIds = tabIds.filter(tabId => !this.tabs.has(tabId));
      throw new Error(`Tabs not found: ${invalidIds.join(', ')}`);
    }

    // Create the group if it doesn't exist
    if (!this.tabGroups.groups.has(newGroupId)) {
      this.tabGroups.groups.set(newGroupId, {
        id: newGroupId,
        title: '',
        color: 'grey',
        windowId: 1, // Assume window 1
        collapsed: false
      });
    }

    validTabIds.forEach(tabId => {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.groupId = newGroupId;
      }
    });

    return Promise.resolve(newGroupId);
  }

  // Remove a tab
  remove(tabId) {
    const tab = this.tabs.get(tabId);
    if (tab) {
      this.tabs.delete(tabId);

      // Notify listeners
      this.listeners.onRemoved.forEach(listener => {
        try {
          listener(tabId, { windowId: tab.windowId, isWindowClosing: false });
        } catch (error) {
          console.error('Error in onRemoved listener:', error);
        }
      });
    }

    return Promise.resolve();
  }

  // Add event listeners
  onCreated = {
    addListener: (listener) => this.listeners.onCreated.push(listener)
  };

  onUpdated = {
    addListener: (listener) => this.listeners.onUpdated.push(listener)
  };

  onRemoved = {
    addListener: (listener) => this.listeners.onRemoved.push(listener)
  };

  onActivated = {
    addListener: (listener) => this.listeners.onActivated.push(listener)
  };
}

class FakeChromeTabGroups {
  constructor() {
    this.groups = new Map();
    this.nextGroupId = 1;
    this.listeners = {
      onCreated: [],
      onUpdated: [],
      onRemoved: [],
      onMoved: []
    };
  }

  // Query groups
  query(queryInfo = {}) {
    let results = Array.from(this.groups.values());

    if (queryInfo.windowId) {
      results = results.filter(group => group.windowId === queryInfo.windowId);
    }

    return Promise.resolve(results);
  }

  // Update a group
  update(groupId, updateProperties) {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const updatedGroup = { ...group, ...updateProperties };
    this.groups.set(groupId, updatedGroup);

    // Notify listeners
    this.listeners.onUpdated.forEach(listener => {
      try {
        listener(updatedGroup);
      } catch (error) {
        console.error('Error in onUpdated listener:', error);
      }
    });

    return Promise.resolve(updatedGroup);
  }

  // Create a new group (internal method for testing)
  _createGroup(title, color, windowId = 1) {
    const group = {
      id: this.nextGroupId++,
      title,
      color,
      windowId,
      collapsed: false
    };

    this.groups.set(group.id, group);

    // Notify listeners
    this.listeners.onCreated.forEach(listener => {
      try {
        listener(group);
      } catch (error) {
        console.error('Error in onCreated listener:', error);
      }
    });

    return group;
  }

  // Constants
  TAB_GROUP_ID_NONE = -1;

  // Event listeners
  onCreated = {
    addListener: (listener) => this.listeners.onCreated.push(listener)
  };

  onUpdated = {
    addListener: (listener) => this.listeners.onUpdated.push(listener)
  };

  onRemoved = {
    addListener: (listener) => this.listeners.onRemoved.push(listener)
  };

  onMoved = {
    addListener: (listener) => this.listeners.onMoved.push(listener)
  };
}

class FakeChromeStorage {
  constructor() {
    this.storage = new Map();
  }

  sync = {
    get: (keys, callback) => {
      const result = {};
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          result[key] = this.storage.get(key);
        });
      } else if (typeof keys === 'object') {
        Object.keys(keys).forEach(key => {
          result[key] = this.storage.get(key) !== undefined ? this.storage.get(key) : keys[key];
        });
      } else if (typeof keys === 'string') {
        result[keys] = this.storage.get(keys);
      }

      if (callback) {
        callback(result);
      }
      return Promise.resolve(result);
    },

    set: (items, callback) => {
      Object.keys(items).forEach(key => {
        this.storage.set(key, items[key]);
      });

      if (callback) {
        callback();
      }
      return Promise.resolve();
    }
  };
}

class FakeChromeNotifications {
  constructor() {
    this.notifications = new Map();
    this.listeners = {
      onClicked: []
    };
  }

  // Create a notification
  create(notificationId, options, callback) {
    const id = notificationId || `notification_${Date.now()}`;
    const notification = {
      id,
      ...options,
      timestamp: Date.now()
    };

    this.notifications.set(id, notification);

    if (callback) {
      callback(id);
    }

    return Promise.resolve(id);
  }

  // Clear a notification
  clear(notificationId, callback) {
    const existed = this.notifications.has(notificationId);
    this.notifications.delete(notificationId);

    if (callback) {
      callback(existed);
    }

    return Promise.resolve(existed);
  }

  // Simulate clicking a notification
  _click(notificationId) {
    if (this.notifications.has(notificationId)) {
      this.listeners.onClicked.forEach(listener => {
        try {
          listener(notificationId);
        } catch (error) {
          console.error('Error in onClicked listener:', error);
        }
      });
    }
  }

  // Event listeners
  onClicked = {
    addListener: (listener) => this.listeners.onClicked.push(listener)
  };
}

class FakeChromeScripting {
  constructor() {
    this.scripts = new Map(); // Store script results by tabId
  }

  // Execute script in a tab
  executeScript(injection) {
    const { target, func } = injection;
    const tabId = target.tabId;

    // Simulate different content based on URL patterns
    let result = {};

    if (this.scripts.has(tabId)) {
      result = this.scripts.get(tabId);
    } else {
      // Generate realistic content based on URL
      const mockContent = this._generateMockContent(target.url || 'about:blank');
      this.scripts.set(tabId, mockContent);
      result = mockContent;
    }

    return Promise.resolve([{
      result,
      frameId: 0,
      target: { tabId }
    }]);
  }

  _generateMockContent(url) {
    // Generate realistic page content based on URL
    if (url.includes('facebook.com')) {
      return {
        title: 'Facebook',
        description: 'Connect with friends and the world around you on Facebook.',
        headings: ['Welcome to Facebook', 'Recent Posts'],
        url: url,
        hostname: 'www.facebook.com'
      };
    } else if (url.includes('gmail.com') || url.includes('mail.google.com')) {
      return {
        title: 'Gmail',
        description: 'Secure, smart, and easy to use email.',
        headings: ['Inbox', 'Compose'],
        url: url,
        hostname: 'mail.google.com'
      };
    } else if (url.includes('github.com')) {
      return {
        title: 'GitHub',
        description: 'Where the world builds software.',
        headings: ['Repository', 'Issues', 'Pull Requests'],
        url: url,
        hostname: 'github.com'
      };
    } else {
      return {
        title: 'Sample Page',
        description: 'A sample webpage for testing.',
        headings: ['Main Heading', 'Subsection'],
        url: url,
        hostname: new URL(url).hostname
      };
    }
  }
}

class FakeChromeRuntime {
  constructor() {
    this.listeners = {
      onMessage: []
    };
    this.lastError = null;
  }

  // Send a message (for testing message handling)
  _sendMessage(message, sender = {}) {
    this.listeners.onMessage.forEach(listener => {
      try {
        listener(message, sender, () => {}); // No response callback needed for tests
      } catch (error) {
        console.error('Error in onMessage listener:', error);
      }
    });
  }

  onMessage = {
    addListener: (listener) => this.listeners.onMessage.push(listener)
  };
}

// Behavioral fake for LLM API calls
class FakeLLMProvider {
  constructor() {
    this.responses = [];
    this.callHistory = [];
    this.shouldFail = false;
    this.delay = 10; // ms
  }

  // Add a canned response
  addResponse(response) {
    this.responses.push(response);
  }

  // Set failure mode for testing error scenarios
  setFailureMode(shouldFail) {
    this.shouldFail = shouldFail;
  }

  // Simulate API call
  async call(prompt) {
    this.callHistory.push({ prompt, timestamp: Date.now() });

    if (this.shouldFail) {
      throw new Error('LLM API call failed');
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.delay));

    // Return next canned response or default
    const response = this.responses.shift();
    if (response) {
      return response;
    }

    // Default response for grouping
    return JSON.stringify({
      shouldGroup: true,
      groupName: 'Test Group',
      color: 'blue',
      existingGroupId: null,
      reasoning: 'Default test response'
    });
  }

  // Get call history
  getCallHistory() {
    return this.callHistory;
  }
}

// Main test environment class that coordinates all fakes
class TabStormTestEnvironment {
  constructor() {
    this.tabs = new FakeChromeTabs();
    this.tabGroups = new FakeChromeTabGroups();
    this.storage = new FakeChromeStorage();
    this.notifications = new FakeChromeNotifications();
    this.scripting = new FakeChromeScripting();
    this.runtime = new FakeChromeRuntime();
    this.llmProvider = new FakeLLMProvider();

    // Set up coordination between tabs and tabGroups
    this.tabs.tabGroups = this.tabGroups;

    // Set up global chrome object
    this.chrome = {
      tabs: this.tabs,
      tabGroups: this.tabGroups,
      storage: this.storage,
      notifications: this.notifications,
      scripting: this.scripting,
      runtime: this.runtime
    };

    // Set global chrome for modules that expect it
    global.chrome = this.chrome;

    // Mock fetch for LLM calls
    global.fetch = jest.fn((url, options) => {
      if (url.includes('api.openai.com') || url.includes('api.anthropic.com') ||
          url.includes('generativelanguage.googleapis.com') || url.includes('api.z.ai')) {
        return this.llmProvider.call(JSON.parse(options.body).messages[0].content);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  }

  // Create a realistic tab
  async createTab(url, title = null, windowId = 1) {
    const tabTitle = title || this._generateTitleFromUrl(url);
    return await this.tabs.create({
      url,
      title: tabTitle,
      windowId
    });
  }

  // Create multiple tabs at once
  async createTabs(tabSpecs) {
    const tabs = [];
    for (const spec of tabSpecs) {
      const tab = await this.createTab(spec.url, spec.title, spec.windowId);
      tabs.push(tab);
    }
    return tabs;
  }

  // Create a group
  createGroup(title, color, windowId = 1) {
    return this.tabGroups._createGroup(title, color, windowId);
  }

  // Simulate user clicking a notification
  clickNotification(notificationId) {
    this.notifications._click(notificationId);
  }

  // Get all tabs in a window
  getTabsInWindow(windowId = 1) {
    return Array.from(this.tabs.tabs.values()).filter(tab => tab.windowId === windowId);
  }

  // Get all groups in a window
  getGroupsInWindow(windowId = 1) {
    return Array.from(this.tabGroups.groups.values()).filter(group => group.windowId === windowId);
  }

  // Reset the environment
  reset() {
    this.tabs.tabs.clear();
    this.tabs.nextTabId = 1;
    this.tabGroups.groups.clear();
    this.tabGroups.nextGroupId = 1;
    this.storage.storage.clear();
    this.notifications.notifications.clear();
    this.notifications.listeners.onClicked.length = 0; // Clear notification listeners
    this.scripting.scripts.clear();
    this.llmProvider.callHistory.length = 0;
    this.llmProvider.responses.length = 0;
    this.llmProvider.shouldFail = false;
    
    // Clear all event listeners
    this.tabs.listeners.onCreated.length = 0;
    this.tabs.listeners.onUpdated.length = 0;
    this.tabs.listeners.onRemoved.length = 0;
    this.tabs.listeners.onActivated.length = 0;
    this.tabGroups.listeners.onCreated.length = 0;
    this.tabGroups.listeners.onUpdated.length = 0;
    this.tabGroups.listeners.onRemoved.length = 0;
    this.tabGroups.listeners.onMoved.length = 0;
  }

  _generateTitleFromUrl(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch {
      return 'Test Tab';
    }
  }
}

module.exports = {
  TabStormTestEnvironment,
  FakeChromeTabs,
  FakeChromeTabGroups,
  FakeChromeStorage,
  FakeChromeNotifications,
  FakeChromeScripting,
  FakeChromeRuntime,
  FakeLLMProvider
};