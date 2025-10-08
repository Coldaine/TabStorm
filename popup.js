// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  console.log('AI Tab Grouper popup loaded');
  
  const tabCountElement = document.getElementById('tabCount');
  const groupCountElement = document.getElementById('groupCount');
  const refreshBtn = document.getElementById('refreshBtn');
  const testBtn = document.getElementById('testBtn');
  
  // Function to update stats
  async function updateStats() {
    try {
      // Get current window tabs
      const tabs = await chrome.tabs.query({currentWindow: true});
      tabCountElement.textContent = tabs.length;
      
      // Get current window groups
      const groups = await chrome.tabGroups.query({windowId: tabs[0]?.windowId});
      groupCountElement.textContent = groups.length;
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }
  
  // Initial update
  await updateStats();
  
  // Refresh button event
  refreshBtn.addEventListener('click', updateStats);
  
  // Test button event - opens sample tabs to test grouping
  testBtn.addEventListener('click', async () => {
    try {
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