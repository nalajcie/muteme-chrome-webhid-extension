# MuteMe Chrome Extension - Implementation Plan

## Overview

This document outlines the phased development plan for a Chrome extension that integrates MuteMe hardware buttons with Google Meet and Microsoft Teams video calls using the WebHID API.

## Status Legend

- ✅ Complete
- 🔄 In Progress
- ⏳ Pending
- ❌ Removed

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Chrome Extension                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐ │
│  │  Background │◄──►│  Content Scripts │◄──►│   Popup/UI       │ │
│  │  Service    │    │  (per call tab)  │    │                  │ │
│  │  Worker     │    └─────────────────┘    └──────────────────┘ │
│  │             │                                                 │
│  │  ┌────────────────────────────────┐                          │
│  │  │  WebHID MuteMe Module          │                          │
│  │  │  - Device connection           │                          │
│  │  │  - LED control                 │                          │
│  │  │  - Touch event handling        │                          │
│  │  └────────────────────────────────┘                          │
│  └─────────────┘                                                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
         │                    │
         │                    │
         ▼                    ▼
┌──────────────┐    ┌─────────────────────────────────────────────┐
│   MuteMe     │    │              Web Call Platforms             │
│   Device     │    │  ┌─────────────┐    ┌───────────────────┐  │
│   (USB HID)  │    │  │ Google Meet │    │ Microsoft Teams   │  │
│              │    │  └─────────────┘    └───────────────────┘  │
└──────────────┘    └─────────────────────────────────────────────┘
```

---

## Phase 1: WebHID MuteMe Support ✅ COMPLETE

**Goal:** Establish reliable WebHID communication with MuteMe devices.

### Deliverables

1. ✅ **\`modules/muteme.js\`** - Core MuteMe device module
   - Device detection and connection (all VID/PID combinations)
   - LED color and effect control
   - Touch event handling (start, touching, end, clear)
   - Connection state management
   - Reconnection handling

2. ✅ **\`modules/constants.js\`** - MuteMe-specific constants
   - LED colors and effects
   - Touch event types
   - Device filters
   - Message types

3. ✅ **\`muteme-test.html\` + \`muteme-test.js\`** - Device testing page
   - Grant HID permission button
   - LED color/effect selector
   - Touch event display
   - Connection status

### Tasks

- [x] Create \`modules/muteme.js\` with MuteMe class
- [x] Implement \`requestPermission()\` for device pairing
- [x] Implement \`connect()\` / \`disconnect()\` methods
- [x] Implement \`setLed(color, effect)\` method
- [x] Implement touch event listener with callbacks
- [x] Create test HTML page with interactive controls
- [x] Handle device reconnection

---

## Phase 2: Background Service & Call Session Tracking ✅ COMPLETE

**Goal:** Detect and track active call sessions in Google Meet and Microsoft Teams.

### Deliverables

1. ✅ **Updated \`background.js\`** - Background service worker
   - MuteMe device state management
   - Tab monitoring for call sessions
   - Message routing between components
   - Storage of user preferences

2. ✅ **Content scripts for detecting calls**
   - \`content-scripts/meet-controller.js\`
   - \`content-scripts/teams-controller.js\`
   - Detects call start/end
   - Reports mute state changes
   - Receives mute commands from background

3. ✅ **Updated \`manifest.json\`**
   - Content script declarations
   - Required permissions (tabs, storage)
   - Host permissions for Meet/Teams

### Tasks

- [x] Update manifest with content script permissions
- [x] Create call detection content scripts
- [x] Implement tab monitoring in background
- [x] Create messaging protocol between components
- [x] Implement call session storage
- [ ] Handle multiple simultaneous calls (future enhancement)

---

## Phase 3: Per-Platform Mute/Unmute Implementation ✅ COMPLETE

**Goal:** Control mute state on each platform via MuteMe button.

### Deliverables

1. ✅ **\`content-scripts/meet-controller.js\`** - Google Meet integration
   - Read current mute state via \`[data-is-muted]\` attribute
   - Control mute via Ctrl+D keyboard shortcut (works even when tab not focused)

2. ✅ **\`content-scripts/teams-controller.js\`** - Microsoft Teams integration
   - Read current mute state via aria-label inspection
   - Control mute via Ctrl+Shift+M keyboard shortcut

### Touch Modes

| Mode | Description |
|------|-------------|
| **Toggle** | Tap to toggle mute on/off |
| **Smart** | Tap to toggle; hold while muted = push-to-talk |
| **Push-to-Talk** | Hold to unmute, release to mute |

### LED Feedback Mapping

| State | LED Color | Effect |
|-------|-----------|--------|
| Disconnected | Off | - |
| Connected, no call | Off | - |
| In call, unmuted | Green | Solid |
| In call, muted (toggle mode) | Red | Solid |
| In call, muted (smart/PTT mode) | Red | Slow Pulse |
| Push-to-talk active (holding) | Green | Solid |
| Connection animation | Cyan | Blink |

### Tasks

- [x] Implement Google Meet mute detection
- [x] Implement Google Meet mute control (Ctrl+D shortcut)
- [x] Implement Microsoft Teams mute detection  
- [x] Implement Microsoft Teams mute control (Ctrl+Shift+M shortcut)
- [x] Connect touch events to mute actions
- [x] Implement touch modes (Toggle, Smart, Push-to-Talk)
- [x] Sync LED state with mute state
- [x] Handle edge cases (call end, tab close)
- [x] Fix mute control to work when tab not focused

---

## Phase 4: Dynamic Extension Icon 🔄 PARTIAL

**Goal:** Provide visual feedback via the extension icon.

### Deliverables

1. ✅ **\`modules/icon.js\`** - Icon management
   - Multiple icon states
   - Badge text support

2. ✅ **Icon assets** - Generated microphone icon
   - icon16.png, icon32.png, icon48.png, icon128.png

### Tasks

- [x] Design basic icon set
- [x] Implement icon switching in background.js
- [x] Add badge support for mute state
- [ ] Create state-specific colored icons (muted=red, unmuted=green)
- [ ] Test visibility on light/dark toolbars

---

## Phase 5: Polish & User Experience ⏳ FUTURE

### Potential Enhancements

1. **Settings Page**
   - [ ] Dedicated settings page UI
   - [x] Touch mode selection (in popup)
   - [ ] LED color customization
   - [ ] Platform-specific settings

2. **Notifications**
   - [ ] Call started/ended
   - [ ] MuteMe connected/disconnected

3. **Multiple Device Support**
   - [ ] Handle multiple MuteMe devices
   - [ ] Device selection UI

4. **Additional Platforms**
   - [ ] Zoom (browser version)
   - [ ] Slack Huddles
   - [ ] Discord (web)
   - [ ] WebEx

---

## File Structure (Current)

\`\`\`
muteme-chrome-extension/
├── manifest.json              ✅
├── background.js              ✅
├── popup.html                 ✅
├── popup.js                   ✅
├── muteme-test.html           ✅
├── muteme-test.js             ✅
├── modules/
│   ├── constants.js           ✅
│   ├── muteme.js              ✅
│   └── icon.js                ✅
├── content-scripts/
│   ├── meet-controller.js     ✅
│   └── teams-controller.js    ✅
├── images/
│   ├── icon.svg               ✅
│   ├── icon16.png             ✅
│   ├── icon32.png             ✅
│   ├── icon48.png             ✅
│   └── icon128.png            ✅
├── docs/
│   ├── muteme-hid-protocol.md ✅
│   └── implementation-plan.md ✅
└── README.md                  ✅
\`\`\`

---

## Known Issues & Limitations

1. **Teams Compatibility**: Microsoft Teams has multiple versions (classic, new) with different DOM structures. Selectors may need updates.

2. **Service Worker Lifecycle**: If the service worker is idle too long, it may be terminated. Device reconnection is handled automatically.

3. **Keyboard Shortcuts**: Some platforms may change their keyboard shortcuts in future updates.

---

## Testing Checklist

- [x] MuteMe device connection
- [x] LED all colors and effects
- [x] Touch event detection (tap, hold)
- [x] Google Meet call detection
- [x] Google Meet mute toggle
- [x] Google Meet mute from unfocused tab
- [ ] Microsoft Teams call detection (needs testing)
- [ ] Microsoft Teams mute toggle (needs testing)
- [x] Icon state changes
- [x] Extension reload handling
- [x] Device reconnection after unplug

---

*Document version: 2.0*
*Last updated: January 2026*
