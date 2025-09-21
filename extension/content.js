// Content script - runs on every webpage to track engagement
console.log('Gamify Course Tracker - Content script loaded on:', window.location.href);

// Global tracking variables
let trackingData = {
  sessionId: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
  url: window.location.href,
  startTime: Date.now(),
  lastActivity: Date.now(),
  lastIdleCheck: Date.now(),
  idleTime: 0,
  scrollDepth: 0,
  maxScrollDepth: 0,
  totalScrolls: 0,
  tabSwitches: 0,
  readingTime: 0,
  tabAwayTime: 0
};

// Scroll session tracking
let scrollTimeout = null;
let isCurrentlyScrolling = false;
let lastScrollTime = 0;

// Tab away tracking
let tabHiddenTime = null;
let totalTabAwayTime = 0;

console.log('Session started:', trackingData.sessionId);

// Activity tracking functions
function updateLastActivity() {
  trackingData.lastActivity = Date.now();
  trackingData.lastIdleCheck = Date.now(); // Reset idle check timer
}

function trackScrollDepth() {
  let scrollTop, documentHeight;
  
  // Try to detect if we're in a Jupyter/Coursera environment
  const isJupyter = document.querySelector('.jp-Notebook') || 
                   document.querySelector('.notebook') ||
                   window.location.href.includes('coursera') ||
                   window.location.href.includes('jupyter');
  
  if (isJupyter) {
    // For Jupyter notebooks, try to find the main scrollable container
    const scrollContainer = document.querySelector('.jp-WindowedPanel-outer') ||
                           document.querySelector('.jp-Notebook') ||
                           document.querySelector('.notebook-container') ||
                           document.querySelector('[data-jp-main-content-panel]') ||
                           document.documentElement;
    
    scrollTop = scrollContainer.scrollTop || window.pageYOffset || document.documentElement.scrollTop;
    documentHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    
    console.log('📓 Jupyter detected - container:', scrollContainer.className, 'scrollTop:', scrollTop, 'height:', documentHeight);
  } else {
    // Regular webpage scroll detection
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    documentHeight = document.documentElement.scrollHeight - window.innerHeight;
  }
  
  const currentTime = Date.now();
  
  if (documentHeight > 0) {
    const newScrollDepth = Math.min(Math.max(scrollTop / documentHeight, 0), 1.0);
    trackingData.scrollDepth = newScrollDepth;
    trackingData.maxScrollDepth = Math.max(trackingData.maxScrollDepth, trackingData.scrollDepth);
    
    // console.log(`📊 Scroll: ${(newScrollDepth * 100).toFixed(1)}% (${scrollTop}/${documentHeight})`);
  }
  
  // Scroll session counting logic with adaptive timeout
  if (!isCurrentlyScrolling) {
    // Start of a new scroll session
    isCurrentlyScrolling = true;
    trackingData.totalScrolls++;
    console.log(`🖱️ Scroll session #${trackingData.totalScrolls} started`);
  }
  
  // Clear existing timeout and set a new one
  clearTimeout(scrollTimeout);
  
  // Use longer timeout if scrolls are happening rapidly (likely arrow keys or held scroll)
  const timeSinceLastScroll = currentTime - lastScrollTime;
  const timeoutDuration = timeSinceLastScroll < 50 ? 500 : 150; // 500ms for rapid scrolls, 150ms for normal
  
  scrollTimeout = setTimeout(() => {
    // Scroll session ended
    isCurrentlyScrolling = false;
    console.log(`🖱️ Scroll session #${trackingData.totalScrolls} ended`);
  }, timeoutDuration);
  
  lastScrollTime = currentTime;
  updateLastActivity();
}

// Event listeners for user activity
document.addEventListener('mousemove', updateLastActivity);
document.addEventListener('keydown', updateLastActivity);
document.addEventListener('click', updateLastActivity);
document.addEventListener('touchstart', updateLastActivity);

// Enhanced scroll tracking
document.addEventListener('scroll', trackScrollDepth, { passive: true });
window.addEventListener('scroll', trackScrollDepth, { passive: true });

// Additional scroll detection for complex web apps (Jupyter, Coursera, etc.)
setTimeout(() => {
  // Look for common scrollable containers in web apps
  const scrollableContainers = [
    '.jp-WindowedPanel-outer',    // JupyterLab
    '.jp-Notebook',               // JupyterLab notebook
    '.notebook-container',        // Classic Jupyter
    '[data-jp-main-content-panel]', // JupyterLab main panel
    '.coursera-content',          // Coursera
    '.main-content',              // Generic
    '#main-content'               // Generic
  ];
  
  scrollableContainers.forEach(selector => {
    const container = document.querySelector(selector);
    if (container) {
      console.log(`📓 Found scrollable container: ${selector}`);
      container.addEventListener('scroll', trackScrollDepth, { passive: true });
    }
  });
}, 2000); // Wait 2 seconds for dynamic content to load

