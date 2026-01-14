# MuteMe Chrome Extension

Control your meeting mute status with the [MuteMe](https://muteme.com/) hardware button in Google Meet and Microsoft Teams.

## Features

- **Hardware mute control**: Tap or hold the MuteMe button to toggle your microphone
- **LED feedback**: MuteMe LED shows your mute state (red = muted, green = unmuted, cyan = idle)
- **Multiple touch modes**:
  - **Toggle**: Tap to mute/unmute
  - **Smart**: Tap to toggle, hold for push-to-talk when muted
  - **Push-to-Talk**: Hold to speak, release to mute
- **Extension icon badge**: Shows current mute state at a glance
- **Optional tab switching**: Automatically focus the meeting tab when pressing the button

## Supported Platforms

- Google Meet
- Microsoft Teams (web version)

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select this extension folder
5. Connect your MuteMe device via USB
6. Click the extension icon and click "Connect MuteMe" to grant permission

## Usage

1. Join a meeting in Google Meet or Microsoft Teams
2. Press the MuteMe button to toggle mute
3. Click the extension icon to:
   - See connection and call status
   - Change touch mode
   - Toggle mute from the popup

## How It Works

The extension uses the [WebHID API](https://developer.chrome.com/en/articles/hid/) to communicate directly with the MuteMe USB device. When you press the button, it sends keyboard shortcuts to the active meeting tab:
- Google Meet: `Ctrl+D`
- Microsoft Teams: `Ctrl+Shift+M`

## Known Limitations

### Mute Detection in Background Tabs

Chrome throttles JavaScript execution in background tabs and restricts DOM observation. This means:

- **When the meeting tab is focused**: Mute state detection works reliably
- **When the meeting tab is in the background**: Mute state may become stale or stop updating

**Workaround**: Enable "Switch to meeting tab on press" in the extension popup. This focuses the meeting tab when you press the button, ensuring reliable mute state detection.

This is a browser limitation, not something the extension can fully work around. Future versions may implement alternative detection methods.

### WebHID in Service Workers

Chrome's service workers may be suspended after inactivity. The extension uses polling to maintain device connection state. If you experience connection issues:
1. Unplug and replug the MuteMe device
2. Click the extension icon
3. Click "Connect MuteMe" if prompted

## Project Structure

```
├── background.js          # Service worker - main logic
├── popup.html/js          # Extension popup UI
├── manifest.json          # Extension manifest
├── modules/
│   ├── muteme.js          # MuteMe WebHID driver
│   ├── constants.js       # Shared constants
│   └── icon.js            # Extension icon management
├── content-scripts/
│   ├── meet.js            # Google Meet integration
│   └── teams.js           # Microsoft Teams integration
└── images/                # Extension icons
```

## Development

See [docs/implementation-plan.md](docs/implementation-plan.md) for detailed technical documentation.

See [docs/muteme-hid-protocol.md](docs/muteme-hid-protocol.md) for the MuteMe USB HID protocol specification.

## License

MIT
