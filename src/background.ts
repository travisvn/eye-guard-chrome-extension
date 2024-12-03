chrome.runtime.onInstalled.addListener(() => {
  console.log('Eye Guard installed or updated.');

  // Set default settings only if they are not already set
  chrome.storage.sync.get(['color', 'enabled', 'excludedSites', 'aggressiveModeSites', 'alwaysOnAggressiveMode'], (data) => {
    const updates: Partial<Record<string, any>> = {};

    if (!data.color) {
      updates.color = '#cce8cf'; // Default color
    }
    if (data.enabled === undefined) {
      updates.enabled = true; // Default to enabled
    }
    if (!data.excludedSites) {
      updates.excludedSites = []; // Default to no excluded sites
    }
    if (!data.aggressiveModeSites) {
      updates.aggressiveModeSites = []; // Default to no excluded sites
    }
    if (data.alwaysOnAggressiveMode === undefined) {
      updates.alwaysOnAggressiveMode = false; // Default to disabled
    }

    if (Object.keys(updates).length > 0) {
      chrome.storage.sync.set(updates, () => {
        console.log('Default settings applied for missing values:', updates);
      });
    }
  });
});

// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'addExcludedSite') {
    chrome.storage.sync.get(['excludedSites'], (data) => {
      const sites: string[] = data.excludedSites || [];
      if (!sites.includes(message.site)) {
        sites.push(message.site);
        chrome.storage.sync.set({ excludedSites: sites }, () => {
          sendResponse({ status: 'success', excludedSites: sites });
        });
      } else {
        sendResponse({ status: 'alreadyExists' });
      }
    });
  }
  return true; // Keeps the message channel open for async response
});

chrome.webNavigation.onCommitted.addListener((details) => {
  // Ignore if it's not the main frame or navigation to a new page
  if (details.frameId !== 0) return;

  // Inject the content script programmatically
  chrome.scripting.executeScript(
    {
      target: { tabId: details.tabId },
      files: ['content.js']
    },
    () => {
      // console.log('Content script re-injected after navigation.');
    }
  );
});