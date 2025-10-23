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
  tabAwayTime: 0,
  videoWatchedPercentage: 0,
  videoDuration: 0,
  videoCurrentTime: 0,
  isVideoPlaying: false, // Track if video is currently playing
  pauseCount: 0, // Track how many times video was paused
  seekCount: 0, // Track how many times user seeked in video
  seekPositions: [] // Array of percentages where user seeked to
};

// Scroll session tracking
let scrollTimeout = null;
let isCurrentlyScrolling = false;
let lastScrollTime = 0;

// Tab away tracking
let tabHiddenTime = null;
let totalTabAwayTime = 0;
let tabAwayStartTime = null; // For idle time calculation

// Video tracking
let trackedVideos = new Set();
let primaryVideo = null;

console.log('Session started:', trackingData.sessionId);

// Video tracking functions - SINGLE DEFINITION
function setupVideoTracking(video) {
  if (trackedVideos.has(video)) return; // Already tracking this video
  
  trackedVideos.add(video);
  
  // Set this as primary video if it's the largest or first one
  if (!primaryVideo || (video.videoWidth * video.videoHeight > primaryVideo.videoWidth * primaryVideo.videoHeight)) {
    primaryVideo = video;
    console.log(' Primary video set:', video.src || video.currentSrc || 'embedded video');
    console.log(' Video dimensions:', video.videoWidth, 'x', video.videoHeight);
  }
  
  // Enhanced timeupdate tracking
  video.addEventListener('timeupdate', () => {
    if (video === primaryVideo && video.duration) {
      trackingData.videoCurrentTime = video.currentTime;
      trackingData.videoDuration = video.duration;
      trackingData.videoWatchedPercentage = Math.min((video.currentTime / video.duration) * 100, 100);
      
      // Log progress every 10% for debugging (prevent spam)
      const percentage = trackingData.videoWatchedPercentage;
      const roundedPercentage = Math.floor(percentage / 10) * 10;
      const prevRoundedPercentage = Math.floor((percentage - 1) / 10) * 10;
      
      if (roundedPercentage > prevRoundedPercentage && roundedPercentage > 0) {
        console.log(` Video progress: ${roundedPercentage}%`);
      }
      
      updateLastActivity();
    }
  });
  
  // Track when video metadata loads
  video.addEventListener('loadedmetadata', () => {
    if (video === primaryVideo) {
      console.log(' Video metadata loaded - Duration:', video.duration, 'seconds');
      trackingData.videoDuration = video.duration;
    }
  });
  
  // Track video events
  video.addEventListener('play', () => {
    if (video === primaryVideo) {
      console.log(' Video started playing');
      trackingData.isVideoPlaying = true;
      updateLastActivity();
    }
  });
  
  video.addEventListener('pause', () => {
    if (video === primaryVideo) {
      trackingData.pauseCount++; // Increment pause counter
      console.log(` Video paused at: ${video.currentTime.toFixed(1)}s (pause #${trackingData.pauseCount})`);
      trackingData.isVideoPlaying = false;
      updateLastActivity();
    }
  });
  
  video.addEventListener('seeked', () => {
    if (video === primaryVideo && video.duration) {
      trackingData.seekCount++; // Increment seek counter
      const seekPercentage = (video.currentTime / video.duration) * 100;
      trackingData.seekPositions.push(parseFloat(seekPercentage.toFixed(1))); // Store seek position as percentage
      console.log(` Video seeked to: ${video.currentTime.toFixed(1)}s (${seekPercentage.toFixed(1)}%) - seek #${trackingData.seekCount}`);
      updateLastActivity();
    }
  });
  
  video.addEventListener('ended', () => {
    if (video === primaryVideo) {
      console.log(' Video ended');
      trackingData.videoWatchedPercentage = 100;
      trackingData.isVideoPlaying = false;
      updateLastActivity();
    }
  });
}

// Enhanced YouTube API tracking - SINGLE DEFINITION
function setupYouTubeAPITracking(player) {
  console.log(' Setting up YouTube API tracking');
  
  try {
    const updateYouTubeProgress = () => {
      try {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        const playerState = player.getPlayerState();
        
        // Update playing state based on YouTube player state
        trackingData.isVideoPlaying = (playerState === 1); // 1 = playing
        
        if (duration > 0) {
          trackingData.videoCurrentTime = currentTime;
          trackingData.videoDuration = duration;
          trackingData.videoWatchedPercentage = Math.min((currentTime / duration) * 100, 100);
          
          // Less frequent logging to prevent spam
          const roundedPercentage = Math.floor(trackingData.videoWatchedPercentage / 10) * 10;
          if (roundedPercentage > 0 && roundedPercentage % 20 === 0) { // Log every 20%
            console.log(` YouTube: ${roundedPercentage}%`);
          }
        }
      } catch (e) {
        // Fallback to HTML5 video if API fails
      }
    };
    
    // Update progress every 2 seconds (less frequent)
    setInterval(updateYouTubeProgress, 2000);
    
  } catch (e) {
    console.log(' YouTube API setup failed:', e.message);
  }
}

