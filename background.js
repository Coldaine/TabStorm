// background.js
console.log("AI Tab Grouper background service worker loaded");

// Basic tab monitoring without AI functionality yet
class BasicTabMonitor {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Monitor new tabs
    chrome.tabs.onCreated.addListener((tab) => {
      console.log('New tab created:', tab.id, tab.url);
      this.handleTabCreated(tab);
    });
    
    // Monitor tab updates (URL changes, loading completion)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && changeInfo.url) {
        console.log('Tab updated with new URL:', tab.url);
        this.handleTabUpdated(tabId, changeInfo, tab);
      }
    });
    
    // Monitor tab activation for context
    chrome.tabs.onActivated.addListener((activeInfo) => {
      console.log('Tab activated:', activeInfo.tabId);
      this.handleTabActivated(activeInfo);
    });
    
    // Monitor tab removal
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      console.log('Tab removed:', tabId);
      this.handleTabRemoved(tabId, removeInfo);
    });
  }

  handleTabCreated(tab) {
    console.log(`Tab ${tab.id} created with URL: ${tab.url}`);
  }

  handleTabUpdated(tabId, changeInfo, tab) {
    console.log(`Tab ${tabId} updated. New URL: ${tab.url}`);
    // At this point, the tab has finished loading with new content
    this.analyzeTab(tab);
  }

  handleTabActivated(activeInfo) {
    console.log(`Tab ${activeInfo.tabId} activated in window ${activeInfo.windowId}`);
  }

  handleTabRemoved(tabId, removeInfo) {
    console.log(`Tab ${tabId} removed from window ${removeInfo.windowId}`);
  }

  async analyzeTab(tab) {
    console.log(`Analyzing tab: ${tab.title} (${tab.url})`);
    
    // Get all tabs in the same window
    const tabsInWindow = await chrome.tabs.query({ windowId: tab.windowId });
    console.log(`Found ${tabsInWindow.length} tabs in window ${tab.windowId}`);
    
    // Get existing groups in the same window
    const groupsInWindow = await chrome.tabGroups.query({ windowId: tab.windowId });
    console.log(`Found ${groupsInWindow.length} existing groups in window ${tab.windowId}`);
    
    // Log current tab state
    console.log('Current tab state:', {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      windowId: tab.windowId,
      groupId: tab.groupId
    });
  }
}

// Initialize the basic tab monitor
new BasicTabMonitor();