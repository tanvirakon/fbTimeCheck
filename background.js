let facebookTabs = {};
let totalFacebookTime = 0;
let lastCheckTime = Date.now();
let timeLimitMinutes = 1; // Default time limit in minutes
const PERIODIC_CHECK_INTERVAL = 5 * 1000; // 5 seconds for more accurate tracking

// Function to get the current time limit in milliseconds
function getMaxTime() {
  return timeLimitMinutes * 60 * 1000;
}

// Function to check if a URL is a Facebook URL
function isFacebookUrl(url) {
  return url && (url.includes("facebook.com") || url.includes("fb.com"));
}

// Function to update the total time spent on Facebook
function updateTotalFacebookTime(currentTime) {
  if (Object.keys(facebookTabs).length > 0) {
    totalFacebookTime += currentTime - lastCheckTime;
  }
  lastCheckTime = currentTime;

  // Check if the time limit has been reached
  if (totalFacebookTime >= getMaxTime()) {
    closeAllFacebookTabs();
  }

  // Save current state to storage
  saveStateToStorage();
}

// Function to close all Facebook tabs
function closeAllFacebookTabs() {
  console.log(`Closing Facebook tabs after ${timeLimitMinutes} minute limit reached`);
  for (const tabId in facebookTabs) {
    chrome.tabs.remove(parseInt(tabId));
  }
  facebookTabs = {};
  totalFacebookTime = 0;
  lastCheckTime = Date.now();
  saveStateToStorage();
}

// Function to save current state to storage
function saveStateToStorage() {
  chrome.storage.local.set({
    facebookTabs: facebookTabs,
    totalFacebookTime: totalFacebookTime,
    timeLimit: timeLimitMinutes
  });
}

// Function to load state from storage
function loadStateFromStorage() {
  chrome.storage.local.get(['facebookTabs', 'totalFacebookTime', 'timeLimit'], function (data) {
    if (data.facebookTabs) {
      facebookTabs = data.facebookTabs;
    }
    if (data.totalFacebookTime) {
      totalFacebookTime = data.totalFacebookTime;
    }
    if (data.timeLimit) {
      timeLimitMinutes = data.timeLimit;
    }
    lastCheckTime = Date.now();
  });
}

// Function to reset timer
function resetTimer() {
  totalFacebookTime = 0;
  lastCheckTime = Date.now();
  saveStateToStorage();
}

// Function to scan all existing tabs for Facebook tabs
function scanExistingTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (isFacebookUrl(tab.url)) {
        facebookTabs[tab.id] = true;
      }
    });
    console.log("Found Facebook tabs:", Object.keys(facebookTabs));
    saveStateToStorage();
  });
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);

  if (request.action === 'setTimeLimit') {
    const newTimeLimit = request.minutes;
    timeLimitMinutes = newTimeLimit;

    // Reset timer when time limit is changed
    resetTimer();

    console.log(`Time limit updated to ${newTimeLimit} minutes`);
    sendResponse({ success: true });
  }

  if (request.action === 'resetTimer') {
    resetTimer();
    console.log('Timer reset manually');
    sendResponse({ success: true });
  }

  if (request.action === 'getTimerInfo') {
    const response = {
      totalTime: totalFacebookTime,
      timeLimit: timeLimitMinutes,
      facebookTabs: facebookTabs
    };
    console.log('Sending timer info:', response);
    sendResponse(response);
  }

  return true; // Keep message channel open for async response
});

// Initialize: load state and scan existing tabs when extension starts
loadStateFromStorage();
scanExistingTabs();

// Periodic check to update time even if no events occur
chrome.alarms.create("periodicCheck", {
  periodInMinutes: PERIODIC_CHECK_INTERVAL / 60000,
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "periodicCheck") {
    updateTotalFacebookTime(Date.now());
  }
});

// Event listeners for tab updates and closures
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const currentTime = Date.now();
  updateTotalFacebookTime(currentTime);

  if (isFacebookUrl(tab.url)) {
    facebookTabs[tabId] = true;
    console.log("Facebook tab detected:", tabId);
  } else {
    delete facebookTabs[tabId];
  }

  // Only reset timer if no Facebook tabs are open AND we're not in the middle of closing tabs
  if (Object.keys(facebookTabs).length === 0 && totalFacebookTime < getMaxTime()) {
    resetTimer();
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const currentTime = Date.now();
  updateTotalFacebookTime(currentTime);
  delete facebookTabs[tabId];

  // Only reset timer if no Facebook tabs are open AND we're not in the middle of closing tabs
  if (Object.keys(facebookTabs).length === 0 && totalFacebookTime < getMaxTime()) {
    resetTimer();
  }
});

// Track tab activation to ensure timer updates when switching tabs
chrome.tabs.onActivated.addListener((activeInfo) => {
  const currentTime = Date.now();
  updateTotalFacebookTime(currentTime);
});

// Handle extension startup and wake events
chrome.runtime.onStartup.addListener(() => {
  loadStateFromStorage();
  scanExistingTabs();
});

chrome.runtime.onInstalled.addListener(() => {
  loadStateFromStorage();
  scanExistingTabs();
});
