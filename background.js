let facebookTabs = {};
let totalFacebookTime = 0;
let lastCheckTime = Date.now();
let timeLimitMinutes = 1; // Default time limit in minutes
let blockedUntil = 0; // Timestamp (ms) until which Facebook is blocked
let cooldownStarted = false; // Flag to prevent multiple cooldown starts
const PERIODIC_CHECK_INTERVAL = 5 * 1000; // 5 seconds for more accurate tracking
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown

// Daily open-limit controls (hardcoded)
let dailyOpensLimit = 10; // hardcoded opens allowed per day
let dailyOpenCount = 0; // openings so far today
let dailyResetAt = 0; // timestamp at next midnight when count resets

// Function to get the current time limit in milliseconds
function getMaxTime() {
  return timeLimitMinutes * 60 * 1000;
}

function isBlockedNow() {
  return Date.now() < blockedUntil;
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
    closeAllFacebookTabs(true);
  }

  // Save current state to storage
  saveStateToStorage();
}

// Function to close all Facebook tabs
function closeAllFacebookTabs(startCooldown) {
  console.log(
    `Closing Facebook tabs after ${timeLimitMinutes} minute limit reached`
  );
  for (const tabId in facebookTabs) {
    // Check if tab still exists before trying to remove it
    chrome.tabs.get(parseInt(tabId), (tab) => {
      if (chrome.runtime.lastError) {
        console.log(`Tab ${tabId} no longer exists, skipping removal`);
      } else {
        chrome.tabs.remove(parseInt(tabId));
      }
    });
  }
  facebookTabs = {};
  totalFacebookTime = 0;
  lastCheckTime = Date.now();
  if (startCooldown && !isBlockedNow()) {
    blockedUntil = Date.now() + COOLDOWN_MS;
    cooldownStarted = true;
    showBlockedNotification();
  }
  saveStateToStorage();
}

function showBlockedNotification() {
  if (!chrome.notifications) return;
  const minutes = Math.ceil((blockedUntil - Date.now()) / 60000);
  chrome.notifications.create("fbBlocked", {
    type: "basic",
    iconUrl: "icon1.png",
    title: "Facebook blocked",
    message: `You can't access Facebook for the next ${minutes} minute${minutes !== 1 ? "s" : ""
      }.`,
  });
}

// Function to save current state to storage
function saveStateToStorage() {
  chrome.storage.local.set({
    facebookTabs: facebookTabs,
    totalFacebookTime: totalFacebookTime,
    timeLimit: timeLimitMinutes,
    blockedUntil: blockedUntil,
    cooldownStarted: cooldownStarted,
    // Persist the hardcoded limit for popup display, though it's enforced here
    dailyOpensLimit: 10,
    dailyOpenCount: dailyOpenCount,
    dailyResetAt: dailyResetAt,
  });
}

// Function to load state from storage
function loadStateFromStorage(callback) {
  chrome.storage.local.get(
    [
      "facebookTabs",
      "totalFacebookTime",
      "timeLimit",
      "blockedUntil",
      "cooldownStarted",
      "dailyOpensLimit",
      "dailyOpenCount",
      "dailyResetAt",
    ],
    function (data) {
      if (data.facebookTabs) {
        facebookTabs = data.facebookTabs;
      }
      if (typeof data.totalFacebookTime === "number") {
        totalFacebookTime = data.totalFacebookTime;
      }
      if (typeof data.timeLimit === "number" && !isNaN(data.timeLimit)) {
        timeLimitMinutes = data.timeLimit;
      } else {
        timeLimitMinutes = 1;
      }
      if (typeof data.blockedUntil === "number") {
        blockedUntil = data.blockedUntil;
      }
      if (typeof data.cooldownStarted === "boolean") {
        cooldownStarted = data.cooldownStarted;
      }
      // Ignore stored value to enforce hardcoded limit
      dailyOpensLimit = 10;
      if (typeof data.dailyOpenCount === "number") {
        dailyOpenCount = data.dailyOpenCount;
      }
      if (typeof data.dailyResetAt === "number") {
        dailyResetAt = data.dailyResetAt;
      }
      ensureDailyResetSchedule();
      lastCheckTime = Date.now();
      if (typeof callback === "function") callback();
    }
  );
}

