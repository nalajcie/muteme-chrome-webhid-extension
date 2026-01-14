# MuteMe Chrome Extension - Implementation Plan

## Overview

This document outlines the phased development plan for a Chrome extension that integrates MuteMe hardware buttons with Google Meet and Microsoft Teams video calls using the WebHID API.

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

## Phase 1: WebHID MuteMe Support

**Goal:** Establish reliable WebHID communication with MuteMe devices.

### Deliverables

1. **`modules/muteme.js`** - Core MuteMe device module
   - Device detection and connection (all VID/PID combinations)
   - LED color and effect control
   - Touch event handling (start, touching, end, clear)
   - Connection state management
   - Reconnection handling

2. **`modules/constants.js`** - MuteMe-specific constants
   - LED colors and effects
   - Touch event types
   - Device filters
   - Message types

3. **`muteme-test.html` + `muteme-test.js`** - Device testing page
   - Grant HID permission button
   - LED color/effect selector
   - Touch event display
   - Connection status
   - Useful for debugging and development

### Technical Details

```javascript
// Device filters for WebHID
const MUTEME_DEVICE_FILTERS = [
  { vendorId: 0x16c0, productId: 0x27db },
  { vendorId: 0x20a0, productId: 0x42da },
  { vendorId: 0x20a0, productId: 0x42db },
  { vendorId: 0x3603, productId: 0x0001 },
  { vendorId: 0x3603, productId: 0x0002 },
  { vendorId: 0x3603, productId: 0x0003 },
  { vendorId: 0x3603, productId: 0x0004 },
];

// Touch handling modes
enum TouchMode {
  TOGGLE,       // Single tap to toggle mute
  PUSH_TO_TALK, // Hold to unmute
  PUSH_TO_MUTE  // Hold to mute
}
```

### Tasks

- [ ] Create `modules/muteme.js` with MuteMe class
- [ ] Implement `requestPermission()` for device pairing
- [ ] Implement `connect()` / `disconnect()` methods
- [ ] Implement `setLed(color, effect)` method
- [ ] Implement touch event listener with callbacks
- [ ] Create test HTML page with interactive controls
- [ ] Handle device reconnection
- [ ] Unit test on multiple device types (if available)

---

## Phase 2: Background Service & Call Session Tracking

**Goal:** Detect and track active call sessions in Google Meet and Microsoft Teams.

### Deliverables

1. **Updated `background.js`** - Background service worker
   - MuteMe device state management
   - Tab monitoring for call sessions
   - Message routing between components
   - Storage of user preferences

2. **`content-scripts/call-detector.js`** - Content script for detecting calls
   - Injected into Meet/Teams pages
   - Detects call start/end
   - Reports mute state changes
   - Receives mute commands from background

3. **Updated `manifest.json`**
   - Content script declarations
   - Required permissions (tabs, storage)
   - Host permissions for Meet/Teams

### Call Detection Strategy

#### Google Meet
- URL pattern: `https://meet.google.com/*-*-*`
- Call indicators:
  - Mute button presence: `[data-is-muted]` attribute
  - Call container: `[data-meeting-code]`
  
#### Microsoft Teams
- URL pattern: `https://teams.microsoft.com/*` or `https://*.teams.microsoft.com/*`
- Call indicators:
  - Mute button: `#microphone-button` or `[data-tid="call-control-microphone"]`
  - Call state observable via button aria-label changes

### Data Structures

```javascript
// Call session tracking
interface CallSession {
  tabId: number;
  platform: 'meet' | 'teams';
  url: string;
  isMuted: boolean;
  isActive: boolean;
  startedAt: Date;
}

// Extension state
interface ExtensionState {
  mutemeConnected: boolean;
  activeCall: CallSession | null;
  allCalls: Map<number, CallSession>;
  touchMode: TouchMode;
  ledPreferences: LedPreferences;
}
```

### Tasks

- [ ] Update manifest with content script permissions
- [ ] Create call detection content script
- [ ] Implement tab monitoring in background
- [ ] Create messaging protocol between components
- [ ] Implement call session storage
- [ ] Handle multiple simultaneous calls
- [ ] Detect mute state changes from platform UI

---

## Phase 3: Per-Platform Mute/Unmute Implementation

**Goal:** Control mute state on each platform via MuteMe button.

### Deliverables

1. **`content-scripts/meet-controller.js`** - Google Meet integration
   - Find and click mute button
   - Read current mute state
   - Handle Ctrl+D keyboard shortcut

2. **`content-scripts/teams-controller.js`** - Microsoft Teams integration
   - Find and click mute button
   - Read current mute state
   - Handle Ctrl+Shift+M keyboard shortcut

3. **`modules/mute-controller.js`** - Unified mute control interface
   - Abstract interface for platform-specific controllers
   - Touch mode handling (toggle/push-to-talk/push-to-mute)

### Platform-Specific Implementation

#### Google Meet

```javascript
// Mute button selector
const MEET_MUTE_BUTTON = '[data-is-muted]';
// Or use keyboard shortcut
const MEET_MUTE_SHORTCUT = 'Ctrl+D';

function getMeetMuteState() {
  const btn = document.querySelector(MEET_MUTE_BUTTON);
  return btn?.getAttribute('data-is-muted') === 'true';
}

function toggleMeetMute() {
  document.querySelector(MEET_MUTE_BUTTON)?.click();
  // Or: Simulate Ctrl+D
}
```

