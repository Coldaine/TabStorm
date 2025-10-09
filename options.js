// options.js
document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const llmProviderSelect = document.getElementById('llmProvider');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  const providerLabels = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Google Gemini',
    zai: 'Z.ai (GLM)',
    custom: 'Custom API'
  };

  const providerRequiresKey = (provider) => ['openai', 'anthropic', 'custom'].includes(provider);
  const providerSupportsEnvFallback = (provider) => ['gemini', 'zai'].includes(provider);

  const probeEnvKey = (provider) => new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: 'probeEnvKey', provider }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(Boolean(response && response.present));
      });
    } catch (error) {
      console.error('Error probing environment key:', error);
      resolve(false);
    }
  });

  const showStatus = (message, type) => {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  };

  chrome.storage.sync.get(['apiKey', 'llmProvider'], (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.llmProvider) {
      llmProviderSelect.value = result.llmProvider;
    } else {
      llmProviderSelect.value = 'openai';
    }
  });

  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const provider = llmProviderSelect.value;
    const providerLabel = providerLabels[provider] || provider;

    if (providerRequiresKey(provider) && !apiKey) {
      showStatus(`API key is required for ${providerLabel}.`, 'error');
      return;
    }

    let statusType = 'success';
    let statusMessage = 'Settings saved successfully!';

    if (!apiKey && providerSupportsEnvFallback(provider)) {
      const hasEnvKey = await probeEnvKey(provider);
      if (hasEnvKey) {
        statusType = 'warn';
        statusMessage = `${providerLabel}: using environment API key.`;
      } else {
        statusType = 'warn';
        statusMessage = `${providerLabel}: no API key detected; grouping calls will be skipped until one is provided.`;
      }
    }

    chrome.storage.sync.set({
      apiKey: apiKey,
      llmProvider: provider
    }, () => {
      if (chrome.runtime.lastError) {
        showStatus(`Error saving settings: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }

      showStatus(statusMessage, statusType);

      chrome.runtime.sendMessage({
        action: 'updateApiKey',
        apiKey: apiKey,
        llmProvider: provider
      }, () => {
        // Intentionally ignore errors here; background SW may be sleeping.
        void chrome.runtime.lastError;
      });
    });
  });
});
