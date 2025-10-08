// background.js
console.log("AI Tab Grouper background service worker loaded");

// Will be instantiated after the class declaration
let tabGrouper = null;

const getEnv = () =>
  (typeof process !== 'undefined' && process?.env) ? process.env : {};

const trimTrailingSlashes = (value = '') => value.replace(/\/+$/, '');

const providerDefaults = {
  openai: {
    baseUrl: trimTrailingSlashes(getEnv().OPENAI_API_BASE || 'https://api.openai.com/v1'),
    defaultModel: 'gpt-3.5-turbo',
    normalize: (data) => data?.choices?.[0]?.message?.content ?? null
  },
  anthropic: {
    baseUrl: trimTrailingSlashes(getEnv().ANTHROPIC_API_BASE || 'https://api.anthropic.com/v1'),
    defaultModel: 'claude-3-haiku-20240307',
    normalize: (data) => data?.content?.[0]?.text ?? null
  },
  gemini: {
    baseUrl: trimTrailingSlashes(getEnv().GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1'),
    defaultModel: 'gemini-1.5-flash',
    normalize: (data) => {
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const texts = parts.map(part => part?.text).filter(Boolean);
      return texts.length ? texts.join('\n') : null;
    }
  },
  zai: {
    baseUrl: trimTrailingSlashes(getEnv().ZAI_BASE_URL || getEnv().Z_AI_BASE_URL || 'https://api.z.ai/api/paas/v4'),
    defaultModel: 'glm-4.6',
    normalize: (data) => data?.choices?.[0]?.message?.content ?? null
  },
  custom: {
    baseUrl: trimTrailingSlashes(getEnv().CUSTOM_API_URL || ''),
    normalize: (data) => data?.choices?.[0]?.message?.content ?? null
  }
};

const envKeyNotified = new Set();

// Handle messages from popup and options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'probeEnvKey') {
    const env = getEnv();
    let present = false;
    if (message.provider === 'gemini') {
      present = Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY);
    } else if (message.provider === 'zai') {
      present = Boolean(env.ZAI_API_KEY || env.Z_AI_API_KEY);
    }
    sendResponse?.({ ok: true, present });
    return true;
  }

  if (!tabGrouper) {
    console.warn('Tab grouper not initialized yet; ignoring message:', message.action);
    sendResponse?.({ status: 'Tab grouper not ready' });
    return true;
  }

  if (message.action === 'updateApiKey') {
    tabGrouper.apiKey = message.apiKey || null;
    if (message.llmProvider) {
      tabGrouper.llmProvider = message.llmProvider;
    }
    const hasKey = tabGrouper.resolveApiKey(tabGrouper.llmProvider);
    tabGrouper.useMock = !hasKey;
    console.log('API key updated from options page');
    sendResponse({status: 'API key updated'});
    return true; // Indicates we wish to send a response asynchronously
  } else if (message.action === 'updateGroupingMode') {
    tabGrouper.groupingMode = message.mode;
    console.log('Grouping mode updated to:', message.mode);
    sendResponse({status: 'Grouping mode updated'});
    return true;
  } else if (message.action === 'updateLlmProvider') {
    tabGrouper.llmProvider = message.provider;
    const hasKey = tabGrouper.resolveApiKey(tabGrouper.llmProvider);
    tabGrouper.useMock = !hasKey;
    console.log('LLM provider updated to:', message.provider);
    sendResponse({status: 'LLM provider updated'});
    return true;
  }
  return false;
});

