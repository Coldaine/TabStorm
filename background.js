// background.js
console.log("AI Tab Grouper background service worker loaded");

// Static rules for tab grouping (before implementing AI)
const groupingRules = [
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

class AITabGrouper {
  constructor() {
    this.groupingRules = groupingRules;
    this.setupEventListeners();
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
    console.log(`Analyzing tab: ${tab.title} (${tab.url})`);
    
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
    
    // Determine which group this tab should belong to based on static rules
    const groupDecision = await this.classifyTab(tab, tabsInWindow, groupsInWindow);
    
    if (groupDecision.shouldGroup) {
      await this.executeGrouping(tab, groupDecision);
    } else {
      console.log(`Tab ${tab.id} does not match any grouping criteria, leaving ungrouped.`);
    }
  }

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
new AITabGrouper();