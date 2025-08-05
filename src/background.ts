// Suggested sites that commonly benefit from aggressive mode
const SUGGESTED_AGGRESSIVE_SITES = [
  'dash.cloudflare.com',
  'developers.cloudflare.com', 
  'docs.deno.com',
  'docs.sillytavern.app',
  'sillytavern.app',
  'uploadthing.com',
  'gradio.app',
  'openwebui.com',
  'reddit.com',
  'langchain.com',
  'hoppscotch.io',
  'reflex.dev',
  'drizzle.team',
  'chatgpt.com',
  'docs.github.com',
  'gemini.google.com',
  'aistudio.google.com',
  'notion.so',
  'linear.app',
  'vercel.com',
  'supabase.com'
];

chrome.runtime.onInstalled.addListener(() => {
  console.log('Eye Guard installed or updated.');

  // Set default settings only if they are not already set
  chrome.storage.sync.get([
    'color', 'enabled', 'excludedSites', 'aggressiveModeSites', 'alwaysOnAggressiveMode',
    'sensitivity', 'autoAggressiveSites', 'suggestedSitesEnabled'
  ], (data) => {
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
      updates.aggressiveModeSites = []; // Default to no aggressive sites
    }
    if (data.alwaysOnAggressiveMode === undefined) {
      updates.alwaysOnAggressiveMode = false; // Default to disabled
    }
    if (data.sensitivity === undefined) {
      updates.sensitivity = 240; // Default RGB threshold
    }
    if (data.autoAggressiveSites === undefined) {
      updates.autoAggressiveSites = false; // Default to manual mode
    }
    if (data.suggestedSitesEnabled === undefined) {
      updates.suggestedSitesEnabled = true; // Default to showing suggestions
    }

    if (Object.keys(updates).length > 0) {
      chrome.storage.sync.set(updates, () => {
        console.log('Default settings applied for missing values:', updates);
      });
    }
  });
});

function checkIfSuggestedSite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return SUGGESTED_AGGRESSIVE_SITES.some(site => 
      hostname === site || hostname.endsWith('.' + site)
    );
  } catch {
    return false;
  }
}

function updateBadgeForTab(tabId: number, url: string): void {
  if (!checkIfSuggestedSite(url)) {
    chrome.action.setBadgeText({ text: '', tabId });
    return;
  }

  chrome.storage.sync.get(['suggestedSitesEnabled', 'aggressiveModeSites', 'autoAggressiveSites'], (data) => {
    if (!data.suggestedSitesEnabled) {
      chrome.action.setBadgeText({ text: '', tabId });
      return;
    }

    const hostname = new URL(url).hostname;
    const aggressiveModeSites = data.aggressiveModeSites || [];
    const isAlreadyInAggressive = aggressiveModeSites.some((site: string) => 
      hostname.includes(site) || site.includes(hostname)
    );

    if (isAlreadyInAggressive) {
      chrome.action.setBadgeText({ text: '', tabId });
    } else {
      chrome.action.setBadgeText({ text: '!', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#ff6b35', tabId });
      chrome.action.setTitle({ 
        title: 'Eye Guard suggests aggressive mode for this site', 
        tabId 
      });
    }
  });
}

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
  } else if (message.type === 'addCurrentToAggressive') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        const hostname = new URL(tabs[0].url).hostname;
        chrome.storage.sync.get(['aggressiveModeSites'], (data) => {
          const sites: string[] = data.aggressiveModeSites || [];
          if (!sites.includes(hostname)) {
            sites.push(hostname);
            chrome.storage.sync.set({ aggressiveModeSites: sites }, () => {
              chrome.action.setBadgeText({ text: '', tabId: tabs[0].id });
              sendResponse({ status: 'success', site: hostname });
            });
          } else {
            sendResponse({ status: 'alreadyExists' });
          }
        });
      }
    });
  } else if (message.type === 'getSuggestedSiteStatus') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        const isSuggested = checkIfSuggestedSite(tabs[0].url);
        sendResponse({ isSuggested, url: tabs[0].url });
      } else {
        sendResponse({ isSuggested: false });
      }
    });
  }
  return true; // Keeps the message channel open for async response
});

chrome.webNavigation.onCommitted.addListener((details) => {
  // Ignore if it's not the main frame or navigation to a new page
  if (details.frameId !== 0) return;

  // Update badge for suggested sites
  updateBadgeForTab(details.tabId, details.url);

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

// Update badge when switching tabs
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      updateBadgeForTab(activeInfo.tabId, tab.url);
    }
  });
});

// Update badge when tab URL changes  
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.url) {
    updateBadgeForTab(tabId, tab.url);
  }
});