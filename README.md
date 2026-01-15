# MuteMe Chrome Extension

Control your meeting mute status with the [MuteMe](https://muteme.com/) hardware button in Google Meet and Microsoft Teams.

## Features

- **Hardware mute control**: Tap or hold the MuteMe button to toggle your microphone
- **LED feedback**: MuteMe LED shows your mute state:
  - 🔴 Red (pulsing) = Muted (hold to talk available)
  - 🟢 Green = Unmuted / Live
  - 🔵 Cyan = Connected, no active call
  - ⚪ White flash = Button press acknowledged (when no call active)
- **Multiple touch modes**:
  - **Toggle**: Tap to mute/unmute
  - **Smart**: Tap to toggle, hold for push-to-talk when muted
  - **Push-to-Talk**: Hold to speak, release to mute
- **Extension icon badges**:
  - 🟢 Green dot = In call, unmuted
  - 🔴 Red "M" = In call, muted
  - Gray icon = Device disconnected
- **Click-to-focus**: Click the meeting name in popup to switch to that tab
- **Optional auto-focus**: Automatically switch to meeting tab when pressing the button (only if tab is hidden)

## Supported Platforms

- Google Meet
- Microsoft Teams (web version, new Teams 2024+)

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
   - Click the meeting name to switch to that tab
   - Change touch mode
   - Toggle mute from the popup

## How It Works

The extension uses the [WebHID API](https://developer.chrome.com/en/articles/hid/) to communicate directly with the MuteMe USB device. When you press the button, it sends keyboard shortcuts to the active meeting tab:
- Google Meet: `Ctrl+D`
- Microsoft Teams: `Ctrl+Shift+M`

## Known Limitations

### Extension Reload During Active Call

If you reload/update the extension while in an active call, the connection to the meeting tab is lost. **You must refresh the meeting tab** to restore functionality. This is a Chrome extension limitation - content scripts injected before a reload cannot communicate with the new extension context.

### Mute Detection in Background Tabs

Chrome throttles JavaScript execution in background tabs and restricts DOM observation. This means:

- **When the meeting tab is focused**: Mute state detection works reliably
- **When the meeting tab is in the background**: Mute state may become stale

**Workarounds**:
1. Enable "Switch to meeting tab on press" in the extension popup
2. For Google Meet: The Picture-in-Picture (PIP) window keeps the tab "visible" for detection purposes

### WebHID in Service Workers

Chrome's service workers may be suspended after inactivity. The extension uses polling every 2 seconds to maintain device connection state. If you experience connection issues:
1. Unplug and replug the MuteMe device
2. Click the extension icon
3. Click "Connect MuteMe" if prompted

## Project Structure

```
├── background.js              # Service worker - main logic
├── popup.html/js              # Extension popup UI
├── manifest.json              # Extension manifest
├── modules/
│   ├── muteme.js              # MuteMe WebHID driver
│   ├── constants.js           # Shared constants
│   └── icon.js                # Extension icon management
├── content-scripts/
│   ├── meet-controller.js     # Google Meet integration
│   └── teams-controller.js    # Microsoft Teams integration
└── images/                    # Extension icons
```

## Development

```bash
# Install dependencies
npm install

# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Build extension zip for Chrome Web Store
npm run build

# Release new version (bumps version, updates CHANGELOG, creates git tag)
npm run release          # patch version (1.0.0 → 1.0.1)
npm run release minor    # minor version (1.0.0 → 1.1.0)
npm run release major    # major version (1.0.0 → 2.0.0)
```

### Chrome Web Store Publishing

1. Copy `.env.example` to `.env` and fill in your credentials
2. Run `npm run upload` to upload a draft, or `npm run publish` to publish immediately

See [CHANGELOG.md](CHANGELOG.md) for version history.

See [docs/implementation-plan.md](docs/implementation-plan.md) for detailed technical documentation.

See [docs/muteme-hid-protocol.md](docs/muteme-hid-protocol.md) for the MuteMe USB HID protocol specification.

## License

MIT