// Find and track videos on the page - SINGLE DEFINITION
function findAndTrackVideos() {
  // Find all video elements
  const videos = document.querySelectorAll('video');
  
  videos.forEach(video => {
    setupVideoTracking(video);
  });
  
  // Enhanced YouTube detection
  if (window.location.href.includes('youtube.com/watch')) {
    // Only log once per page load
    if (trackedVideos.size === 0) {
      console.log(' YouTube page detected - searching for video player');
    }
    
    // Multiple selectors for YouTube video element
    const ytSelectors = [
      'video.html5-main-video',
      'video.video-stream',
      '#movie_player video',
      '.html5-video-player video',
      'video[src*="youtube"]',
      'video'
    ];
    
    let ytVideo = null;
    for (const selector of ytSelectors) {
      ytVideo = document.querySelector(selector);
      if (ytVideo) {
        if (trackedVideos.size === 0) { // Only log once
          console.log(` YouTube video found with selector: ${selector}`);
        }
        break;
      }
    }
    
    if (ytVideo) {
      setupVideoTracking(ytVideo);
      
      // YouTube API integration if available
      if (window.YT && window.YT.Player && trackedVideos.size <= 1) {
        console.log(' YouTube API detected, trying enhanced tracking');
        try {
          // Try to get YouTube player instance
          const playerElement = document.querySelector('#movie_player');
          if (playerElement && playerElement.getPlayerState) {
            setupYouTubeAPITracking(playerElement);
          }
        } catch (e) {
          console.log(' YouTube API tracking failed, using HTML5 fallback');
        }
      }
    }
  }
  
  // Only log video count if it changed
  const currentVideoCount = videos.length;
  if (!findAndTrackVideos.lastVideoCount || findAndTrackVideos.lastVideoCount !== currentVideoCount) {
    console.log(` Found ${currentVideoCount} video(s) on page`);
    findAndTrackVideos.lastVideoCount = currentVideoCount;
  }
}

// Initialize video tracking
setTimeout(() => {
  findAndTrackVideos();
  
  // Re-scan for videos more frequently on YouTube
  const isYouTube = window.location.href.includes('youtube.com');
  const scanInterval = isYouTube ? 5000 : 10000; // Every 5s for YouTube, 10s for others (reduced frequency)
  
  setInterval(findAndTrackVideos, scanInterval);
}, 1000); // Wait 1 second for page to load

// YouTube-specific: Listen for navigation changes
if (window.location.href.includes('youtube.com')) {
  console.log(' YouTube detected - setting up navigation listeners');
  
  // YouTube uses History API for navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log(' YouTube navigation detected, rescanning for videos');
      
      // Reset video tracking data for new video
      trackingData.videoWatchedPercentage = 0;
      trackingData.videoDuration = 0;
      trackingData.videoCurrentTime = 0;
      trackingData.isVideoPlaying = false;
      trackingData.pauseCount = 0; // Reset pause counter for new video
      trackingData.seekCount = 0; // Reset seek counter for new video
      trackingData.seekPositions = []; // Reset seek positions array for new video
      primaryVideo = null;
      trackedVideos.clear();
      findAndTrackVideos.lastVideoCount = 0; // Reset counter
      
      // Rescan after short delay
      setTimeout(findAndTrackVideos, 2000);
    }
  }).observe(document, { subtree: true, childList: true });
}

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
    
    // Less frequent scroll logging
    if (Math.abs(newScrollDepth - (trackingData.lastLoggedScrollDepth || 0)) > 0.1) { // Log every 10% change
      console.log(` Scroll: ${(newScrollDepth * 100).toFixed(1)}%`);
      trackingData.lastLoggedScrollDepth = newScrollDepth;
    }
  }
  
  // Scroll session counting logic with adaptive timeout
  if (!isCurrentlyScrolling) {
    // Start of a new scroll session
    isCurrentlyScrolling = true;
    trackingData.totalScrolls++;
    console.log(` Scroll session #${trackingData.totalScrolls} started`);
  }
  
  // Clear existing timeout and set a new one
  clearTimeout(scrollTimeout);
  
  // Use longer timeout if scrolls are happening rapidly (likely arrow keys or held scroll)
  const timeSinceLastScroll = currentTime - lastScrollTime;
  const timeoutDuration = timeSinceLastScroll < 50 ? 500 : 150; // 500ms for rapid scrolls, 150ms for normal
  
  scrollTimeout = setTimeout(() => {
    // Scroll session ended
    isCurrentlyScrolling = false;
    console.log(` Scroll session #${trackingData.totalScrolls} ended`);
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
      console.log(` Found scrollable container: ${selector}`);
      container.addEventListener('scroll', trackScrollDepth, { passive: true });
    }
  });
}, 2000); // Wait 2 seconds for dynamic content to load