// // Function to reset timer
// function resetTimer() {
//   totalFacebookTime = 0;
//   lastCheckTime = Date.now();
//   saveStateToStorage();
// }

// Start cooldown when session ends (no FB tabs remain)
function maybeStartCooldownWhenNoTabs() {
  // Only start cooldown if we're not already in one AND we had Facebook tabs before AND cooldown not already started
  // Only start cooldown if we're not already in one AND we had Facebook tabs before AND cooldown not already started
  if (
    Object.keys(facebookTabs).length === 0 &&
    !isBlockedNow() &&
    totalFacebookTime > 0 &&
    !cooldownStarted
  ) {
    blockedUntil = Date.now() + COOLDOWN_MS;
    cooldownStarted = true;
    showBlockedNotification();
    saveStateToStorage();
    console.log(
      "Starting 1-hour cooldown. Blocked until:",
      new Date(blockedUntil).toLocaleString()
    );
  }
}

// Function to check if cooldown has expired and clear it if needed
function checkAndClearExpiredCooldown() {
  if (blockedUntil > 0 && Date.now() >= blockedUntil) {
    console.log("Cooldown expired. Facebook access restored.");
    blockedUntil = 0;
    cooldownStarted = false;
    // Clear accumulated session time so cooldown doesn't immediately retrigger
    totalFacebookTime = 0;
    lastCheckTime = Date.now();
    saveStateToStorage();
  }
}

// Utilities for daily open limit
function getNextMidnightTimestamp() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime();
}

function ensureDailyResetSchedule() {
  if (!dailyResetAt || Date.now() >= dailyResetAt) {
    dailyResetAt = getNextMidnightTimestamp();
    // If the day rolled over, reset the daily count
    if (Date.now() >= dailyResetAt) {
      dailyOpenCount = 0;
    }
  }
}

function checkAndResetDailyCounter() {
  if (Date.now() >= dailyResetAt) {
    dailyOpenCount = 0;
    dailyResetAt = getNextMidnightTimestamp();
    // If previously blocked only due to daily-limit until midnight, clear here
    if (!cooldownStarted && Date.now() >= blockedUntil) {
      blockedUntil = 0;
    }
    saveStateToStorage();
    console.log("Daily Facebook open counter reset for new day.");
  }
}

function maybeCountNewOpenAndEnforceLimit() {
  // Count only when transitioning from 0 -> 1 FB tabs
  dailyOpenCount += 1;
  console.log(`Daily Facebook opens: ${dailyOpenCount}/${dailyOpensLimit}`);
  if (dailyOpenCount > dailyOpensLimit) {
    // Block until midnight
    const untilMidnight = Math.max(blockedUntil, dailyResetAt);
    if (untilMidnight > blockedUntil) {
      blockedUntil = untilMidnight;
      showBlockedNotification();
    }
    saveStateToStorage();
    return true; // exceeded
  }
  saveStateToStorage();
  return false; // within limit
}

