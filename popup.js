// popup.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('AI Tab Grouper popup loaded');
  
  // Update status with current tab count
  chrome.tabs.query({currentWindow: true}, (tabs) => {
    document.querySelector('.status').innerHTML = `
      <p><strong>Status:</strong> Active</p>
      <p>Current window has ${tabs.length} tabs</p>
      <p>Groups will be created automatically!</p>
    `;
  });
});