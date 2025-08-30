# Facebook Time Tracker Extension

A Chrome/Edge extension that helps you manage your time on Facebook by automatically closing Facebook tabs after a specified time limit.

## Features

- **Configurable Time Limit**: Set custom time limits (1-1440 minutes) through a beautiful popup interface
- **Real-time Timer Display**: See exactly how much time is remaining before tabs close
- **Smart Tab Detection**: Automatically detects Facebook tabs (facebook.com and fb.com)
- **Persistent Settings**: Your time limit preference is saved and restored
- **Visual Feedback**: Color-coded timer that changes based on remaining time
- **Instant Reset**: Timer resets to 0 when you change the time limit

## How to Use

1. **Install the Extension**: Load the extension in Chrome/Edge developer mode
2. **Click the Extension Icon**: Click on the Facebook Time Tracker icon in your browser toolbar
3. **Set Your Time Limit**: 
   - Enter the number of minutes you want to allow Facebook tabs to stay open
   - Click "Set Time Limit" or press Enter
   - The popup will close automatically after setting the limit
4. **Monitor Your Time**: The extension will show you how much time is remaining
5. **Automatic Closure**: When the time limit is reached, all Facebook tabs will close automatically

## Visual Indicators

- **Green Timer**: Plenty of time remaining
- **Yellow Timer**: Less than 1 minute remaining
- **Red Timer**: Less than 30 seconds remaining
- **Status Messages**: Shows current number of Facebook tabs open

## Technical Details

- **Permissions**: Requires tabs, alarms, and storage permissions
- **Storage**: Settings are saved locally in your browser
- **Compatibility**: Works with Chrome and Edge browsers
- **Performance**: Lightweight with minimal resource usage

## Installation

1. Download or clone this repository
2. Open Chrome/Edge and go to `chrome://extensions/` or `edge://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your toolbar

## Files

- `manifest.json`: Extension configuration
- `background.js`: Core logic for tab monitoring and time tracking
- `popup.html`: User interface for setting time limits
- `popup.js`: Popup interaction logic
- `icon1.png`: Extension icon
- `README.md`: This documentation

## Privacy

This extension:
- Only monitors Facebook-related tabs
- Stores all data locally on your device
- Does not send any data to external servers
- Does not track your browsing history outside of Facebook tabs
