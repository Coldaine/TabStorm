// content.js
// This content script runs in the context of web pages to extract content for AI analysis

// Function to extract important content from the page
function extractPageContent() {
  try {
    // Get the page title
    const title = document.title || '';
    
    // Get meta description
    const description = document.querySelector('meta[name="description"]')?.content || 
                      document.querySelector('meta[property="og:description"]')?.content || '';
    
    // Extract headings (h1, h2, h3) which often indicate page content structure
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent.trim())
      .filter(text => text.length > 0);
    
    // Extract keywords if available
    const keywords = document.querySelector('meta[name="keywords"]')?.content || '';
    
    // Extract first paragraph or content summary (first 200 characters)
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(p => p.textContent.trim())
      .filter(text => text.length > 20); // Only meaningful paragraphs
    
    const contentPreview = paragraphs.length > 0 
      ? paragraphs[0].substring(0, 200) + (paragraphs[0].length > 200 ? '...' : '')
      : '';
    
    // Extract link texts that might indicate the purpose of the page
    const importantLinks = Array.from(document.querySelectorAll('a'))
      .filter(link => {
        const href = link.getAttribute('href') || '';
        // Filter out navigation and common links
        return link.textContent.trim().length > 5 && 
               !href.includes('#') && 
               !href.startsWith('javascript:') && 
               !href.startsWith('mailto:');
      })
      .slice(0, 5) // Only first 5 important links
      .map(link => link.textContent.trim());
    
    // Get the main content area (try to identify main content)
    let mainContent = '';
    const mainElement = document.querySelector('main') || 
                       document.querySelector('[role="main"]') || 
                       document.querySelector('.main-content') || 
                       document.querySelector('#content') || 
                       document.querySelector('.content');
    if (mainElement) {
      mainContent = mainElement.textContent.substring(0, 300);
    }
    
    return {
      title: title,
      description: description,
      headings: headings,
      keywords: keywords,
      contentPreview: contentPreview,
      importantLinks: importantLinks,
      mainContent: mainContent,
      url: window.location.href,
      hostname: window.location.hostname
    };
  } catch (error) {
    console.error('Error extracting page content:', error);
    return {
      title: document.title || '',
      description: '',
      headings: [],
      keywords: '',
      contentPreview: '',
      importantLinks: [],
      mainContent: '',
      url: window.location.href,
      hostname: window.location.hostname
    };
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    const content = extractPageContent();
    sendResponse({ content: content });
  }
  // Return true to indicate we want to send a response asynchronously
  return true;
});

console.log('AI Tab Grouper content script loaded on:', window.location.href);