class AITabGrouper {
  constructor() {
    this.groupingRules = [
      { 
        name: "Social Media", 
        color: "red",
        patterns: ["facebook.com", "twitter.com", "instagram.com", "linkedin.com", "tiktok.com", "pinterest.com"] 
      },
      { 
        name: "Email", 
        color: "blue",
        patterns: ["gmail.com", "outlook.com", "yahoo.com", "protonmail.com", "mail.google.com", "inbox.google.com"] 
      },
      { 
        name: "News", 
        color: "orange",
        patterns: ["news.ycombinator.com", "reddit.com", "news.google.com", "cnn.com", "bbc.com", "nytimes.com"] 
      },
      { 
        name: "Shopping", 
        color: "green",
        patterns: ["amazon.com", "ebay.com", "walmart.com", "etsy.com", "alibaba.com", "shopify.com"] 
      },
      { 
        name: "Entertainment", 
        color: "pink",
        patterns: ["youtube.com", "netflix.com", "spotify.com", "vimeo.com", "twitch.tv", "disneyplus.com"] 
      },
      { 
        name: "Work", 
        color: "purple",
        patterns: ["google.com", "microsoft.com", "docs.google.com", "drive.google.com", "office.com", "slack.com", "zoom.us"] 
      }
    ];
    this.apiKey = null; // Will be set via options or default to mock
    this.llmProvider = 'openai'; // Default provider
    this.useMock = true; // Default to using mock responses during development
    this.groupingMode = 'auto'; // Default to automatic AI-powered grouping
    this.model = null; // Allow provider-specific overrides in future
    this.baseUrl = null; // Allow provider-specific base URL overrides
    this.temperature = 0.3; // Default sampling temperature
    this.debounceDelay = 750; // ms before running grouping after updates
    this.analysisTimers = new Map(); // Track pending tab analyses

    // Batch processing properties
    this.pendingTabs = new Map();
    this.batchTimer = null;
    this.batchDelay = 2000; // 2 seconds for batching

    // Notification action mapping
    this.notificationActions = new Map();
    
    // Rate limiting properties
    this.apiCallHistory = []; // Track API calls with timestamps
    this.maxCallsPerMinute = 20; // Limit to 20 calls per minute
    this.minDelayBetweenCalls = 1000; // Minimum 1 second between calls
    
    this.setupEventListeners();
    
    // Load initial settings
    this.loadSettings();
  }
  
  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get(['groupingMode', 'groupingPaused']);
      if (settings.groupingMode) {
        this.groupingMode = settings.groupingMode;
      }
      if (settings.groupingPaused !== undefined) {
        // If grouping is paused, we could store this state, 
        // but for now we'll just check during tab analysis
      }
    } catch (error) {
      console.error('Error loading settings in background:', error);
    }
  }

  setupEventListeners() {
    // Monitor new tabs
    chrome.tabs.onCreated.addListener((tab) => {
      console.log('New tab created:', tab.id, tab.url);
      this.scheduleTabAnalysis(tab);
    });
    
    // Monitor tab updates (URL changes, loading completion)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && changeInfo.url) {
        console.log('Tab updated with new URL:', tab.url);
        this.scheduleTabAnalysis(tab);
      }
    });
    
    // Monitor tab activation for context
    chrome.tabs.onActivated.addListener((activeInfo) => {
      console.log('Tab activated:', activeInfo.tabId);
    });
    
    // Monitor tab removal
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      console.log('Tab removed:', tabId);
      const timer = this.analysisTimers.get(tabId);
      if (timer) {
        clearTimeout(timer);
        this.analysisTimers.delete(tabId);
      }
      // Also remove from pending batch
      if (this.pendingTabs.has(tabId)) {
        this.pendingTabs.delete(tabId);
        console.log(`Tab ${tabId} removed from pending batch.`);
      }
    });

    // Monitor notification clicks
    chrome.notifications.onClicked.addListener((notificationId) => {
      this.handleNotificationClick(notificationId);
    });
  }

  scheduleTabAnalysis(tab) {
    if (!tab || typeof tab.id === 'undefined' || !this.isProcessableTab(tab)) {
      return;
    }

    // Add tab to the pending batch
    this.pendingTabs.set(tab.id, tab);
    console.log(`Tab ${tab.id} added to batch. Pending tabs: ${this.pendingTabs.size}`);

    // If a batch timer is already running, clear it to reset the delay
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Schedule the batch processing
    this.batchTimer = setTimeout(() => {
      this.processPendingTabs();
    }, this.batchDelay);
  }

  async processPendingTabs() {
    if (this.pendingTabs.size === 0) {
      return;
    }

    // Create a copy of the tabs to process and clear the pending map
    const tabsToProcess = Array.from(this.pendingTabs.values());
    this.pendingTabs.clear();
    this.batchTimer = null;

    console.log(`Processing batch of ${tabsToProcess.length} tabs.`);

    // Filter out any tabs that might have been closed or are no longer processable
    const validTabs = [];
    for (const tab of tabsToProcess) {
      try {
        const latestTabState = await chrome.tabs.get(tab.id);
        if (this.isProcessableTab(latestTabState) && this.isUngrouped(latestTabState)) {
          validTabs.push(latestTabState);
        }
      } catch (e) {
        console.debug(`Tab ${tab.id} no longer exists, removing from batch.`);
      }
    }

    if (validTabs.length > 0) {
      await this.analyzeAndGroupTabs(validTabs);
    }
  }

  async handleNotificationClick(notificationId) {
    const action = this.notificationActions.get(notificationId);
    if (action) {
      console.log(`Notification ${notificationId} clicked, executing grouping action.`);
      try {
        // The action contains the tab(s) and the grouping decision
        await this.executeGrouping(action.tabs, action.decision);
      } catch (error) {
        console.error('Error executing grouping from notification click:', error);
      } finally {
        // Clean up the stored action and the notification itself
        this.notificationActions.delete(notificationId);
        chrome.notifications.clear(notificationId);
      }
    } else {
      console.log(`No action found for clicked notification: ${notificationId}`);
    }
  }

  isProcessableTab(tab) {
    if (!tab) {
      return false;
    }

    if (tab.incognito) {
      console.log(`Skipping incognito tab ${tab.id}`);
      return false;
    }

    const url = tab.url || tab.pendingUrl;
    if (!url) {
      return false;
    }

    const disallowedProtocols = ['chrome:', 'edge:', 'about:', 'chrome-extension:', 'devtools:'];
    if (disallowedProtocols.some((protocol) => url.startsWith(protocol))) {
      console.log(`Skipping unsupported URL for tab ${tab.id}: ${url}`);
      return false;
    }

    if (!/^https?:/i.test(url)) {
      return false;
    }

    return true;
  }

  isUngrouped(tab) {
    return !tab.groupId || tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE;
  }

  resolveApiKey(provider) {
    if (!provider) {
      return null;
    }

    if (this.apiKey) {
      if (typeof this.apiKey === 'object' && this.apiKey[provider]) {
        return this.apiKey[provider];
      }
      if (typeof this.apiKey === 'string') {
        return this.apiKey;
      }
    }

    const env = getEnv();
    let key = null;

    switch (provider) {
      case 'openai':
        key = env.OPENAI_API_KEY || null;
        break;
      case 'anthropic':
        key = env.ANTHROPIC_API_KEY || null;
        break;
      case 'gemini':
        key = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || null;
        break;
      case 'zai':
        key = env.ZAI_API_KEY || env.Z_AI_API_KEY || null;
        break;
      case 'custom':
        key = env.CUSTOM_API_KEY || null;
        break;
      default:
        key = null;
    }

    if (key && !envKeyNotified.has(provider)) {
      console.info(`[AITabGrouper] Using ${provider} API key from environment`);
      envKeyNotified.add(provider);
    }

    return key;
  }

  resolveBaseUrl(provider) {
    const defaults = providerDefaults[provider] || {};
    let baseUrl = defaults.baseUrl || '';

    if (this.baseUrl) {
      if (typeof this.baseUrl === 'object' && this.baseUrl[provider]) {
        baseUrl = this.baseUrl[provider];
      } else if (typeof this.baseUrl === 'string' && this.baseUrl.trim() !== '') {
        baseUrl = this.baseUrl;
      }
    }

    return trimTrailingSlashes(baseUrl);
  }

  resolveModel(provider) {
    const defaults = providerDefaults[provider] || {};

    if (this.model) {
      if (typeof this.model === 'object' && this.model[provider]) {
        return this.model[provider];
      }
      if (typeof this.model === 'string' && this.model.trim() !== '') {
        return this.model;
      }
    }

    return defaults.defaultModel || 'gpt-3.5-turbo';
  }

  normalizeProviderResponse(provider, data) {
    if (providerDefaults[provider]?.normalize) {
      return providerDefaults[provider].normalize(data);
    }

    if (provider === 'openai' || provider === 'custom' || provider === 'zai') {
      return data?.choices?.[0]?.message?.content ?? null;
    }

    if (provider === 'anthropic') {
      return data?.content?.[0]?.text ?? null;
    }

    return null;
  }

  async analyzeAndGroupTabs(tabs) {
    if (!tabs || tabs.length === 0) {
      return;
    }
    const primaryTab = tabs[0];
    let tabsInWindow = [];
    let groupsInWindow = [];

    try {
      console.log(`Analyzing batch of ${tabs.length} tabs, starting with: ${primaryTab.title} (${primaryTab.url})`);

      const settings = await chrome.storage.sync.get(['groupingMode', 'groupingPaused']);
      const groupingMode = settings.groupingMode || 'auto';
      const groupingPaused = settings.groupingPaused || false;

      if (groupingPaused || groupingMode === 'disabled') {
        console.log(`Grouping is ${groupingPaused ? 'paused' : 'disabled'}, skipping batch.`);
        return;
      }

      tabsInWindow = await chrome.tabs.query({ windowId: primaryTab.windowId });
      groupsInWindow = await chrome.tabGroups.query({ windowId: primaryTab.windowId });

      const tabsContent = [];
      for (const tab of tabs) {
        try {
          const contentResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => ({
              title: document.title,
              description: document.querySelector('meta[name="description"]')?.content || '',
              headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(el => el.textContent.trim()),
              url: window.location.href,
              hostname: window.location.hostname
            })
          });
          if (contentResults && contentResults[0] && contentResults[0].result) {
            tabsContent.push(contentResults[0].result);
          } else {
            tabsContent.push(null);
          }
        } catch (contentError) {
          console.log(`Content script execution failed for tab ${tab.id}:`, contentError.message);
          tabsContent.push(null);
        }
      }

      const groupDecision = await this.callLLMForGrouping(tabs, tabsInWindow, groupsInWindow, tabsContent);

      if (groupingMode === 'manual') {
        if (groupDecision.shouldGroup) {
          console.log(`Manual mode: Sending notification for grouping suggestion.`);
          await this.sendGroupingNotification(tabs, groupDecision);
        } else {
          console.log(`Manual mode: LLM decided not to group, no notification sent.`);
        }
        return;
      }

      if (groupDecision.shouldGroup) {
        await this.executeGrouping(tabs, groupDecision);
      } else {
        console.log(`Batch of ${tabs.length} tabs should not be grouped according to LLM.`);
      }
    } catch (error) {
      console.error('Error during batch tab analysis and grouping:', error);
      // Fallback for the first tab in the batch for simplicity
      try {
        const fallbackDecision = await this.classifyTab(primaryTab, tabsInWindow, groupsInWindow);
        if (fallbackDecision.shouldGroup) {
          await this.executeGrouping([primaryTab], fallbackDecision);
        }
      } catch (fallbackError) {
        console.error('Error during fallback classification:', fallbackError);
      }
    }
  }

  async sendGroupingNotification(tabs, decision) {
    const tabCount = tabs.length;
    const groupName = decision.groupName || 'a new group';
    const notificationId = `group-suggestion-${Date.now()}`;

    // Store the action to be taken if the user clicks the notification
    this.notificationActions.set(notificationId, { tabs, decision });

    await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Tab Grouping Suggestion',
      message: `Group ${tabCount} tab${tabCount > 1 ? 's' : ''} into "${groupName}"?`,
      priority: 2
    });

    console.log(`Sent notification ${notificationId} for grouping ${tabCount} tabs into "${groupName}".`);
  }

  // New method: Call LLM API for grouping decision
  async callLLMForGrouping(tabs, allTabs, existingGroups, tabsContent = []) {
    if (this.useMock) {
      // Use mock response for testing (with the first tab for simplicity)
      return this.getMockGroupingResponse(tabs[0], allTabs, existingGroups);
    }
    
    // Build prompt for the LLM with content information
    const prompt = this.buildGroupingPrompt(tabs, allTabs, existingGroups, tabsContent);
    
    try {
      // Call OpenAI, Claude, or other API
      const responseText = await this.callExternalLLM(prompt);
      if (!responseText) {
        throw new Error(`LLM provider ${this.llmProvider} returned no usable content`);
      }
      const parsedResponse = this.parseLLMResponse(responseText);
      
      // Validate and enhance the response
      return this.validateGroupingResponse(parsedResponse, existingGroups);
    } catch (error) {
      console.error('Error calling external LLM:', error);
      // Return a default response to avoid breaking functionality
      return {
        shouldGroup: false,
        reasoning: `LLM API Error: ${error.message}`
      };
    }
  }
  
  // Validate and enhance grouping response
  validateGroupingResponse(response, existingGroups) {
    // Ensure required fields exist
    if (typeof response.shouldGroup !== 'boolean') {
      response.shouldGroup = false;
    }
    
    if (!response.reasoning) {
      response.reasoning = "No reasoning provided by LLM";
    }
    
    // If shouldGroup is true, ensure groupName and color are provided
    if (response.shouldGroup) {
      if (!response.groupName) {
        response.groupName = "Uncategorized";
      }
      
      // Validate color against allowed values
      const validColors = ["red", "blue", "green", "yellow", "purple", "pink", "cyan", "orange", "grey"];
      if (!validColors.includes(response.color)) {
        response.color = "grey"; // Default to grey if invalid color is provided
      }
      
      // If existingGroupId is provided, verify it exists in the current groups
      if (response.existingGroupId) {
        const groupExists = existingGroups.some(g => g.id === response.existingGroupId);
        if (!groupExists) {
          console.warn(`LLM suggested non-existent group ID: ${response.existingGroupId}. Creating new group instead.`);
          response.existingGroupId = null;
        }
      }
    }
    
    return response;
  }

  // Build the prompt to send to the LLM
  buildGroupingPrompt(tabs, allTabs, existingGroups, tabsContent = []) {
    const newTabsInfo = tabs.map((tab, index) => {
      const tabContent = tabsContent[index];
      let contentDescription = "No additional content available";
      if (tabContent) {
        contentDescription = `Page Title: "${tabContent.title}"; Description: "${tabContent.description || 'N/A'}"; Headings: [${tabContent.headings?.slice(0, 3).join(', ') || 'N/A'}]`;
      }
      return `- URL: ${tab.url}\n  Title: "${tab.title}"\n  Content: ${contentDescription}`;
    }).join('\n');

    const existingTabInfo = allTabs
      .filter(t => !tabs.some(newTab => newTab.id === t.id)) // Exclude the new tabs
      .map(t => ({
        title: t.title,
        domain: new URL(t.url).hostname,
        groupId: t.groupId
      }));

    const existingGroupInfo = existingGroups.map(g => ({
      id: g.id,
      title: g.title,
      color: g.color
    }));

    return `
You are an intelligent tab grouping assistant. Analyze a batch of new tabs and determine if they should be grouped.

NEW TABS TO ANALYZE (${tabs.length} total):
${newTabsInfo}

EXISTING TABS IN THE SAME WINDOW:
${existingTabInfo.length > 0 
  ? existingTabInfo.map(t => `- "${t.title}" (${t.domain})`).join('\n') 
  : 'No other tabs in this window'}

EXISTING GROUPS IN THE SAME WINDOW:
${existingGroupInfo.length > 0 
  ? existingGroupInfo.map(g => `- Group ID: ${g.id}, Title: "${g.title}", Color: ${g.color}`).join('\n')
  : 'No existing groups in this window'}

TASK:
Analyze the batch of new tabs. Decide if they share a common theme and should be grouped together.
- If they should be grouped, suggest a single new group for all of them or suggest adding them to an existing group.
- All tabs in the batch will be placed in the SAME group if a grouping decision is made.

When creating new groups, use creative, descriptive names. Avoid generic names.

COLOR SELECTION GUIDELINES:
- Red: Social Media, Entertainment
- Blue: Work, Communication, Productivity
- Green: Nature, Health, Finance
- Yellow: News, Alerts
- Purple: Creative, Art, Design
- Orange: Shopping, Food
- Pink: Fashion, Beauty, Lifestyle
- Cyan: Technology, Science

IMPORTANT: Respond with only valid JSON in the following exact format.
If the tabs share a theme and should be grouped:
{
  "shouldGroup": true,
  "groupName": "Specific and descriptive group name for the batch",
  "color": "blue",
  "existingGroupId": null (to create a new group) or an existing group ID (e.g., 123),
  "reasoning": "Brief explanation of why these tabs belong together in this group."
}
If the tabs do not share a common theme or should not be grouped:
{
  "shouldGroup": false,
  "reasoning": "Brief explanation of why grouping is not appropriate for this batch."
}
`;
  }

  // Call external LLM API with rate limiting
  async callExternalLLM(prompt) {
    if (!prompt) {
      return null;
    }

    const provider = this.llmProvider || 'openai';
    const apiKey = this.resolveApiKey(provider);
    if (!apiKey) {
      console.warn(`[AITabGrouper] No API key for provider=${provider}. Set it in options to enable AI grouping.`);
      throw new Error(`Missing API key for provider ${provider}`);
    }

    // Check rate limiting
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 60 seconds ago
    
    // Clean up old entries
    this.apiCallHistory = this.apiCallHistory.filter(timestamp => timestamp > oneMinuteAgo);
    
    // Check if we've exceeded the rate limit
    if (this.apiCallHistory.length >= this.maxCallsPerMinute) {
      const oldestCall = this.apiCallHistory[0];
      const timeUntilReset = 60000 - (now - oldestCall);
      
      console.warn(`Rate limit exceeded. Waiting ${Math.ceil(timeUntilReset / 1000)} seconds before next call.`);
      
      // Wait until rate limit resets
      await new Promise(resolve => setTimeout(resolve, timeUntilReset + 1000));
      
      // Re-check after waiting
      const nowAfterWait = Date.now();
      this.apiCallHistory = this.apiCallHistory.filter(timestamp => timestamp > (nowAfterWait - 60000));
    }
    
    // Check minimum delay between calls
    if (this.apiCallHistory.length > 0) {
      const lastCallTime = this.apiCallHistory[this.apiCallHistory.length - 1];
      const timeSinceLastCall = now - lastCallTime;
      
      if (timeSinceLastCall < this.minDelayBetweenCalls) {
        const delay = this.minDelayBetweenCalls - timeSinceLastCall;
        console.log(`Waiting ${delay}ms to respect minimum delay between API calls`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Record this API call
    this.apiCallHistory.push(Date.now());

    const baseUrl = this.resolveBaseUrl(provider);
    const model = this.resolveModel(provider);
    const temperature = typeof this.temperature === 'number' ? this.temperature : 0.3;

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`[AITabGrouper] LLM call failed. Retrying attempt ${attempt + 1}/${maxRetries + 1} in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        let apiUrl = '';
        const headers = {
          'Content-Type': 'application/json'
        };
        let bodyPayload = {};

        switch (provider) {
          case 'openai': {
            const endpointBase = baseUrl || providerDefaults.openai.baseUrl;
            apiUrl = `${endpointBase}/chat/completions`;
            headers['Authorization'] = `Bearer ${apiKey}`;
            bodyPayload = {
              model: model || providerDefaults.openai.defaultModel,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 150,
              temperature
            };
            break;
          }
          case 'anthropic': {
            const endpointBase = baseUrl || providerDefaults.anthropic.baseUrl;
            apiUrl = `${endpointBase}/messages`;
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            bodyPayload = {
              model: model || providerDefaults.anthropic.defaultModel,
              max_tokens: 150,
              messages: [{ role: 'user', content: prompt }]
            };
            break;
          }
          case 'gemini': {
            const endpointBase = baseUrl || providerDefaults.gemini.baseUrl;
            apiUrl = `${endpointBase}/models/${encodeURIComponent(model || providerDefaults.gemini.defaultModel)}:generateContent`;
            headers['x-goog-api-key'] = apiKey;
            bodyPayload = {
              contents: [
                {
                  role: 'user',
                  parts: [{ text: prompt }]
                }
              ]
            };
            break;
          }
          case 'zai': {
            const endpointBase = baseUrl || providerDefaults.zai.baseUrl;
            apiUrl = `${endpointBase}/chat/completions`;
            headers['Authorization'] = `Bearer ${apiKey}`;
            bodyPayload = {
              model: model || providerDefaults.zai.defaultModel,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 150,
              temperature
            };
            break;
          }
          case 'custom': {
            const endpointBase = baseUrl || providerDefaults.custom.baseUrl;
            if (!endpointBase) {
              throw new Error('Custom provider selected but no base URL configured.');
            }
            apiUrl = `${endpointBase}/chat/completions`;
            headers['Authorization'] = `Bearer ${apiKey}`;
            bodyPayload = {
              model: model || providerDefaults.custom.defaultModel || 'gpt-3.5-turbo',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 150,
              temperature
            };
            break;
          }
          default: {
            throw new Error(`Unsupported provider: ${provider}`);
          }
        }

        apiUrl = apiUrl.replace(/([^:]\/)\/+/g, '$1');

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload)
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const error = new Error(`LLM ${provider} request failed with status ${response.status}: ${errorText.slice(0, 300)}`);
          error.status = response.status;
          throw error;
        }

        const data = await response.json();
        const content = this.normalizeProviderResponse(provider, data);

        if (!content) {
          console.debug('[AITabGrouper] Unable to extract response content from provider', { provider, data });
          return null;
        }

        return content; // Success
      } catch (error) {
        lastError = error;
        console.error(`[AITabGrouper] LLM API call attempt ${attempt + 1} failed:`, error.message);

        // Non-retriable auth errors
        if (error.status === 401 || error.status === 403) {
          console.error(`[AITabGrouper] Authentication error (${error.status}). Aborting retries.`);
          break; // Exit loop immediately
        }
        
        // Log retriable errors
        if (error.status === 429) {
          console.warn(`[AITabGrouper] Rate limit error (429) from provider ${provider}.`);
        } else if (error.status >= 500) {
          console.warn(`[AITabGrouper] Server error (${error.status}) from provider ${provider}.`);
        } else if (!error.status) {
          console.warn(`[AITabGrouper] Network error during fetch for provider ${provider}.`);
        }
      }
    }

    // If we exit the loop, all retries have failed.
    console.error(`[AITabGrouper] LLM API call failed after ${maxRetries + 1} attempts.`);
    this.apiCallHistory.pop(); // Remove the failed call from history
    throw lastError; // Throw the last captured error
  }

  // Parse the LLM response
  parseLLMResponse(responseText) {
    try {
      // Try to find and parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      } else {
        // If no JSON found, try to extract information from plain text
        const shouldGroup = responseText.toLowerCase().includes('yes') || 
                           responseText.toLowerCase().includes('should group');
        return {
          shouldGroup: shouldGroup,
          reasoning: responseText.substring(0, 100) + '...'
        };
      }
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      return {
        shouldGroup: false,
        reasoning: `Error parsing response: ${error.message}`
      };
    }
  }

  // Mock response for testing
  getMockGroupingResponse(tab, allTabs, existingGroups) {
    console.log('Using mock response for tab:', tab.url);
    
    // Simple mock logic - could be expanded for more sophisticated testing
    const hostname = new URL(tab.url).hostname.toLowerCase();
    
    if (hostname.includes('facebook') || hostname.includes('twitter') || hostname.includes('instagram')) {
      return {
        shouldGroup: true,
        groupName: "Social Media",
        color: "red",
        existingGroupId: null,
        reasoning: "Mock: Social media site detected"
      };
    } else if (hostname.includes('gmail') || hostname.includes('outlook')) {
      return {
        shouldGroup: true,
        groupName: "Email",
        color: "blue",
        existingGroupId: null,
        reasoning: "Mock: Email site detected"
      };
    } else if (hostname.includes('youtube') || hostname.includes('netflix')) {
      return {
        shouldGroup: true,
        groupName: "Entertainment",
        color: "pink",
        existingGroupId: null,
        reasoning: "Mock: Entertainment site detected"
      };
    } else {
      return {
        shouldGroup: false,
        reasoning: "Mock: No grouping needed for this site"
      };
    }
  }

  // Fallback static grouping rules
  async classifyTab(tab, allTabs = [], existingGroups = []) {
    try {
      const hostname = new URL(tab.url).hostname.toLowerCase();
      const pathname = new URL(tab.url).pathname.toLowerCase();
      
      // Check each grouping rule to see if this tab matches
      for (const rule of this.groupingRules) {
        for (const pattern of rule.patterns) {
          if (hostname.includes(pattern) || pathname.includes(pattern)) {
            console.log(`Tab ${tab.id} matches rule: ${rule.name} (${pattern})`);
            
            // Check if there's already an existing group with this rule's name
            let existingGroup = null;
            for (const group of existingGroups) {
              if (group.title && group.title.toLowerCase().includes(rule.name.toLowerCase())) {
                existingGroup = group;
                break;
              }
            }
            
            return {
              shouldGroup: true,
              groupName: rule.name,
              color: rule.color,
              existingGroupId: existingGroup ? existingGroup.id : null,
              reasoning: `Hostname ${hostname} or pathname ${pathname} matches pattern ${pattern} for group ${rule.name}`
            };
          }
        }
      }
      
      // If no rule matches based on URL, try to match based on tab title
      if (tab.title) {
        const title = tab.title.toLowerCase();
        for (const rule of this.groupingRules) {
          for (const keyword of rule.patterns) {
            if (title.includes(keyword)) {
              console.log(`Tab ${tab.id} matches rule by title: ${rule.name} (${keyword})`);
              
              // Check if there's already an existing group with this rule's name
              let existingGroup = null;
              for (const group of existingGroups) {
                if (group.title && group.title.toLowerCase().includes(rule.name.toLowerCase())) {
                  existingGroup = group;
                  break;
                }
              }
              
              return {
                shouldGroup: true,
                groupName: rule.name,
                color: rule.color,
                existingGroupId: existingGroup ? existingGroup.id : null,
                reasoning: `Title ${title} matches keyword ${keyword} for group ${rule.name}`
              };
            }
          }
        }
      }
      
      // If no rule matches, return that it should not be grouped
      return {
        shouldGroup: false,
        reasoning: "No matching grouping rules found for this tab"
      };
    } catch (error) {
      console.error('Error classifying tab:', error);
      return {
        shouldGroup: false,
        reasoning: `Error during classification: ${error.message}`
      };
    }
  }

  async executeGrouping(tabs, decision) {
    if (!tabs || tabs.length === 0) {
      return;
    }
    const tabIds = tabs.map(t => t.id);
    let groupId;

    if (decision.existingGroupId) {
      // Add to existing group
      console.log(`Adding ${tabIds.length} tabs to existing group ${decision.existingGroupId}`);
      groupId = decision.existingGroupId;
      await chrome.tabs.group({
        tabIds: tabIds,
        groupId: groupId
      });
    } else {
      // Create new group
      console.log(`Creating new group for ${tabIds.length} tabs.`);
      groupId = await chrome.tabs.group({ tabIds: tabIds });
      await chrome.tabGroups.update(groupId, {
        title: decision.groupName,
        color: decision.color || 'grey'
      });
      console.log(`Updated new group ${groupId} with title "${decision.groupName}" and color "${decision.color}"`);
    }
    
    console.log(`Successfully grouped ${tabIds.length} tabs into group ${groupId}`);
  }
}

async function initializeTabGrouper() {
  tabGrouper = new AITabGrouper();

  try {
    const settings = await chrome.storage.sync.get(['apiKey', 'llmProvider']);
    if (settings.llmProvider) {
      tabGrouper.llmProvider = settings.llmProvider;
    }
    tabGrouper.apiKey = settings.apiKey || null;

    const initialKey = tabGrouper.resolveApiKey(tabGrouper.llmProvider);
    tabGrouper.useMock = !initialKey;

    await tabGrouper.loadSettings();
  } catch (error) {
    console.error('Failed to load initial settings:', error);
  }
}

// Initialize the AI Tab Grouper
initializeTabGrouper().catch((error) => {
  console.error('Error initializing AI Tab Grouper:', error);
});
