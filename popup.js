// Popup script for Facebook Time Tracker
document.addEventListener("DOMContentLoaded", function () {
  const timeLimitInput = document.getElementById("timeLimit");
  const submitBtn = document.getElementById("submitBtn");
  // const resetBtn = document.getElementById('resetBtn');
  const statusDiv = document.getElementById("status");
  const timerDisplay = document.getElementById("timerDisplay");
  const cooldownDisplay = document.getElementById("cooldownDisplay");
  const opensRemainingDisplay = document.getElementById("opensRemainingDisplay");
  const errorDiv = document.getElementById("error");
  // Daily opens UI removed; limit is hardcoded to 10 in background

  let updateTimerInterval;

  // Load current settings when popup opens
  loadCurrentSettings();
  startTimerUpdate();

  // Handle form submission
  submitBtn.addEventListener("click", function () {
    const minutes = parseInt(timeLimitInput.value);

    // Validate input
    if (!minutes || minutes < 1 || minutes > 1440) {
      showError("Please enter a valid number between 1 and 1440 minutes");
      return;
    }

    // Clear any previous errors
    clearError();

    // Disable button to prevent multiple clicks
    submitBtn.disabled = true;
    submitBtn.textContent = "Setting...";

    // Store the new time limit in chrome.storage.local for persistence
    chrome.storage.local.set({ timeLimit: minutes }, function () {
      // Send message to background script to update time limit
      chrome.runtime.sendMessage(
        {
          action: "setTimeLimit",
          minutes: minutes,
        },
        function (response) {
          if (response && response.success) {
            statusDiv.textContent = `Time limit set to ${minutes} minute${minutes > 1 ? "s" : ""
              }`;
            statusDiv.style.background = "rgba(76, 175, 80, 0.3)";

            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = "Set Time Limit";
          } else {
            showError("Failed to set time limit. Please try again.");
            submitBtn.disabled = false;
            submitBtn.textContent = "Set Time Limit";
          }
        }
      );
    });
  });

  // No-op: daily limit is fixed; input removed


  // Handle Enter key in input field
  timeLimitInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      submitBtn.click();
    }
  });

  // Load current settings from storage
  function loadCurrentSettings() {
    chrome.storage.local.get(
      [
        "timeLimit",
        "totalFacebookTime",
        "facebookTabs",
        "blockedUntil",
        "dailyOpensLimit",
        "dailyOpenCount",
        "dailyResetAt",
      ],
      function (data) {
        let currentLimit = 1;
        if (typeof data.timeLimit === "number" && !isNaN(data.timeLimit)) {
          currentLimit = data.timeLimit;
        }
        timeLimitInput.value = currentLimit;

        // Daily limit is fixed; just rely on background-provided number

        // Update status based on current state
        updateStatus(data.facebookTabs, data.totalFacebookTime, currentLimit);
        updateCooldownDisplay(data.blockedUntil);
      }
    );
  }

  // Update status display
  function updateStatus(facebookTabs, totalTime, timeLimit) {
    if (!facebookTabs || Object.keys(facebookTabs).length === 0) {
      statusDiv.textContent = "No Facebook tabs currently open";
      statusDiv.style.background = "rgba(255, 255, 255, 0.15)";
    } else {
      const tabCount = Object.keys(facebookTabs).length;
      statusDiv.textContent = `${tabCount} Facebook tab${tabCount > 1 ? "s" : ""
        } open`;
      statusDiv.style.background = "rgba(255, 193, 7, 0.3)";
    }
  }

  function updateCooldownDisplay(blockedUntil) {
    if (!blockedUntil) {
      cooldownDisplay.textContent = "";
      cooldownDisplay.classList.remove("active");
      return;
    }
    const now = Date.now();
    if (now >= blockedUntil) {
      cooldownDisplay.textContent = "";
      cooldownDisplay.classList.remove("active");
      return;
    }
    const remainingMs = blockedUntil - now;
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    cooldownDisplay.textContent = `Facebook Blocked: ${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")} remaining`;
    cooldownDisplay.classList.add("active");
  }

  function updateOpensRemainingDisplay(dailyOpensLimit, dailyOpenCount, dailyResetAt) {
    if (!dailyOpensLimit || dailyOpensLimit <= 0) {
      opensRemainingDisplay.textContent = "";
      opensRemainingDisplay.classList.remove("active");
      return;
    }
    // If past reset, show full limit remaining
    const now = Date.now();
    const remainingOpens = Math.max(0, dailyOpensLimit - (dailyOpenCount || 0));
    let resetIn = "";
    if (dailyResetAt && now < dailyResetAt) {
      const remainingMs = dailyResetAt - now;
      const hr = Math.floor(remainingMs / 3600000);
      const min = Math.floor((remainingMs % 3600000) / 60000);
      resetIn = ` (resets in ${hr.toString().padStart(2, "0")}:${min
        .toString()
        .padStart(2, "0")})`;
    }

    opensRemainingDisplay.textContent = `${remainingOpens} open${remainingOpens === 1 ? "" : "s"} remaining${resetIn}`;
    opensRemainingDisplay.classList.add("active");
  }

  // Start timer update interval
  function startTimerUpdate() {
    // Get initial timer info
    chrome.runtime.sendMessage({ action: "getTimerInfo" }, function (response) {
      if (response) {
        updateTimerDisplay(
          response.totalTime,
          response.timeLimit,
          response.facebookTabs,
          response.isBlocked
        );
        updateStatus(
          response.facebookTabs,
          response.totalTime,
          response.timeLimit
        );
        updateCooldownDisplay(response.blockedUntil);
        updateOpensRemainingDisplay(
          10,
          response.dailyOpenCount,
          response.dailyResetAt
        );
      }
    });

    // Update timer every second
    updateTimerInterval = setInterval(() => {
      chrome.runtime.sendMessage(
        { action: "getTimerInfo" },
        function (response) {
          if (response) {
            updateTimerDisplay(
              response.totalTime,
              response.timeLimit,
              response.facebookTabs,
              response.isBlocked
            );
            updateStatus(
              response.facebookTabs,
              response.totalTime,
              response.timeLimit
            );
            updateCooldownDisplay(response.blockedUntil);
            updateOpensRemainingDisplay(
              10,
              response.dailyOpenCount,
              response.dailyResetAt
            );
          }
        }
      );
    }, 1000);
  }

  // Update timer display
  function updateTimerDisplay(totalTime, timeLimit, facebookTabs, isBlocked) {
    // Hide timer when not actively browsing Facebook or when blocked
    const hasActiveFbTabs = facebookTabs && Object.keys(facebookTabs).length > 0;
    if (!hasActiveFbTabs || isBlocked) {
      timerDisplay.textContent = "";
      timerDisplay.style.display = "none";
      return;
    }

    // Ensure it's visible when actively browsing
    timerDisplay.style.display = "block";
    const remainingTime = Math.max(0, timeLimit * 60 * 1000 - totalTime);
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);

    timerDisplay.textContent = `Time remaining: ${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    // Change color based on remaining time
    if (remainingTime < 30000) {
      // Less than 30 seconds
      timerDisplay.style.background = "rgba(255, 107, 107, 0.3)";
    } else if (remainingTime < 60000) {
      // Less than 1 minute
      timerDisplay.style.background = "rgba(255, 193, 7, 0.3)";
    } else {
      timerDisplay.style.background = "rgba(255, 255, 255, 0.1)";
    }
  }

  // Show error message
  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  }

  // Clear error message
  function clearError() {
    errorDiv.textContent = "";
    errorDiv.style.display = "none";
  }

  // Clean up interval when popup closes
  window.addEventListener("beforeunload", function () {
    if (updateTimerInterval) {
      clearInterval(updateTimerInterval);
    }
  });
});
