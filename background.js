// background.js
console.log("AI Tab Grouper background service worker loaded");

// Initialize the AI Tab Grouper
const tabGrouper = new AITabGrouper();
async function initializeTabGrouper() {
  // Load settings from storage
  const settings = await chrome.storage.sync.get(['apiKey', 'llmProvider']);
  if (settings.apiKey) {
    tabGrouper.apiKey = settings.apiKey;
    tabGrouper.useMock = false;
  } else {
    tabGrouper.useMock = true; // Use mock if no API key is provided
  }
  if (settings.llmProvider) {
    tabGrouper.llmProvider = settings.llmProvider;
  }
}

// Handle messages from popup and options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateApiKey') {
    tabGrouper.apiKey = message.apiKey;
    tabGrouper.llmProvider = message.llmProvider;
    tabGrouper.useMock = !message.apiKey; // Use mock if no API key is provided
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
      // Handle new tab after it finishes loading
    });
    
    // Monitor tab updates (URL changes, loading completion)
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && changeInfo.url) {
        console.log('Tab updated with new URL:', tab.url);
        // At this point, the tab has finished loading with new content
        await this.analyzeAndGroupTab(tab);
      }
    });
    
    // Monitor tab activation for context
    chrome.tabs.onActivated.addListener((activeInfo) => {
      console.log('Tab activated:', activeInfo.tabId);
    });
    
    // Monitor tab removal
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      console.log('Tab removed:', tabId);
    });
  }

  async analyzeAndGroupTab(tab) {
    try {
      console.log(`Analyzing tab: ${tab.title} (${tab.url})`);
      
      // Check grouping mode and paused state
      const settings = await chrome.storage.sync.get(['groupingMode', 'groupingPaused']);
      const groupingMode = settings.groupingMode || 'auto';
      const groupingPaused = settings.groupingPaused || false;
      
      // Skip grouping if paused or disabled
      if (groupingPaused || groupingMode === 'disabled') {
        console.log(`Grouping is ${groupingPaused ? 'paused' : 'disabled'}, skipping tab ${tab.id}`);
        return;
      }
      
      // Skip if tab is already in a group
      if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        console.log(`Tab ${tab.id} is already in a group (ID: ${tab.groupId}), skipping.`);
        return;
      }
      
      // Get all tabs in the same window
      const tabsInWindow = await chrome.tabs.query({ windowId: tab.windowId });
      console.log(`Found ${tabsInWindow.length} tabs in window ${tab.windowId}`);
      
      // Get existing groups in the same window
      const groupsInWindow = await chrome.tabGroups.query({ windowId: tab.windowId });
      console.log(`Found ${groupsInWindow.length} existing groups in window ${tab.windowId}`);
      
      // For 'manual' mode, we might want to notify user instead of auto-grouping
      if (groupingMode === 'manual') {
        console.log(`Manual mode: Tab ${tab.id} could be grouped, but waiting for user action`);
        // Could send a notification to user here
        return;
      }
      
      // Extract content from the current tab
      let tabContent = null;
      try {
        // Execute content script to extract page content
        const contentResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // This function will run in the content script context
            return {
              title: document.title,
              description: document.querySelector('meta[name="description"]')?.content || '',
              headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(el => el.textContent.trim()),
              url: window.location.href,
              hostname: window.location.hostname
            };
          }
        });
        
        // Get the result from the content script execution
        if (contentResults && contentResults[0] && contentResults[0].result) {
          tabContent = contentResults[0].result;
        } else {
          console.log(`Could not extract content from tab ${tab.id}, using basic info only`);
          tabContent = null;
        }
      } catch (contentError) {
        console.log(`Content script execution failed for tab ${tab.id}:`, contentError.message);
        // Continue with basic info if content script fails
        tabContent = null;
      }
      
      // Call the LLM for grouping decision with content if available
      const groupDecision = await this.callLLMForGrouping(tab, tabsInWindow, groupsInWindow, tabContent);
      
      if (groupDecision.shouldGroup) {
        await this.executeGrouping(tab, groupDecision);
      } else {
        console.log(`Tab ${tab.id} should not be grouped according to LLM decision.`);
      }
    } catch (error) {
      console.error('Error during tab analysis and grouping:', error);
      
      // Fallback to static rules if primary method fails
      try {
        const fallbackDecision = await this.classifyTab(tab, tabsInWindow, groupsInWindow);
        if (fallbackDecision.shouldGroup) {
          await this.executeGrouping(tab, fallbackDecision);
        }
      } catch (fallbackError) {
        console.error('Error during fallback classification:', fallbackError);
        // As a last resort, we can simply log the error and continue
        console.log(`Tab ${tab.id} will remain ungrouped due to errors:`, error.message);
      }
    }
  }

  // New method: Call LLM API for grouping decision
  async callLLMForGrouping(tab, allTabs, existingGroups, tabContent = null) {
    if (this.useMock) {
      // Use mock response for testing
      return this.getMockGroupingResponse(tab, allTabs, existingGroups);
    }
    
    // Build prompt for the LLM with content information
    const prompt = this.buildGroupingPrompt(tab, allTabs, existingGroups, tabContent);
    
    try {
      // Call OpenAI, Claude, or other API
      const response = await this.callExternalLLM(prompt);
      const parsedResponse = this.parseLLMResponse(response);
      
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
      const validColors = ["red", "blue", "green", "yellow", "purple", "pink", "cyan", "orange"];
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
  buildGroupingPrompt(tab, allTabs, existingGroups, tabContent = null) {
    const tabInfo = {
      url: tab.url,
      title: tab.title,
      domain: new URL(tab.url).hostname,
      // Extract additional context from the URL
      pathname: new URL(tab.url).pathname,
      search: new URL(tab.url).search
    };

    const existingTabInfo = allTabs
      .filter(t => t.id !== tab.id) // Exclude the current tab from existing tabs
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

    let contentDescription = "No additional content available";
    if (tabContent) {
      contentDescription = `
Page Title: "${tabContent.title}"
Meta Description: "${tabContent.description}"
Headings: [${tabContent.headings && tabContent.headings.length > 0 ? tabContent.headings.slice(0, 5).join(', ') : 'No headings found'}]
Hostname: ${tabContent.hostname}
`;
    }

    return `
You are an intelligent tab grouping assistant. Analyze the new tab and determine the best way to organize it with other tabs.

NEW TAB TO ANALYZE:
- Title: "${tabInfo.title}"
- URL: ${tabInfo.url}
- Domain: ${tabInfo.domain}
- Path: ${tabInfo.pathname}

PAGE CONTENT ANALYSIS:
${contentDescription}

EXISTING TABS IN THE SAME WINDOW:
${existingTabInfo.length > 0 
  ? existingTabInfo.map(t => `- "${t.title}" (${t.domain})`).join('\n') 
  : 'No other tabs in this window'}

EXISTING GROUPS IN THE SAME WINDOW:
${existingGroupInfo.length > 0 
  ? existingGroupInfo.map(g => `- Group ID: ${g.id}, Title: "${g.title}", Color: ${g.color}`).join('\n')
  : 'No existing groups in this window'}

TASK:
Analyze the content, domain, and purpose of the new tab. Decide if it should be grouped with existing tabs or if it needs its own group.

Consider the page content analysis when making your decision, as it provides more context than just the URL.

If there's an existing group with similar content, suggest using that group (provide the exact group ID).
If the tab is unique or doesn't fit existing groups, suggest creating a new group.

When creating new groups, use creative, descriptive, and specific names that accurately represent the content/website purpose. Avoid generic names like "General" or "Other".

Group name suggestions: Shopping, Social Media, News & Updates, Entertainment, Work & Productivity, Learning & Education, Finance & Banking, Health & Fitness, Travel & Maps, etc.

COLOR SELECTION GUIDELINES:
- Red: Social Media, Entertainment
- Blue: Work, Communication, Productivity
- Green: Nature, Health, Finance, Environment
- Yellow: News, Alerts, Notifications
- Purple: Creative, Art, Design, Lifestyle
- Orange: Shopping, Deals, Food
- Pink: Fashion, Beauty, Lifestyle
- Cyan: Technology, Science, Information

IMPORTANT: Respond with only valid JSON in the following exact format:
{
  "shouldGroup": true,
  "groupName": "Specific and descriptive group name",
  "color": "blue",
  "existingGroupId": null (to create new) or existing group ID (like 123) to add to existing group,
  "reasoning": "Brief explanation of why this tab should be grouped this way"
}
If you cannot make a good grouping decision, respond with:
{
  "shouldGroup": false,
  "reasoning": "Brief explanation of why grouping is not appropriate"
}
`;
  }

  // Call external LLM API with rate limiting
  async callExternalLLM(prompt) {
    if (!this.apiKey && !this.useMock) {
      throw new Error('No API key configured for LLM');
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

    try {
      // Example for OpenAI API - would need to be customized based on the selected LLM service
      let apiUrl, headers, body;
      
      switch(this.llmProvider) {
        case 'openai':
          apiUrl = 'https://api.openai.com/v1/chat/completions';
          headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          };
          body = JSON.stringify({
            model: 'gpt-3.5-turbo', // or gpt-4 if preferred
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.3
          });
          break;
          
        case 'anthropic':
          apiUrl = 'https://api.anthropic.com/v1/messages';
          headers = {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          };
          body = JSON.stringify({
            model: 'claude-3-haiku-20240307',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150
          });
          break;
          
        case 'gemini':
          apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;
          headers = {
            'Content-Type': 'application/json'
          };
          body = JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          });
          break;
          
        default:
          // Default to OpenAI format
          apiUrl = 'https://api.openai.com/v1/chat/completions';
          headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          };
          body = JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.3
          });
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: body
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      let content;
      switch(this.llmProvider) {
        case 'openai':
          content = data.choices[0].message.content;
          break;
          
        case 'anthropic':
          content = data.content[0].text;
          break;
          
        case 'gemini':
          content = data.candidates[0].content.parts[0].text;
          break;
          
        default:
          content = data.choices[0].message.content;
      }
      
      return content;
    } catch (error) {
      console.error('Error calling LLM API:', error);
      this.apiCallHistory.pop(); // Remove the failed call from history
      throw error;
    }
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
  async classifyTab(tab, allTabs, existingGroups) {
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

  async executeGrouping(tab, decision) {
    let groupId;
    
    if (decision.existingGroupId) {
      // Add to existing group
      console.log(`Adding tab ${tab.id} to existing group ${decision.existingGroupId}`);
      groupId = decision.existingGroupId;
      
      // Add the tab to the existing group
      await chrome.tabs.group({
        tabIds: [tab.id],
        groupId: groupId
      });
    } else {
      // Create new group
      console.log(`Creating new group for tab ${tab.id}`);
      groupId = await chrome.tabs.group({ tabIds: [tab.id] });
    }
    
    // Update group with rule-based name and properties if it's a new group
    // or if it's not already named according to our rules
    if (!decision.existingGroupId) {
      await chrome.tabGroups.update(groupId, {
        title: decision.groupName,
        color: decision.color || 'grey'
      });
      console.log(`Updated group ${groupId} with title "${decision.groupName}" and color "${decision.color}"`);
    }
    
    console.log(`Successfully grouped tab ${tab.id} into group ${groupId}`);
  }
}

// Initialize the AI Tab Grouper
initializeTabGrouper();