// Function to scan all existing tabs for Facebook tabs
function scanExistingTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
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
  console.log("Received message:", request);

  if (request.action === "setTimeLimit") {
    const newTimeLimit = request.minutes;
    timeLimitMinutes = newTimeLimit;
    // Persist the new time limit immediately so it survives restarts
    chrome.storage.local.set({ timeLimit: timeLimitMinutes }, function () {
      console.log(
        `Time limit updated to ${newTimeLimit} minutes and saved to storage`
      );
      sendResponse({ success: true });
    });
  }

  if (request.action === "setDailyOpensLimit") {
    // Ignore attempts to change; keep hardcoded 10
    console.log("Ignoring setDailyOpensLimit; limit is hardcoded to 10");
    chrome.storage.local.set({ dailyOpensLimit: 10 }, function () {
      sendResponse({ success: true });
    });
  }

  // if (request.action === 'resetTimer') {
  //   resetTimer();
  //   console.log('Timer reset manually');
  //   sendResponse({ success: true });
  // }

  if (request.action === "getTimerInfo") {
    const response = {
      totalTime: totalFacebookTime,
      timeLimit: timeLimitMinutes,
      facebookTabs: facebookTabs,
      blockedUntil: blockedUntil,
      isBlocked: isBlockedNow(),
      dailyOpensLimit: dailyOpensLimit,
      dailyOpenCount: dailyOpenCount,
      dailyResetAt: dailyResetAt,
    };
    console.log("Sending timer info:", response);
    sendResponse(response);
  }

  return true; // Keep message channel open for async response
});

// Initialize: load state and then scan existing tabs when extension starts (avoid race)
loadStateFromStorage(scanExistingTabs);

// Periodic check to update time even if no events occur
chrome.alarms.create("periodicCheck", {
  periodInMinutes: PERIODIC_CHECK_INTERVAL / 60000,
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "periodicCheck") {
    updateTotalFacebookTime(Date.now());
    // Check if cooldown has expired
    checkAndClearExpiredCooldown();
    // Check if we crossed midnight and need to reset counters
    checkAndResetDailyCounter();
  }
});

// Event listeners for tab updates and closures
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const currentTime = Date.now();
  updateTotalFacebookTime(currentTime);

  // If blocked, prevent Facebook loads
  if (isBlockedNow() && isFacebookUrl(tab.url)) {
    console.log("Blocking Facebook during cooldown. Closing tab", tabId);
    // Check if tab still exists before trying to remove it
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.log(`Tab ${tabId} no longer exists, skipping removal`);
      } else {
        chrome.tabs.remove(tabId);
      }
    });
    return;
  }

  if (isFacebookUrl(tab.url)) {
    const hadNoFbBefore = Object.keys(facebookTabs).length === 0;
    facebookTabs[tabId] = true;
    console.log("Facebook tab detected:", tabId);
    if (hadNoFbBefore) {
      ensureDailyResetSchedule();
      const exceeded = maybeCountNewOpenAndEnforceLimit();
      if (exceeded) {
        console.log("Daily open limit exceeded. Closing tab", tabId);
        chrome.tabs.get(tabId, (t) => {
          if (chrome.runtime.lastError) {
            console.log(`Tab ${tabId} no longer exists, skipping removal`);
          } else {
            chrome.tabs.remove(tabId);
          }
        });
      }
    }
  } else {
    delete facebookTabs[tabId];
    // If we just went down to zero FB tabs, start cooldown
    maybeStartCooldownWhenNoTabs();
  }

  // Only reset timer if no Facebook tabs are open AND we're not in the middle of closing tabs
  // if (Object.keys(facebookTabs).length === 0 && totalFacebookTime < getMaxTime()) {
  //   resetTimer();
  // }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const currentTime = Date.now();
  updateTotalFacebookTime(currentTime);
  delete facebookTabs[tabId];

  // If we just went down to zero FB tabs, start cooldown
  maybeStartCooldownWhenNoTabs();

  // Only reset timer if no Facebook tabs are open AND we're not in the middle of closing tabs
  // if (Object.keys(facebookTabs).length === 0 && totalFacebookTime < getMaxTime()) {
  //   resetTimer();
  // }
});

// Track tab activation to ensure timer updates when switching tabs
chrome.tabs.onActivated.addListener((activeInfo) => {
  const currentTime = Date.now();
  updateTotalFacebookTime(currentTime);
});

// Handle extension startup and wake events
chrome.runtime.onStartup.addListener(() => {
  loadStateFromStorage(scanExistingTabs);
});

chrome.runtime.onInstalled.addListener(() => {
  loadStateFromStorage(scanExistingTabs);
});