// Additional activity detection
document.addEventListener('mousedown', updateLastActivity);
document.addEventListener('keyup', updateLastActivity);
window.addEventListener('resize', updateLastActivity);

// Page visibility tracking (tab switching)
document.addEventListener('visibilitychange', () => {
  const now = Date.now();
  
  if (document.hidden) {
    console.log('Tab became hidden - user switched away');
    trackingData.tabSwitches++;
    tabHiddenTime = now; // Record when tab became hidden
  } else {
    console.log('Tab became visible - user returned');
    
    // Calculate time away if we have a hidden timestamp
    if (tabHiddenTime) {
      const timeAway = (now - tabHiddenTime) / 1000; // Convert to seconds
      totalTabAwayTime += timeAway;
      trackingData.tabAwayTime = Math.round(totalTabAwayTime);
      
      console.log(`User was away for ${timeAway.toFixed(1)}s. Total away time: ${trackingData.tabAwayTime}s`);
      tabHiddenTime = null; // Reset
    }
    
    updateLastActivity();
  }
});

// Calculate idle time and reading time
function calculateTimes() {
  const now = Date.now();
  const timeSinceLastCheck = now - trackingData.lastIdleCheck;
  const timeSinceActivity = now - trackingData.lastActivity;
  
  // If user has been inactive for more than 5 minutes (300 seconds), accumulate idle time
  if (timeSinceActivity > 300000) { // 5 minutes = 300,000 milliseconds
    // Add the time since last check as idle time (but only if it was actually idle)
    const idleTimeToAdd = timeSinceLastCheck / 1000;
    trackingData.idleTime += idleTimeToAdd;
    console.log(`Adding ${idleTimeToAdd.toFixed(1)}s idle time. Total idle: ${trackingData.idleTime.toFixed(1)}s`);
  }
  
  // If tab is currently hidden, add current away time to total
  if (tabHiddenTime && document.hidden) {
    const currentAwayTime = (now - tabHiddenTime) / 1000;
    trackingData.tabAwayTime = Math.round(totalTabAwayTime + currentAwayTime);
  } else {
    trackingData.tabAwayTime = Math.round(totalTabAwayTime);
  }
  
  // Update the last idle check time
  trackingData.lastIdleCheck = now;
  
  // Calculate total reading time
  trackingData.readingTime = (now - trackingData.startTime) / 1000;
}

// Generate engagement log
function generateEngagementLog() {
  // Skip tracking for local files
  if (window.location.protocol === 'file:') {
    return null;
  }
  
  calculateTimes();
  
  return {
    session_id: trackingData.sessionId,
    url: trackingData.url,
    timestamp: new Date().toISOString(),
    content_type: detectContentType(),
    engagement: {
      scroll_depth: parseFloat(trackingData.scrollDepth.toFixed(3)),
      max_scroll_depth: parseFloat(trackingData.maxScrollDepth.toFixed(3)),
      idle_time: Math.round(trackingData.idleTime),
      reading_time: Math.round(trackingData.readingTime),
      total_scrolls: trackingData.totalScrolls,
      tab_switches: trackingData.tabSwitches,
      tab_away_time: trackingData.tabAwayTime
    }
  };
}

// Detect content type based on URL and page elements
function detectContentType() {
  // Skip tracking for local files (PDFs, etc.)
  if (window.location.protocol === 'file:') {
    return null; // Don't track local files
  }
  
  // Check for video elements
  if (document.querySelector('video')) {
    return 'video';
  }
  
  // Check URL patterns for video sites
  if (trackingData.url.includes('youtube.com') || 
      trackingData.url.includes('vimeo.com') ||
      trackingData.url.includes('video')) {
    return 'video';
  }
  
  // Check for common article/text patterns
  if (document.querySelector('article') || 
      document.querySelector('.content') || 
      document.querySelector('.post') ||
      document.querySelector('main')) {
    return 'article';
  }
  
  return 'webpage';
}

// Send data to backend (placeholder for now)
function sendDataToBackend(data) {
  console.log('📊 Engagement Data:', data);
  
  // TODO: Replace with your actual backend endpoint
  /*
  fetch('https://your-backend.com/api/engagement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  }).catch(error => console.error('Failed to send data:', error));
  */
}

// Main tracking loop - runs every 10 seconds
setInterval(() => {
  const engagementData = generateEngagementLog();
  
  // Only send data if we're not on a local file
  if (engagementData) {
    sendDataToBackend(engagementData);
  }
}, 10000); // Send data every 10 seconds

// Send final data when page is about to unload
window.addEventListener('beforeunload', () => {
  const finalData = generateEngagementLog();
  
  if (finalData) {
    console.log('📤 Final engagement data:', finalData);
    // Use sendBeacon for reliable data sending on page unload
    // navigator.sendBeacon('https://your-backend.com/api/engagement', JSON.stringify(finalData));
  }
});

console.log('✅ Engagement tracking active - data will be logged every 10 seconds');