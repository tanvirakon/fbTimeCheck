let facebookTabs = {};
let totalFacebookTime = 0;
let lastCheckTime = Date.now();
const MAX_TIME = 3 * 60 * 1000; // 3 minutes

function updateTotalFacebookTime(currentTime) {
  if (Object.keys(facebookTabs).length > 0) {
    totalFacebookTime += currentTime - lastCheckTime;
  }
  lastCheckTime = currentTime;

  // Check if the time limit has been reached
  if (totalFacebookTime > MAX_TIME) {
    for (const tabId in facebookTabs) {
      chrome.tabs.remove(parseInt(tabId));
    }
    facebookTabs = {};
    totalFacebookTime = 0;
  }
}

// Listen for tab updates
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

// Listen for tab removals
chrome.tabs.onRemoved.addListener((tabId) => {
  const currentTime = Date.now();
  updateTotalFacebookTime(currentTime);
  delete facebookTabs[tabId];

  // Reset timer if no Facebook tabs are open
  if (Object.keys(facebookTabs).length === 0) {
    totalFacebookTime = 0;
  }
});
