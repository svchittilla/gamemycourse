// Background service worker - handles tab switching and global events
console.log('Gamify Course Tracker - Background script loaded');

// Track when user switches tabs (attention loss indicator)
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Tab switched to:', activeInfo.tabId);
  
  // Store the last active time for attention tracking
  chrome.storage.local.set({ 
    lastTabSwitch: Date.now(),
    activeTabId: activeInfo.tabId 
  });
});

// Track when tabs are updated (page loads, refreshes, etc.)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    console.log('Page loaded:', tab.url);
    
    // Store page load event
    chrome.storage.local.set({ 
      lastPageLoad: Date.now(),
      currentUrl: tab.url 
    });
  }
});

// Track when window focus changes (user switches to other apps)
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    console.log('Browser lost focus - user switched to another app');
    chrome.storage.local.set({ browserFocusLost: Date.now() });
  } else {
    console.log('Browser gained focus - user returned');
    chrome.storage.local.set({ browserFocusGained: Date.now() });
  }
});

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Gamify Course Tracker installed successfully!');
  
  // Set initial values
  chrome.storage.local.set({
    extensionInstalled: Date.now(),
    trackingActive: true
  });
});