#### Microsoft Teams

```javascript
// Mute button selectors (may vary by Teams version)
const TEAMS_MUTE_SELECTORS = [
  '#microphone-button',
  '[data-tid="call-control-microphone"]',
  '[aria-label*="microphone"]'
];
const TEAMS_MUTE_SHORTCUT = 'Ctrl+Shift+M';

function getTeamsMuteState() {
  const btn = document.querySelector(TEAMS_MUTE_SELECTORS.join(','));
  return btn?.getAttribute('aria-pressed') === 'true' ||
         btn?.getAttribute('aria-label')?.includes('unmute');
}
```

### LED Feedback Mapping

| State | LED Color | Effect |
|-------|-----------|--------|
| Disconnected | Off | - |
| Connected, no call | Dim White | Solid |
| In call, unmuted | Green | Solid |
| In call, muted | Red | Solid |
| Push-to-talk active | Green | Fast Pulse |
| Error | Yellow | Fast Pulse |

### Tasks

- [ ] Implement Google Meet mute detection
- [ ] Implement Google Meet mute control
- [ ] Implement Microsoft Teams mute detection  
- [ ] Implement Microsoft Teams mute control
- [ ] Connect touch events to mute actions
- [ ] Implement touch modes (toggle/PTT/PTM)
- [ ] Sync LED state with mute state
- [ ] Handle edge cases (call end, tab close)

---

## Phase 4: Dynamic Extension Icon

**Goal:** Provide visual feedback via the extension icon.

### Deliverables

1. **Updated `modules/icon.js`** - Dynamic icon management
   - SVG-based icon generation
   - Multiple icon states
   - Badge text support

2. **Icon assets** - State icons
   - Disconnected state
   - Connected/idle state
   - Muted state
   - Unmuted state
   - Error state

### Icon States

| State | Icon | Badge |
|-------|------|-------|
| MuteMe disconnected | Gray microphone | ❌ |
| MuteMe connected, no call | White microphone | - |
| In call, unmuted | Green microphone | 🎤 |
| In call, muted | Red microphone with slash | 🔇 |
| Multiple calls | Blue microphone | Number |

### Implementation Options

**Option A: Pre-made PNG icons**
- Create multiple icon files for each state
- Switch using `chrome.action.setIcon({ path: ... })`

**Option B: Canvas-based dynamic icons**
- Generate icons programmatically
- Use `chrome.action.setIcon({ imageData: ... })`
- More flexible for color variations

### Tasks

- [ ] Design icon set for all states
- [ ] Implement icon switching in background.js
- [ ] Add badge support for call count
- [ ] Create icon generation utility (if using canvas)
- [ ] Test visibility on light/dark toolbars

---

## Phase 5: Polish & User Experience (Future)

### Potential Enhancements

1. **Settings Page**
   - Touch mode selection
   - LED color customization
   - Keyboard shortcut configuration
   - Platform-specific settings

2. **Notifications**
   - Call started/ended
   - MuteMe connected/disconnected
   - Mute state changes

3. **Keyboard Shortcuts**
   - Global mute toggle shortcut
   - Quick settings access

4. **Multiple Device Support**
   - Handle multiple MuteMe devices
   - Device selection UI

5. **Additional Platforms**
   - Zoom (browser version)
   - Slack Huddles
   - Discord (web)
   - WebEx

---

## File Structure (Final)

```
muteme-chrome-extension/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── settings.html
├── settings.js
├── muteme-test.html
├── muteme-test.js
├── modules/
│   ├── constants.js
│   ├── muteme.js
│   ├── icon.js
│   └── mute-controller.js
├── content-scripts/
│   ├── call-detector.js
│   ├── meet-controller.js
│   └── teams-controller.js
├── images/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── states/
│       ├── disconnected.png
│       ├── connected.png
│       ├── muted.png
│       └── unmuted.png
├── docs/
│   ├── muteme-hid-protocol.md
│   └── implementation-plan.md
└── README.md
```

---

## Development Order

1. **Phase 1** - Validate WebHID works with MuteMe
2. **Phase 2** - Establish background + content script communication
3. **Phase 3** - Implement mute control (core functionality)
4. **Phase 4** - Add visual polish with dynamic icons

Phases 2-4 can have some parallel work, but Phase 1 must be complete first to validate the approach.

---

## Testing Strategy

### Manual Testing Checklist

- [ ] MuteMe Original device connection
- [ ] MuteMe Mini device connection
- [ ] LED all colors and effects
- [ ] Touch event detection (tap, hold)
- [ ] Google Meet call detection
- [ ] Google Meet mute toggle
- [ ] Microsoft Teams call detection
- [ ] Microsoft Teams mute toggle
- [ ] Icon state changes
- [ ] Extension reload handling
- [ ] Device reconnection after unplug

### Browser Compatibility

- Chrome 89+ (WebHID support)
- Edge 89+ (Chromium-based with WebHID)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Platform UI changes break selectors | Mute control fails | Use multiple selector fallbacks, keyboard shortcuts |
| WebHID permission model changes | Device access issues | Follow Chrome platform updates |
| Teams versions have different DOM | Partial compatibility | Support multiple selector strategies |
| MuteMe firmware variations | Unexpected behavior | Test on multiple devices, handle gracefully |

---

*Document version: 1.0*
*Created: January 2026*
