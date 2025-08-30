// Popup script for Facebook Time Tracker
document.addEventListener('DOMContentLoaded', function () {
    const timeLimitInput = document.getElementById('timeLimit');
    const submitBtn = document.getElementById('submitBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusDiv = document.getElementById('status');
    const timerDisplay = document.getElementById('timerDisplay');
    const errorDiv = document.getElementById('error');

    let updateTimerInterval;

    // Load current settings when popup opens
    loadCurrentSettings();
    startTimerUpdate();

    // Handle form submission
    submitBtn.addEventListener('click', function () {
        const minutes = parseInt(timeLimitInput.value);
        console.log('Submit clicked with minutes:', minutes);

        // Validate input
        if (!minutes || minutes < 1 || minutes > 1440) {
            showError('Please enter a valid number between 1 and 1440 minutes');
            return;
        }

        // Clear any previous errors
        clearError();

        // Disable button to prevent multiple clicks
        submitBtn.disabled = true;
        submitBtn.textContent = 'Setting...';

        // Send message to background script to update time limit
        chrome.runtime.sendMessage({
            action: 'setTimeLimit',
            minutes: minutes
        }, function (response) {
            console.log('Received response:', response);
            if (response && response.success) {
                statusDiv.textContent = `Time limit set to ${minutes} minute${minutes > 1 ? 's' : ''}`;
                statusDiv.style.background = 'rgba(76, 175, 80, 0.3)';

                // Re-enable button
                submitBtn.disabled = false;
                submitBtn.textContent = 'Set Time Limit';

                // Show success message for 2 seconds
                setTimeout(() => {
                    statusDiv.textContent = 'Settings saved successfully!';
                }, 2000);
            } else {
                showError('Failed to set time limit. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Set Time Limit';
            }
        });
    });

    // Handle reset button
    resetBtn.addEventListener('click', function () {
        console.log('Reset button clicked');

        chrome.runtime.sendMessage({
            action: 'resetTimer'
        }, function (response) {
            console.log('Reset response:', response);
            if (response && response.success) {
                statusDiv.textContent = 'Timer reset successfully!';
                statusDiv.style.background = 'rgba(76, 175, 80, 0.3)';

                setTimeout(() => {
                    statusDiv.textContent = 'Timer reset to 0';
                }, 2000);
            } else {
                showError('Failed to reset timer. Please try again.');
            }
        });
    });

    // Handle Enter key in input field
    timeLimitInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            submitBtn.click();
        }
    });

    // Load current settings from storage
    function loadCurrentSettings() {
        chrome.storage.local.get(['timeLimit', 'totalFacebookTime', 'facebookTabs'], function (data) {
            const currentLimit = data.timeLimit || 1;
            timeLimitInput.value = currentLimit;

            // Update status based on current state
            updateStatus(data.facebookTabs, data.totalFacebookTime, currentLimit);
        });
    }

    // Update status display
    function updateStatus(facebookTabs, totalTime, timeLimit) {
        if (!facebookTabs || Object.keys(facebookTabs).length === 0) {
            statusDiv.textContent = 'No Facebook tabs currently open';
            statusDiv.style.background = 'rgba(255, 255, 255, 0.15)';
        } else {
            const tabCount = Object.keys(facebookTabs).length;
            statusDiv.textContent = `${tabCount} Facebook tab${tabCount > 1 ? 's' : ''} open`;
            statusDiv.style.background = 'rgba(255, 193, 7, 0.3)';
        }
    }

    // Start timer update interval
    function startTimerUpdate() {
        // Get initial timer info
        chrome.runtime.sendMessage({ action: 'getTimerInfo' }, function (response) {
            console.log('Initial timer info:', response);
            if (response) {
                updateTimerDisplay(response.totalTime, response.timeLimit);
                updateStatus(response.facebookTabs, response.totalTime, response.timeLimit);
            }
        });

        // Update timer every second
        updateTimerInterval = setInterval(() => {
            chrome.runtime.sendMessage({ action: 'getTimerInfo' }, function (response) {
                if (response) {
                    updateTimerDisplay(response.totalTime, response.timeLimit);
                    updateStatus(response.facebookTabs, response.totalTime, response.timeLimit);
                }
            });
        }, 1000);
    }

    // Update timer display
    function updateTimerDisplay(totalTime, timeLimit) {
        const remainingTime = Math.max(0, (timeLimit * 60 * 1000) - totalTime);
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);

        timerDisplay.textContent = `Time remaining: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Change color based on remaining time
        if (remainingTime < 30000) { // Less than 30 seconds
            timerDisplay.style.background = 'rgba(255, 107, 107, 0.3)';
        } else if (remainingTime < 60000) { // Less than 1 minute
            timerDisplay.style.background = 'rgba(255, 193, 7, 0.3)';
        } else {
            timerDisplay.style.background = 'rgba(255, 255, 255, 0.1)';
        }
    }

    // Show error message
    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    // Clear error message
    function clearError() {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }

    // Clean up interval when popup closes
    window.addEventListener('beforeunload', function () {
        if (updateTimerInterval) {
            clearInterval(updateTimerInterval);
        }
    });
});
