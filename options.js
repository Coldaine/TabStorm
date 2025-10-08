// options.js
document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const llmProviderSelect = document.getElementById('llmProvider');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  
  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'llmProvider'], function(result) {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.llmProvider) {
      llmProviderSelect.value = result.llmProvider;
    } else {
      llmProviderSelect.value = 'openai'; // default
    }
  });
  
  // Save settings when button is clicked
  saveBtn.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    const llmProvider = llmProviderSelect.value;
    
    // Basic validation
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }
    
    // Save to chrome.storage
    chrome.storage.sync.set({
      apiKey: apiKey,
      llmProvider: llmProvider
    }, function() {
      if (chrome.runtime.lastError) {
        showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('Settings saved successfully!', 'success');
        
        // Update the background script with the new API key
        chrome.runtime.sendMessage({
          action: 'updateApiKey',
          apiKey: apiKey,
          llmProvider: llmProvider
        });
      }
    });
  });
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(function() {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});