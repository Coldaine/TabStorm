# Chrome Extension Development Bible for AI-Powered Tab Grouping

## Core APIs and Documentation Links

### Primary Documentation
- **Chrome Extensions API Reference**: https://developer.chrome.com/docs/extensions/reference/api  [1]
- **chrome.tabs API**: https://developer.chrome.com/docs/extensions/reference/api/tabs  [2]
- **chrome.tabGroups API**: https://developer.chrome.com/docs/extensions/reference/api/tabGroups  [3]
- **Extension Service Worker Basics**: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics  [4]
- **Manifest V3 Migration Guide**: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers  [5]

## Essential Chrome APIs for Your Extension

### 1. chrome.tabs API
**Purpose**: Core tab manipulation and monitoring[2]
**Key Methods**:
- `chrome.tabs.query()` - Find tabs matching criteria[2]
- `chrome.tabs.group()` - Create new tab groups or add tabs to existing groups[6][7]
- `chrome.tabs.ungroup()` - Remove tabs from groups[6]
- `chrome.tabs.get()` - Get tab details by ID[2]
- `chrome.tabs.onCreated` - Listen for new tabs[8]
- `chrome.tabs.onUpdated` - Listen for tab changes (URL, title, status)[9][10]
- `chrome.tabs.onActivated` - Listen for tab activation[2]

**Code Example**:
```javascript
// Create a group and add tabs
const groupId = await chrome.tabs.group({ tabIds: [tab1.id, tab2.id] });

// Listen for new tabs
chrome.tabs.onCreated.addListener((tab) => {
  console.log('New tab created:', tab.id);
});

// Monitor tab updates for URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && changeInfo.url) {
    // Tab finished loading with new URL
    analyzeAndGroupTab(tab);
  }
});
```

### 2. chrome.tabGroups API
**Purpose**: Manage native Chrome tab groups[11][3]
**Key Methods**:
- `chrome.tabGroups.get()` - Get group details by ID[11]
- `chrome.tabGroups.query()` - Find groups matching criteria[12]
- `chrome.tabGroups.update()` - Modify group properties (title, color, collapsed)[7][11]
- `chrome.tabGroups.move()` - Move groups within/between windows[11]
- `chrome.tabGroups.onCreated` - Listen for group creation[11]
- `chrome.tabGroups.onUpdated` - Listen for group changes[11]
- `chrome.tabGroups.onRemoved` - Listen for group deletion[11]

**Code Example**:
```javascript
// Update group with AI-generated name and color
await chrome.tabGroups.update(groupId, {
  title: "AI-Generated: Social Media",
  color: "blue",
  collapsed: false
});

// Query existing groups
const groups = await chrome.tabGroups.query({ windowId: windowId });
```

### 3. Service Worker (Background Script)
**Purpose**: Persistent background logic for monitoring and automation[13][4]
**Key Concepts**:
- Runs in background, activated by events[13]
- No direct DOM access (use offscreen documents if needed)[5]
- Event-driven architecture[14]

**Manifest Setup**:
```json
{
  "name": "AI Tab Grouper",
  "version": "1.0",
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"
  },
  "permissions": ["tabs", "tabGroups"],
  "host_permissions": ["<all_urls>"]
}
```

## Required Permissions

### Essential Permissions[2]
```json
{
  "permissions": [
    "tabs",        // Access tab URL, title, favIconUrl
    "tabGroups"    // Manage tab groups
  ],
  "host_permissions": [
    "<all_urls>"   // Access all sites for content analysis
  ]
}
```

## Core Architecture for AI-Powered Auto-Grouping

### 1. Background Service Worker Structure
```javascript
// background.js
class AITabGrouper {
  constructor() {
    this.setupEventListeners();
    this.groupingRules = new Map();
    this.apiKey = null; // Your BYOK API key
  }

  setupEventListeners() {
    // Monitor new tabs
    chrome.tabs.onCreated.addListener(this.handleTabCreated.bind(this));
    
    // Monitor tab updates (URL changes)
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
    
    // Monitor tab activation for context
    chrome.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
  }

  async handleTabCreated(tab) {
    // Wait for tab to finish loading
    if (tab.status !== 'complete') return;
    await this.analyzeAndGroupTab(tab);
  }

  async handleTabUpdated(tabId, changeInfo, tab) {
    // Only process when tab finishes loading with new URL
    if (changeInfo.status === 'complete' && changeInfo.url) {
      await this.analyzeAndGroupTab(tab);
    }
  }

  async analyzeAndGroupTab(tab) {
    try {
      // Get context of existing tabs
      const allTabs = await chrome.tabs.query({ windowId: tab.windowId });
      const existingGroups = await chrome.tabGroups.query({ windowId: tab.windowId });
      
      // Call your LLM API
      const groupDecision = await this.callLLMForGrouping(tab, allTabs, existingGroups);
      
      if (groupDecision.shouldGroup) {
        await this.executeGrouping(tab, groupDecision);
      }
    } catch (error) {
      console.error('Grouping failed:', error);
    }
  }

  async callLLMForGrouping(tab, allTabs, existingGroups) {
    // Your BYOK LLM integration here
    const prompt = this.buildGroupingPrompt(tab, allTabs, existingGroups);
    
    // Call OpenAI, Claude, local model, etc.
    const response = await fetch('YOUR_LLM_ENDPOINT', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 100
      })
    });
    
    return this.parseLLMResponse(await response.json());
  }

  async executeGrouping(tab, decision) {
    let groupId;
    
    if (decision.existingGroupId) {
      // Add to existing group
      groupId = decision.existingGroupId;
    } else {
      // Create new group
      groupId = await chrome.tabs.group({ tabIds: [tab.id] });
    }
    
    // Update group with AI-generated name and properties
    await chrome.tabGroups.update(groupId, {
      title: decision.groupName,
      color: decision.color || 'grey'
    });
    
    // Add tab to group if not already done
    if (decision.existingGroupId) {
      await chrome.tabs.group({
        tabIds: [tab.id],
        groupId: groupId
      });
    }
  }
}

// Initialize the grouper
new AITabGrouper();
```

