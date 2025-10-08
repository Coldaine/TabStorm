// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  console.log('AI Tab Grouper popup loaded');
  
  const tabCountElement = document.getElementById('tabCount');
  const groupCountElement = document.getElementById('groupCount');
  const extensionStatusElement = document.getElementById('extensionStatus');
  const refreshBtn = document.getElementById('refreshBtn');
  const testBtn = document.getElementById('testBtn');
  const toggleGroupingBtn = document.getElementById('toggleGroupingBtn');
  const groupingModeSelect = document.getElementById('groupingMode');
  const llmProviderSelect = document.getElementById('llmProvider');
  
  let isGroupingEnabled = true;
  
  // Function to update stats
  async function updateStats() {
    try {
      // Get current window tabs
      const tabs = await chrome.tabs.query({currentWindow: true});
      tabCountElement.textContent = tabs.length;
      
      // Get current window groups
      const groups = await chrome.tabGroups.query({windowId: tabs[0]?.windowId});
      groupCountElement.textContent = groups.length;
      
      // Update status text
      extensionStatusElement.textContent = isGroupingEnabled ? 'Active' : 'Paused';
      toggleGroupingBtn.textContent = isGroupingEnabled ? 'Pause Grouping' : 'Resume Grouping';
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }
  
  // Load saved settings
  async function loadSettings() {
    try {
      const settings = await chrome.storage.sync.get(['groupingMode', 'llmProvider']);
      
      if (settings.groupingMode) {
        groupingModeSelect.value = settings.groupingMode;
      } else {
        groupingModeSelect.value = 'auto'; // default
      }
      
      if (settings.llmProvider) {
        llmProviderSelect.value = settings.llmProvider;
      } else {
        llmProviderSelect.value = 'openai'; // default
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  // Initial update
  await updateStats();
  await loadSettings();
  
  // Refresh button event
  refreshBtn.addEventListener('click', updateStats);
  
  // Toggle grouping button event
  toggleGroupingBtn.addEventListener('click', async () => {
    isGroupingEnabled = !isGroupingEnabled;
    extensionStatusElement.textContent = isGroupingEnabled ? 'Active' : 'Paused';
    toggleGroupingBtn.textContent = isGroupingEnabled ? 'Pause Grouping' : 'Resume Grouping';
    
    // Save the grouping state
    try {
      await chrome.storage.sync.set({
        groupingPaused: !isGroupingEnabled
      });
    } catch (error) {
      console.error('Error saving grouping state:', error);
    }
  });
  
  // Grouping mode change event
  groupingModeSelect.addEventListener('change', async () => {
    try {
      await chrome.storage.sync.set({
        groupingMode: groupingModeSelect.value
      });
      
      // Send message to background script to update grouping mode
      chrome.runtime.sendMessage({
        action: 'updateGroupingMode',
        mode: groupingModeSelect.value
      });
    } catch (error) {
      console.error('Error saving grouping mode:', error);
    }
  });
  
  // LLM provider change event
  llmProviderSelect.addEventListener('change', async () => {
    try {
      await chrome.storage.sync.set({
        llmProvider: llmProviderSelect.value
      });
      
      // Send message to background script to update LLM provider
      chrome.runtime.sendMessage({
        action: 'updateLlmProvider',
        provider: llmProviderSelect.value
      });
    } catch (error) {
      console.error('Error saving LLM provider:', error);
    }
  });
  
  // Test button event - opens sample tabs to test grouping
  testBtn.addEventListener('click', async () => {
    try {
      // Check if API key is configured
      const settings = await chrome.storage.sync.get(['apiKey']);
      if (!settings.apiKey) {
        if (confirm('No API key configured. Test with mock responses?')) {
          // Temporarily enable mock mode for testing
          await chrome.storage.sync.set({useMock: true});
        } else {
          alert('Please configure your API key in the options page first.');
          return;
        }
      }
      
      // Open some test tabs that should trigger grouping
      await chrome.tabs.create({url: 'https://www.facebook.com'});
      await chrome.tabs.create({url: 'https://www.gmail.com'});
      await chrome.tabs.create({url: 'https://www.youtube.com'});
      await chrome.tabs.create({url: 'https://www.amazon.com'});
      await chrome.tabs.create({url: 'https://www.reuters.com'}); // News site
      
      // Update stats after a brief delay
      setTimeout(updateStats, 1000);
      
      alert('Test tabs opened! Check the extension logs for grouping activity.');
    } catch (error) {
      console.error('Error creating test tabs:', error);
      alert('Error creating test tabs. See console for details.');
    }
  });
});
});