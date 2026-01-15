# Changelog

All notable changes to the MuteMe Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Note for contributors**: Please update this file when adding new features, fixing bugs, or making breaking changes.

## [1.0.0] - 2026-01-15

### Added

#### Core Features
- **WebHID Integration**: Direct USB communication with MuteMe devices using the WebHID API
- **Google Meet Support**: Mute/unmute control via Ctrl+D keyboard shortcut
- **Microsoft Teams Support**: Mute/unmute control via Ctrl+Shift+M keyboard shortcut (new Teams 2024+)

#### Touch Modes
- **Toggle Mode**: Tap to toggle mute on/off
- **Smart Mode**: Tap to toggle, hold for push-to-talk when muted
- **Push-to-Talk Mode**: Hold to unmute, release to mute

#### LED Feedback
- Red (pulsing) when muted in Smart/PTT mode
- Red (solid) when muted in Toggle mode
- Green when unmuted/live
- Cyan when connected with no active call
- White flash on button press when no call active (connection confirmation)

#### Extension Icon
- Dynamic grayscale icon when device disconnected
- Green badge dot when in call and unmuted
- Red "M" badge when in call and muted
- Color icon when connected

#### Popup UI
- Device connection status display
- Active call/platform indicator
- Click meeting name to switch to that tab
- Touch mode selector dropdown
- "Switch to meeting tab on press" option
- Manual mute toggle button

#### Smart Tab Switching
- Only switches to meeting tab if hidden (not just unfocused)
- Respects Google Meet Picture-in-Picture window

#### Device Management
- Automatic device detection via polling (every 2 seconds)
- Handles device disconnect/reconnect gracefully
- Permission grant flow via test page

#### Developer Tools
- ESLint configuration for Chrome extension development
- Device test page (muteme-test.html) for debugging

### Known Limitations
- Extension reload during active call requires meeting tab refresh
- Background tab mute detection may be delayed due to Chrome throttling
- Teams selectors may need updates as Microsoft changes the UI


---

*To add a new entry, copy the template below:*

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing features

### Fixed
- Bug fixes

### Removed
- Removed features

### Security
- Security fixes
```