### 2. LLM Integration Patterns

**Prompt Engineering**:
```javascript
buildGroupingPrompt(tab, allTabs, existingGroups) {
  return `
Analyze this tab and decide how to group it:

NEW TAB:
- URL: ${tab.url}
- Title: ${tab.title}

EXISTING TABS:
${allTabs.map(t => `- ${t.title} (${new URL(t.url).hostname})`).join('\n')}

EXISTING GROUPS:
${existingGroups.map(g => `- "${g.title}" (${g.color})`).join('\n')}

TASK: Should this tab be grouped? If yes, provide:
1. Group name (creative, descriptive)
2. Color (red, orange, yellow, green, blue, purple, pink, cyan)  
3. Whether to use existing group or create new one

Respond in JSON format:
{
  "shouldGroup": true/false,
  "groupName": "Creative Group Name",
  "color": "blue",
  "existingGroupId": null or group_id,
  "reasoning": "Brief explanation"
}
`;
}
```

## Tab Monitoring Strategies

### Real-time vs. Batch Processing
```javascript
// Real-time: Process each tab immediately
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    await processTab(tab);
  }
});

// Batch: Process multiple tabs periodically
setInterval(async () => {
  const ungroupedTabs = await chrome.tabs.query({ groupId: chrome.tabGroups.TAB_GROUP_ID_NONE });
  await processBatch(ungroupedTabs);
}, 30000); // Every 30 seconds
```

### Content Analysis Options
```javascript
// Option 1: URL/Title analysis only (fast, privacy-friendly)
function analyzeTabMetadata(tab) {
  return {
    domain: new URL(tab.url).hostname,
    title: tab.title,
    path: new URL(tab.url).pathname
  };
}

// Option 2: Content script for page analysis (more data)
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  function: extractPageContent
});

function extractPageContent() {
  return {
    headings: Array.from(document.querySelectorAll('h1,h2')).map(h => h.textContent),
    description: document.querySelector('meta[name="description"]')?.content,
    keywords: document.querySelector('meta[name="keywords"]')?.content
  };
}
```

## Development Workflow

### 1. Project Structure
```
my-ai-tab-grouper/
├── manifest.json
├── background.js
├── content.js (optional)
├── popup.html (optional)
├── popup.js (optional)
├── styles.css (optional)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 2. Testing and Debugging[15]
- Load unpacked extension at `chrome://extensions/`[15]
- Enable Developer Mode[15]
- Use service worker console for background debugging[14]
- Check extension errors in Extensions page[15]

### 3. Key Development Tips
- **Service worker lifecycle**: May shut down after inactivity[16][4]
- **Tab state synchronization**: Always query fresh tab state[6]
- **Error handling**: Wrap API calls in try-catch blocks
- **Rate limiting**: Don't overwhelm LLM APIs
- **Privacy**: Consider what data you send to external APIs

## Event Timing Considerations

### Tab Loading States[10]
```javascript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('Status:', changeInfo.status);
  // "loading" -> page starting to load
  // "complete" -> page finished loading
  
  if (changeInfo.status === 'complete' && changeInfo.url) {
    // Safe to analyze tab content
    analyzeTab(tab);
  }
});
```

### Avoiding Race Conditions[6]
```javascript
// Always query fresh tab data before grouping
async function groupTab(tabId) {
  const tab = await chrome.tabs.get(tabId); // Fresh data
  const groupId = await chrome.tabs.group({ tabIds: [tabId] });
  await chrome.tabGroups.update(groupId, { title: generateName(tab) });
}
```

This gives you everything you need to build an AI-powered Chrome extension that automatically manages native tab groups with dynamic naming. The key is combining Chrome's tab monitoring events with LLM analysis to create intelligent grouping decisions in real-time.