let facebookTabs = {};
let totalFacebookTime = 0;
let lastCheckTime = Date.now();
const MAX_TIME = 3 * 60 * 1000; // 3 minutes
const PERIODIC_CHECK_INTERVAL = 30 * 1000; // 30 seconds (adjust as needed)

// Function to update the total time spent on Facebook
function updateTotalFacebookTime(currentTime) {
  if (Object.keys(facebookTabs).length > 0) {
    totalFacebookTime += currentTime - lastCheckTime;
  }
  lastCheckTime = currentTime;

  // Check if the time limit has been reached
  if (totalFacebookTime > MAX_TIME) {
    for (const tabId in facebookTabs) {
      chrome.tabs.remove(parseInt(tabId)); // Close all Facebook tabs
    }
    facebookTabs = {};
    totalFacebookTime = 0;
  }
}

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

  if (tab.url && tab.url.includes("facebook.com")) {
    facebookTabs[tabId] = true;
  } else {
    delete facebookTabs[tabId];
  }

  // Reset timer if no Facebook tabs are open
  if (Object.keys(facebookTabs).length === 0) {
    totalFacebookTime = 0;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const currentTime = Date.now();
  updateTotalFacebookTime(currentTime);
  delete facebookTabs[tabId];

  // Reset timer if no Facebook tabs are open
  if (Object.keys(facebookTabs).length === 0) {
    totalFacebookTime = 0;
  }
});