// Additional activity detection
document.addEventListener('mousedown', updateLastActivity);
document.addEventListener('keyup', updateLastActivity);
window.addEventListener('resize', updateLastActivity);

// Page visibility tracking (tab switching) - ENHANCED FOR IDLE TIME
document.addEventListener('visibilitychange', () => {
  const now = Date.now();
  
  if (document.hidden) {
    console.log('Tab became hidden - user switched away');
    trackingData.tabSwitches++;
    tabHiddenTime = now; // Record when tab became hidden
    tabAwayStartTime = now; // Start counting idle time from tab switch
  } else {
    console.log('Tab became visible - user returned');
    
    // Calculate time away if we have a hidden timestamp
    if (tabHiddenTime) {
      const timeAway = (now - tabHiddenTime) / 1000; // Convert to seconds
      totalTabAwayTime += timeAway;
      trackingData.tabAwayTime = Math.round(totalTabAwayTime);
      
      // Add tab away time to idle time
      trackingData.idleTime += timeAway;
      
      console.log(`User was away for ${timeAway.toFixed(1)}s. Total away time: ${trackingData.tabAwayTime}s, Total idle: ${trackingData.idleTime.toFixed(1)}s`);
      
      tabHiddenTime = null; // Reset
      tabAwayStartTime = null; // Reset
    }
    
    updateLastActivity();
  }
});

// Calculate idle time and reading time - ENHANCED FOR VIDEO PLAYBACK
function calculateTimes() {
  const now = Date.now();
  const timeSinceLastCheck = now - trackingData.lastIdleCheck;
  const timeSinceActivity = now - trackingData.lastActivity;
  
  // Reduced idle threshold to 20 seconds (20,000 milliseconds)
  const IDLE_THRESHOLD = 240000; // 20 seconds
  
  // If user has been inactive for more than 20 seconds AND video is not playing, accumulate idle time
  if (timeSinceActivity > IDLE_THRESHOLD && !trackingData.isVideoPlaying) {
    // Add the time since last check as idle time (but only if it was actually idle)
    const idleTimeToAdd = Math.min(timeSinceLastCheck / 1000, timeSinceActivity / 1000);
    trackingData.idleTime += idleTimeToAdd;
    console.log(`Adding ${idleTimeToAdd.toFixed(1)}s idle time (video not playing). Total idle: ${trackingData.idleTime.toFixed(1)}s`);
  }
  
  // If tab is currently hidden, add current away time to total AND idle time
  if (tabHiddenTime && document.hidden) {
    const currentAwayTime = (now - tabHiddenTime) / 1000;
    trackingData.tabAwayTime = Math.round(totalTabAwayTime + currentAwayTime);
    
    // Add tab away time to idle time continuously
    const idleTimeFromTabAway = (now - tabAwayStartTime) / 1000;
    trackingData.idleTime = Math.round(trackingData.idleTime + (idleTimeFromTabAway - (trackingData.idleTimeFromTabAwayLastCheck || 0)));
    trackingData.idleTimeFromTabAwayLastCheck = idleTimeFromTabAway;
  } else {
    trackingData.tabAwayTime = Math.round(totalTabAwayTime);
    trackingData.idleTimeFromTabAwayLastCheck = 0;
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
      tab_away_time: trackingData.tabAwayTime,
      video_watched_percentage: parseFloat(trackingData.videoWatchedPercentage.toFixed(1)),
      video_duration: Math.round(trackingData.videoDuration),
      video_current_time: Math.round(trackingData.videoCurrentTime),
      is_video_playing: trackingData.isVideoPlaying,
      pause_count: trackingData.pauseCount,
      seek_count: trackingData.seekCount,
      seek_positions: trackingData.seekPositions
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
  fetch('http://127.0.0.1:8000/events/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => console.log(' Engagement sent:', result))
  .catch(error => console.error(' Failed to send data:', error));
}

// Main tracking loop - runs every 10 seconds
setInterval(() => {
  const engagementData = generateEngagementLog();
  
  // Only send data if we're not on a local file
  if (engagementData) {
    console.log('Engagement data (local log only):', engagementData);
  }
}, 10000); // Send data every 10 seconds

// Send final data when page is about to unload
window.addEventListener('beforeunload', () => {});

console.log(' Engagement tracking active - data will be logged every 10 seconds');


window.getFinalEngagementLog = () => generateEngagementLog();

window.resetTrackingData = () => {
  trackingData = {
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
    tabAwayTime: 0,
    videoWatchedPercentage: 0,
    videoDuration: 0,
    videoCurrentTime: 0,
    isVideoPlaying: false,
    pauseCount: 0,
    seekCount: 0,
    seekPositions: []
  };
  console.log('Tracking reset:', trackingData.sessionId);
};
